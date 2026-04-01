import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const result = await pool.query('SELECT id, name, sort_order FROM super_categories ORDER BY sort_order, name');
    return NextResponse.json({ success: true, superCategories: result.rows });
  } catch (err) {
    console.error('Get super categories error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const { name } = await request.json();
    if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM super_categories');
    const result = await pool.query(
      'INSERT INTO super_categories (name, sort_order) VALUES ($1, $2) RETURNING id, name, sort_order',
      [name.trim(), maxOrder.rows[0].next]
    );
    return NextResponse.json({ success: true, superCategory: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'A super category with that name already exists' }, { status: 409 });
    console.error('Create super category error:', err);
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
      'UPDATE super_categories SET name = $1 WHERE id = $2 RETURNING id, name, sort_order',
      [name.trim(), id]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, superCategory: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'A super category with that name already exists' }, { status: 409 });
    console.error('Update super category error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const prodCount = await pool.query('SELECT COUNT(*) as cnt FROM products WHERE super_category_id = $1', [id]);
    if (parseInt(prodCount.rows[0].cnt) > 0) {
      return NextResponse.json({ error: `Cannot delete: ${prodCount.rows[0].cnt} products are in this category. Move or delete them first.` }, { status: 400 });
    }
    await pool.query('DELETE FROM super_categories WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete super category error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
