import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id: customerId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const customerResult = await pool.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const productsResult = await pool.query(`
      SELECT
        p.id, p.name,
        p.price as default_price,
        COALESCE(co.override_price, p.price) as price,
        COALESCE(co.is_hidden, p.is_hidden) as is_hidden,
        COALESCE(co.is_oos, p.is_oos) as is_oos,
        co.override_price,
        co.is_hidden as override_is_hidden,
        co.is_oos as override_is_oos,
        p.category_id, p.super_category_id,
        p.weight, p.bags_per_case, p.image_url, p.sku
      FROM products p
      LEFT JOIN customer_overrides co ON p.id = co.product_id AND co.customer_id = $1
      ORDER BY p.id
    `, [customerId]);

    return NextResponse.json({
      success: true,
      customerId,
      products: productsResult.rows
    });
  } catch (err) {
    console.error('Get customer products error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
