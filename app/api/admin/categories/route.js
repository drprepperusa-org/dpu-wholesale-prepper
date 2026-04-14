import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const result = await pool.query('SELECT id, name FROM super_categories ORDER BY name');
    return NextResponse.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Get categories error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const { name, super_category_id } = await request.json();
    if (!name || !name.trim() || !super_category_id) return NextResponse.json({ error: 'Name and super_category_id are required' }, { status: 400 });
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM categories WHERE super_category_id = $1', [super_category_id]);
    const result = await pool.query(
      'INSERT INTO categories (name, super_category_id, sort_order) VALUES ($1, $2, $3) RETURNING id, name, super_category_id, sort_order',
      [name.trim(), super_category_id, maxOrder.rows[0].next]
    );
    return NextResponse.json({ success: true, category: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
    console.error('Create category error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const { id, name, super_category_id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const updates = [];
    const params = [];
    let paramIdx = 1;
    if (name && name.trim()) { updates.push(`name = $${paramIdx++}`); params.push(name.trim()); }
    if (super_category_id !== undefined) {
      updates.push(`super_category_id = $${paramIdx++}`);
      params.push(super_category_id);
      // Also update products in this category to the new super_category_id
    }
    if (updates.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    params.push(id);
    const result = await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, name, super_category_id, sort_order`,
      params
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // If super_category_id changed, update all products in this category too
    if (super_category_id !== undefined) {
      await pool.query('UPDATE products SET super_category_id = $1 WHERE category_id = $2', [super_category_id, id]);
    }

    return NextResponse.json({ success: true, category: result.rows[0] });
  } catch (err) {
    console.error('Update category error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const prodCount = await pool.query('SELECT COUNT(*) as cnt FROM products WHERE category_id = $1', [id]);
    if (parseInt(prodCount.rows[0].cnt) > 0) {
      return NextResponse.json({ error: `Cannot delete: ${prodCount.rows[0].cnt} products are in this category. Move or delete them first.` }, { status: 400 });
    }
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete category error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
