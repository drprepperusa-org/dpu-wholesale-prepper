import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(request, { params }) {
  try {
    const { productId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { customer_id, override_price, is_hidden, is_oos } = await request.json();

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id required' }, { status: 400 });
    }

    const productResult = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const customerResult = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const result = await pool.query(`
      INSERT INTO customer_overrides (customer_id, product_id, override_price, is_hidden, is_oos)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET
        override_price = COALESCE($3, customer_overrides.override_price),
        is_hidden = COALESCE($4, customer_overrides.is_hidden),
        is_oos = COALESCE($5, customer_overrides.is_oos)
      RETURNING *
    `, [customer_id, productId, override_price || null, is_hidden !== undefined ? is_hidden : null, is_oos !== undefined ? is_oos : null]);

    return NextResponse.json({
      success: true,
      override: result.rows[0]
    });
  } catch (err) {
    console.error('Set override error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
