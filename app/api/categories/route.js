import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT id, name FROM super_categories ORDER BY name');
    return NextResponse.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Get categories error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
