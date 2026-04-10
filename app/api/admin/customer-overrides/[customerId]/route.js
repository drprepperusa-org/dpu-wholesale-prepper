import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request, { params }) {
  try {
    const { customerId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const catResult = await pool.query(`
      SELECT s.id, s.name FROM customer_cat_hidden cch
      JOIN super_categories s ON cch.super_category_id = s.id
      WHERE cch.customer_id = $1
    `, [customerId]);

    const prodResult = await pool.query(`
      SELECT product_id, is_hidden, is_oos FROM customer_overrides
      WHERE customer_id = $1
    `, [customerId]);

    return NextResponse.json({
      success: true,
      catHidden: catResult.rows.map(r => r.id),
      hiddenProducts: prodResult.rows.filter(p => p.is_hidden).map(p => p.product_id)
    });
  } catch (err) {
    console.error('Get customer overrides error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
