import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { key } = await params;
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const { value } = await request.json();

    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
