import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// PATCH /api/admin/products/bulk - Bulk update default product properties
export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { ids, price, super_category_id, category_id, is_hidden } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (price !== undefined) { updates.push(`price = $${paramCount++}`); params.push(price); }
    if (super_category_id !== undefined) { updates.push(`super_category_id = $${paramCount++}`); params.push(super_category_id); }
    if (category_id !== undefined) { updates.push(`category_id = $${paramCount++}`); params.push(category_id); }
    if (is_hidden !== undefined) { updates.push(`is_hidden = $${paramCount++}`); params.push(is_hidden); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'At least one field to update required' }, { status: 400 });
    }

    params.push(ids);
    const query = `
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = ANY($${paramCount})
      RETURNING id, name, price, is_hidden
    `;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      updated: result.rows.length,
      products: result.rows
    });
  } catch (err) {
    console.error('Bulk update products error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
