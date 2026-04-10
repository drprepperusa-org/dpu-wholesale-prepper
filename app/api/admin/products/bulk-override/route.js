import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { product_ids, customer_id, override_price, is_hidden, is_oos } = await request.json();

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'product_ids array required' }, { status: 400 });
    }
    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id required' }, { status: 400 });
    }

    const customerResult = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const productId of product_ids) {
        const result = await client.query(`
          INSERT INTO customer_overrides (customer_id, product_id, override_price, is_hidden, is_oos)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (customer_id, product_id)
          DO UPDATE SET
            override_price = COALESCE($3, customer_overrides.override_price),
            is_hidden = COALESCE($4, customer_overrides.is_hidden),
            is_oos = COALESCE($5, customer_overrides.is_oos)
          RETURNING *
        `, [customer_id, productId, override_price || null, is_hidden !== undefined ? is_hidden : null, is_oos !== undefined ? is_oos : null]);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        count: results.length,
        overrides: results
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Bulk override error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
