import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const result = await pool.query('SELECT id, name, email, phone, active FROM sales_reps ORDER BY name');
    return NextResponse.json({ success: true, reps: result.rows });
  } catch (err) {
    console.error('Get sales reps error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const { name, email, phone } = await request.json();
    if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const result = await pool.query(
      'INSERT INTO sales_reps (name, email, phone) VALUES ($1, $2, $3) RETURNING id, name, email, phone, active',
      [name.trim(), email || null, phone || null]
    );
    return NextResponse.json({ success: true, rep: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'A rep with that name already exists' }, { status: 409 });
    console.error('Create sales rep error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await pool.query('DELETE FROM sales_reps WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete sales rep error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
