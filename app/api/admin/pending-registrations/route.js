import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    const result = await pool.query(
      'SELECT id, company_name, contact_name, email, phone, status, created_at FROM pending_registrations ORDER BY created_at DESC'
    );
    return NextResponse.json({ success: true, registrations: result.rows });
  } catch (err) {
    console.error('Get pending registrations error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { id, action } = await request.json();
    if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });

    const reg = await pool.query('SELECT * FROM pending_registrations WHERE id = $1', [id]);
    if (reg.rows.length === 0) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    const registration = reg.rows[0];

    if (action === 'reject') {
      await pool.query("UPDATE pending_registrations SET status = 'rejected' WHERE id = $1", [id]);
      return NextResponse.json({ success: true, message: 'Registration rejected' });
    }

    // Approve: move from pending_registrations to customers
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if email already exists in customers
      const existing = await client.query('SELECT id FROM customers WHERE email = $1', [registration.email]);
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'A customer with this email already exists. Registration left as pending.' }, { status: 409 });
      }

      // Generate customer ID
      const custId = 'CUST-' + Date.now().toString(36).toUpperCase();
      const passwordHash = registration.password_hash || '$2a$10$placeholder';

      // Insert into customers
      await client.query(
        `INSERT INTO customers (id, company_name, contact_name, email, phone, password_hash, active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [custId, registration.company_name, registration.contact_name || '', registration.email, registration.phone || '', passwordHash]
      );

      // Update pending status
      await client.query("UPDATE pending_registrations SET status = 'approved' WHERE id = $1", [id]);

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: `${registration.company_name} approved and added as customer` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Process registration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
