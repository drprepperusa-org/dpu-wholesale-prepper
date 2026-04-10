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
    const { id, name } = await request.json();
    if (!id || !name || !name.trim()) return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    const result = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name, super_category_id, sort_order',
      [name.trim(), id]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
