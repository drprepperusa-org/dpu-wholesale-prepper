import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Reset all customer show_prices overrides to NULL so they fall back to the global setting
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    // Set all customers to show prices (the default visible state)
    const result = await pool.query('UPDATE customers SET show_prices = TRUE RETURNING id');
    return NextResponse.json({ success: true, reset: result.rows.length });
  } catch (err) {
    console.error('Reset customer price overrides error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
