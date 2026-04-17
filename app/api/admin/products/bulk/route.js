import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


// PATCH /api/admin/products/bulk - Bulk update default product properties
export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { ids, name, sku, price, brand, weight, bags_per_case, units_per_case, cases_per_pallet, super_category_id, category_id, is_hidden, is_oos, show_price, barcode_pack, barcode_bundle, barcode_box, box_image_url, bundle_image_url } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) { updates.push(`name = $${paramCount++}`); params.push(name); }
    if (sku !== undefined) { updates.push(`sku = $${paramCount++}`); params.push(sku); }
    if (price !== undefined) { updates.push(`price = $${paramCount++}`); params.push(price); }
    if (brand !== undefined) { updates.push(`brand = $${paramCount++}`); params.push(brand); }
    if (weight !== undefined) { updates.push(`weight = $${paramCount++}`); params.push(weight); }
    if (bags_per_case !== undefined) { updates.push(`bags_per_case = $${paramCount++}`); params.push(bags_per_case); }
    if (units_per_case !== undefined) { updates.push(`units_per_case = $${paramCount++}`); params.push(units_per_case); }
    if (cases_per_pallet !== undefined) { updates.push(`cases_per_pallet = $${paramCount++}`); params.push(cases_per_pallet); }
    if (super_category_id !== undefined) { updates.push(`super_category_id = $${paramCount++}`); params.push(super_category_id); }
    if (category_id !== undefined) { updates.push(`category_id = $${paramCount++}`); params.push(category_id); }
    if (is_hidden !== undefined) { updates.push(`is_hidden = $${paramCount++}`); params.push(is_hidden); }
    if (is_oos !== undefined) { updates.push(`is_oos = $${paramCount++}`); params.push(is_oos); }
    if (show_price !== undefined) { updates.push(`show_price = $${paramCount++}`); params.push(show_price); }
    if (barcode_pack !== undefined) { updates.push(`barcode_pack = $${paramCount++}`); params.push(barcode_pack); }
    if (barcode_bundle !== undefined) { updates.push(`barcode_bundle = $${paramCount++}`); params.push(barcode_bundle); }
    if (barcode_box !== undefined) { updates.push(`barcode_box = $${paramCount++}`); params.push(barcode_box); }
    if (box_image_url !== undefined) { updates.push(`box_image_url = $${paramCount++}`); params.push(box_image_url); }
    if (bundle_image_url !== undefined) { updates.push(`bundle_image_url = $${paramCount++}`); params.push(bundle_image_url); }

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
