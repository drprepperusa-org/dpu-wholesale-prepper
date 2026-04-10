import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, logActivity } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const customer = await requireAuth(request);
    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const result = await pool.query(`
      SELECT p.id, p.name, p.price, p.weight, p.bags_per_case, p.cases_per_pallet,
             p.category_id, c.name as category,
             p.super_category_id, s.name as super_category, p.image_url, p.sku,
             p.is_hidden, p.is_oos, p.show_price, p.created_at
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN super_categories s ON p.super_category_id = s.id
      WHERE f.customer_id = $1
      ORDER BY s.sort_order, c.sort_order, p.sort_order
    `, [customer.id]);

    return NextResponse.json({
      success: true,
      favorites: result.rows
    });
  } catch (err) {
    console.error('Get favorites error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const customer = await requireAuth(request);
    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const { product_id } = await request.json();

    const result = await pool.query(
      'INSERT INTO favorites (customer_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [customer.id, product_id]
    );

    const prodResult = await pool.query('SELECT name FROM products WHERE id = $1', [product_id]);
    if (prodResult.rows.length > 0) {
      await logActivity(customer.id, 'favorite', `Added "${prodResult.rows[0].name}" to favorites`);
    }

    return NextResponse.json({
      success: true,
      favorite: result.rows[0] || {}
    }, { status: 201 });
  } catch (err) {
    console.error('Add favorite error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
