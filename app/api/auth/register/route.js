import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const { email, password, companyName, contactName, phone } = await request.json();

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Check pending registrations
    const pendingExisting = await pool.query('SELECT id FROM pending_registrations WHERE email = $1', [email]);
    if (pendingExisting.rows.length > 0) {
      return NextResponse.json({ error: 'Registration already pending approval' }, { status: 409 });
    }

    const registrationId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO pending_registrations (id, company_name, contact_name, email, phone, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [registrationId, companyName, contactName || '', email, phone || '', passwordHash, 'pending']
    );

    return NextResponse.json({
      success: true,
      message: 'Registration submitted for admin approval'
    }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
