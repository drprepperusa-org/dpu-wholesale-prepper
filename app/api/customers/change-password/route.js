import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(request) {
  try {
    const customer = await requireAuth(request);
    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const result = await pool.query('SELECT password_hash FROM customers WHERE id = $1', [customer.id]);
    const customerData = result.rows[0];

    const passwordMatch = await bcrypt.compare(current_password, customerData.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE customers SET password_hash = $1 WHERE id = $2', [newPasswordHash, customer.id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
