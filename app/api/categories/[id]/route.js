import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const { is_hidden } = await request.json();

    if (typeof is_hidden !== 'boolean') {
      return NextResponse.json({ error: 'is_hidden must be a boolean' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE categories SET is_hidden = $1 WHERE id = $2 RETURNING *',
      [is_hidden, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, category: result.rows[0] });
  } catch (err) {
    console.error('Update category visibility error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
