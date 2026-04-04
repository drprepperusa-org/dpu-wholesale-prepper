import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const result = await pool.query(`
      SELECT id, company_name, contact_name, email, phone, view_preset, active, show_prices, created_at, last_login
      FROM customers
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      customers: result.rows
    });
  } catch (err) {
    console.error('Get customers error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { company_name, email, preset, contact_name, phone, password } = await request.json();

    if (!company_name || !email) {
      return NextResponse.json({ error: 'company_name and email are required' }, { status: 400 });
    }

    const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const customerId = uuidv4();

    await pool.query(
      `INSERT INTO customers (id, company_name, contact_name, email, phone, password_hash, view_preset, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())`,
      [customerId, company_name, contact_name || '', email, phone || '', passwordHash, preset || 'full']
    );

    const result = await pool.query(
      'SELECT id, company_name, contact_name, email, view_preset, active FROM customers WHERE id = $1',
      [customerId]
    );

    return NextResponse.json({
      success: true,
      customer: result.rows[0],
      tempPassword: !password ? tempPassword : undefined
    }, { status: 201 });
  } catch (err) {
    console.error('Create customer error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
