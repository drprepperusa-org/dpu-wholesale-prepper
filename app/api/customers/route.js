import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const result = await pool.query(`
      SELECT id, company_name, contact_name, email, view_preset, active
      FROM customers
      WHERE id != 'admin'
      ORDER BY company_name
    `);

    return NextResponse.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('Get customers error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
