import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { key } = await params;
    const admin = await requireAdmin(request);
    if (!admin) {
      console.error('Settings PUT: Admin auth failed for key:', key);
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const body = await request.json();
    const { value } = body;

    console.log(`Settings PUT: key=${key}, value length=${(value || '').length}`);

    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
      [key, value]
    );

    // Verify it was saved
    const verify = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    console.log(`Settings PUT: verified key=${key}, exists=${verify.rows.length > 0}, stored length=${(verify.rows[0]?.value || '').length}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
