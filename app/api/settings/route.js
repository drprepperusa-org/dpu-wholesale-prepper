import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query('SELECT key, value FROM settings');

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Get settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
