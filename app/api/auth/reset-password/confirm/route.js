import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const { token, new_password } = await request.json();

    if (!token || typeof token !== 'string' || token.length < 32) {
      return NextResponse.json({
        success: false,
        statusCode: 422,
        errors: { token: 'Invalid reset token' }
      }, { status: 422 });
    }

    if (!new_password || new_password.length < 8) {
      return NextResponse.json({
        success: false,
        statusCode: 422,
        errors: { new_password: 'Password must be at least 8 characters' }
      }, { status: 422 });
    }

    // Find user with valid reset token
    let result = await pool.query(
      'SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    let user = result.rows[0];
    let table = 'users';

    if (!user) {
      result = await pool.query(
        'SELECT id, email FROM customers WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );
      user = result.rows[0];
      table = 'customers';
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired reset token'
      }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(new_password, 12);

    await pool.query(
      `UPDATE ${table} SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, password_changed_at = NOW() WHERE id = $2`,
      [passwordHash, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (err) {
    console.error('Password reset confirm error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
