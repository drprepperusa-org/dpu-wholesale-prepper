import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '@/lib/db';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email || '').toLowerCase().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        success: false,
        statusCode: 422,
        errors: { email: 'Valid email is required' }
      }, { status: 422 });
    }

    // Check if user exists
    let user = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    let isAdmin = user.rows.length > 0;

    if (!isAdmin) {
      user = await pool.query('SELECT id, email FROM customers WHERE email = $1', [email]);
    }

    // Always respond with success to avoid leaking user existence
    if (user.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If this email exists, you will receive a password reset link.'
      });
    }

    const resetToken = crypto.randomBytes(16).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000);

    const userId = user.rows[0].id;
    const table = isAdmin ? 'users' : 'customers';

    await pool.query(
      `UPDATE ${table} SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
      [resetToken, resetTokenExpires, userId]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'https://wholesale.drprepperusa.com'}/reset?token=${resetToken}`;
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@drprepperusa.com',
        to: email,
        subject: 'Password Reset Request - DR Prepper Wholesale',
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>Or paste this link: ${resetLink}</p>
          <hr>
          <p>If you didn't request this, ignore this email.</p>
        `
      });
    } catch (emailErr) {
      console.error('Error sending reset email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'If this email exists, you will receive a password reset link.'
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
