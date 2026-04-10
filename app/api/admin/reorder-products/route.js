import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { productIds } = await request.json();
    if (!Array.isArray(productIds) || productIds.length === 0) return NextResponse.json({ error: 'productIds must be a non-empty array' }, { status: 400 });

    // Get the category of the first product to compute a category-scoped offset
    const firstProd = await pool.query('SELECT category_id FROM products WHERE id = $1', [productIds[0]]);
    const categoryId = firstProd?.rows[0]?.category_id || 0;
    // Use category_id * 10000 as base offset so each category has its own range
    const baseOffset = categoryId * 10000;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Build a single UPDATE with CASE for efficiency
      const cases = productIds.map((id, i) => `WHEN id = '${id}' THEN ${baseOffset + i}`).join(' ');
      const idList = productIds.map(id => `'${id}'`).join(',');
      await client.query(`UPDATE products SET sort_order = CASE ${cases} END WHERE id IN (${idList})`);
      await client.query('COMMIT');
      return NextResponse.json({ success: true, updated: productIds.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reorder products error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Initialize sort_order for all products that have NULL or 0
export async function PUT(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    // Assign sort_order to all products grouped by category
    const result = await pool.query(`
      SELECT id, category_id FROM products
      ORDER BY category_id, sort_order NULLS LAST, name
    `);

    const byCategory = {};
    for (const row of result.rows) {
      const catId = row.category_id || 0;
      if (!byCategory[catId]) byCategory[catId] = [];
      byCategory[catId].push(row.id);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [catId, ids] of Object.entries(byCategory)) {
        const baseOffset = parseInt(catId) * 10000;
        for (let i = 0; i < ids.length; i++) {
          await client.query('UPDATE products SET sort_order = $1 WHERE id = $2', [baseOffset + i, ids[i]]);
        }
      }
      await client.query('COMMIT');
      return NextResponse.json({ success: true, categories: Object.keys(byCategory).length, products: result.rows.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Init sort_order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
