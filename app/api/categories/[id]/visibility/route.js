import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


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
      'UPDATE products SET is_hidden = $1 WHERE category_id = $2 RETURNING id',
      [is_hidden, id]
    );

    return NextResponse.json({
      success: true,
      updated: result.rows.length,
      message: `${result.rows.length} products ${is_hidden ? 'hidden' : 'shown'}`
    });
  } catch (err) {
    console.error('Category visibility bulk update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
