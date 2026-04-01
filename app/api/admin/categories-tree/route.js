import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const superResult = await pool.query(`
      SELECT id, name, sort_order
      FROM super_categories
      ORDER BY sort_order ASC, name ASC
    `);

    const catsResult = await pool.query(`
      SELECT id, name, super_category_id, sort_order
      FROM categories
      ORDER BY super_category_id ASC, sort_order ASC, name ASC
    `);

    return NextResponse.json({
      success: true,
      superCategories: superResult.rows,
      categories: catsResult.rows
    });
  } catch (err) {
    console.error('Get categories tree error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
