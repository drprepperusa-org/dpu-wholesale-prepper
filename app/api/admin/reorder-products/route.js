import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { productIds } = await request.json();
    if (!Array.isArray(productIds)) return NextResponse.json({ error: 'productIds must be an array' }, { status: 400 });

    // Get the category of the first product to compute a category-scoped offset
    // This ensures sort_order values don't collide across categories
    const firstProd = productIds.length > 0 ? await pool.query('SELECT category_id FROM products WHERE id = $1', [productIds[0]]) : null;
    const categoryId = firstProd?.rows[0]?.category_id || 0;
    // Use category_id * 10000 as base offset so each category has its own range
    const baseOffset = categoryId * 10000;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < productIds.length; i++) {
        await client.query('UPDATE products SET sort_order = $1 WHERE id = $2', [baseOffset + i, productIds[i]]);
      }
      await client.query('COMMIT');
      return NextResponse.json({ success: true });
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
