import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { JWT_SECRET, logActivity } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Check users table first (admin/sales/view-only portal users)
    const userResult = await pool.query(
      'SELECT id, email, password_hash, role, active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      if (!user.active) {
        return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        await logActivity(null, 'failed_login', `Failed login attempt for user: ${email}`, {
          entityType: 'user',
          entityId: user.id,
          failureReason: 'invalid_password',
        });
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, table: 'users' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return NextResponse.json({
        success: true,
        vendor: {
          id: user.id,
          email: user.email,
          name: user.email,
          companyName: 'DR Prepper',
          role: user.role
        },
        token,
        role: user.role
      });
    }

    // Fallback: check customers table
    const custResult = await pool.query(
      'SELECT id, email, company_name, contact_name, password_hash, active, created_at, show_prices FROM customers WHERE email = $1',
      [email]
    );

    if (custResult.rows.length === 0) {
      await logActivity(null, 'failed_login', `Failed login attempt for non-existent account: ${email}`, {
        failureReason: 'account_not_found',
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const customer = custResult.rows[0];

    if (!customer.active) {
      await logActivity(customer.id, 'failed_login', `Login attempt on inactive account`, {
        failureReason: 'account_inactive',
      });
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, customer.password_hash);
    if (!passwordMatch) {
      await logActivity(customer.id, 'failed_login', `Failed login attempt - wrong password`, {
        failureReason: 'invalid_password',
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isAdminEmail = customer.email === process.env.ADMIN_EMAIL || customer.email === 'admin@drprepper.com';
    const role = isAdminEmail ? 'admin' : 'customer';
    const expiresIn = isAdminEmail ? '24h' : '7d';

    await pool.query('UPDATE customers SET last_login = NOW() WHERE id = $1', [customer.id]);
    await logActivity(customer.id, 'login', 'Signed in');

    const token = jwt.sign(
      { sub: customer.id, email: customer.email, role, table: 'customers' },
      JWT_SECRET,
      { expiresIn }
    );

    return NextResponse.json({
      success: true,
      vendor: {
        id: customer.id,
        email: customer.email,
        name: customer.contact_name,
        companyName: customer.company_name,
        role,
        created_at: customer.created_at,
        show_prices: customer.show_prices !== false
      },
      token,
      role
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
