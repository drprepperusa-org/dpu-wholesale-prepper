import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, verifyAdminToken, logActivity } from '@/lib/auth';
import { deleteImage } from '@/lib/supabase';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const admin = await verifyAdminToken(token);

    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    // Get old image URL before updating
    let oldImageUrl = null;
    const oldProduct = await pool.query('SELECT image_url FROM products WHERE id = $1', [id]);
    if (oldProduct.rows[0]) oldImageUrl = oldProduct.rows[0].image_url;

    const body = await request.json();
    const { name, weight, bags_per_case, cases_per_pallet, category_id, super_category_id, image_url, sku, is_hidden, is_oos, show_price, price } = body;

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { updateFields.push(`name = $${paramIndex++}`); values.push(name); }
    if (weight !== undefined) { updateFields.push(`weight = $${paramIndex++}`); values.push(weight); }
    if (bags_per_case !== undefined) { updateFields.push(`bags_per_case = $${paramIndex++}`); values.push(bags_per_case); }
    if (cases_per_pallet !== undefined) { updateFields.push(`cases_per_pallet = $${paramIndex++}`); values.push(cases_per_pallet); }
    if (category_id !== undefined) { updateFields.push(`category_id = $${paramIndex++}`); values.push(category_id); }
    if (super_category_id !== undefined) { updateFields.push(`super_category_id = $${paramIndex++}`); values.push(super_category_id); }
    if (image_url !== undefined) { updateFields.push(`image_url = $${paramIndex++}`); values.push(image_url); }
    if (sku !== undefined) { updateFields.push(`sku = $${paramIndex++}`); values.push(sku); }
    if (is_hidden !== undefined) { updateFields.push(`is_hidden = $${paramIndex++}`); values.push(is_hidden); }
    if (is_oos !== undefined) { updateFields.push(`is_oos = $${paramIndex++}`); values.push(is_oos); }
    if (show_price !== undefined) { updateFields.push(`show_price = $${paramIndex++}`); values.push(show_price); }
    if (price !== undefined) { updateFields.push(`price = $${paramIndex++}`); values.push(price); }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updatedProduct = result.rows[0];
    let actionDetail;
    if (updateFields.length === 1 && updateFields[0].startsWith('is_hidden')) {
      actionDetail = `${updatedProduct.is_hidden ? 'Hid' : 'Unhid'} product: ${updatedProduct.name}`;
    } else if (updateFields.length === 1 && updateFields[0].startsWith('is_oos')) {
      actionDetail = `Marked product ${updatedProduct.is_oos ? 'OOS' : 'In Stock'}: ${updatedProduct.name}`;
    } else {
      actionDetail = `Edited product: ${updatedProduct.name}`;
    }
    await logActivity(null, 'admin_product_edit', actionDetail, {
      adminId: admin.id,
      entityType: 'product',
      entityId: id,
    });

    // Delete old image from Supabase if image was changed
    if (image_url !== undefined && oldImageUrl && oldImageUrl !== image_url) {
      try { await deleteImage(oldImageUrl); } catch (e) { console.error('Failed to delete old image:', e); }
    }

    return NextResponse.json({
      success: true,
      product: result.rows[0]
    });
  } catch (err) {
    console.error('Update product error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const admin = await verifyAdminToken(token);

    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const nameResult = await pool.query('SELECT name, image_url FROM products WHERE id = $1', [id]);
    if (nameResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const productName = nameResult.rows[0].name;
    const productImageUrl = nameResult.rows[0].image_url;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    // Delete image from Supabase storage
    if (productImageUrl) {
      try { await deleteImage(productImageUrl); } catch (e) { console.error('Failed to delete product image:', e); }
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await logActivity(null, 'admin_product_delete', `Deleted product: ${productName}`, {
      adminId: admin.id,
      entityType: 'product',
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
