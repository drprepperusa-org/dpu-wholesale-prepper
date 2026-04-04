import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== 'fix-2025') return NextResponse.json({ error: 'Invalid key' }, { status: 403 });

    // Fix products where super_category_id doesn't match their category's parent
    const result = await pool.query(`
      UPDATE products p
      SET super_category_id = c.super_category_id
      FROM categories c
      WHERE p.category_id = c.id
        AND p.super_category_id != c.super_category_id
      RETURNING p.id, p.name, p.super_category_id as new_super, c.super_category_id as cat_parent
    `);

    return NextResponse.json({
      success: true,
      fixed: result.rows.length,
      message: `Fixed ${result.rows.length} products with mismatched super_category_id`,
      details: result.rows.map(r => ({ id: r.id, name: r.name }))
    });
  } catch (err) {
    console.error('Fix categories error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== 'fix-2025') return NextResponse.json({ error: 'Invalid key' }, { status: 403 });

    // Check for mismatches without fixing
    const result = await pool.query(`
      SELECT p.id, p.name,
             p.super_category_id as product_super_id, s1.name as product_super_name,
             c.super_category_id as category_parent_id, s2.name as category_parent_name,
             p.category_id, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN super_categories s1 ON p.super_category_id = s1.id
      JOIN super_categories s2 ON c.super_category_id = s2.id
      WHERE p.super_category_id != c.super_category_id
      ORDER BY s1.name, c.name
    `);

    return NextResponse.json({
      success: true,
      mismatched: result.rows.length,
      products: result.rows
    });
  } catch (err) {
    console.error('Check categories error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
