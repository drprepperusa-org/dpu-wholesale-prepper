import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request, { params }) {
  try {
    const { productId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const productResult = await pool.query(`
      SELECT p.id, p.name, p.price, p.is_hidden, p.is_oos, p.category_id, p.super_category_id,
             p.weight, p.bags_per_case, p.cases_per_pallet, p.image_url, p.sku, p.show_price
      FROM products p
      WHERE p.id = $1
    `, [productId]);

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const overridesResult = await pool.query(`
      SELECT co.customer_id, co.override_price, co.is_hidden, co.is_oos
      FROM customer_overrides co
      WHERE co.product_id = $1
    `, [productId]);

    return NextResponse.json({
      success: true,
      product: productResult.rows[0],
      overrides: overridesResult.rows
    });
  } catch (err) {
    console.error('Get product with overrides error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
