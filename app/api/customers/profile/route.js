import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const customer = await requireAuth(request);
    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const result = await pool.query(`
      SELECT id, company_name, contact_name, email, phone,
             address_line1, address_line2, city, state, zip, country,
             created_at, last_login
      FROM customers WHERE id = $1
    `, [customer.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer: result.rows[0]
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const customer = await requireAuth(request);
    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const body = await request.json();
    const { contact_name, company_name, email, phone, address_line1, address_line2, city, state, zip, country } = body;

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (contact_name !== undefined) { updateFields.push(`contact_name = $${paramIndex++}`); values.push(contact_name); }
    if (company_name !== undefined) { updateFields.push(`company_name = $${paramIndex++}`); values.push(company_name); }
    if (email !== undefined) { updateFields.push(`email = $${paramIndex++}`); values.push(email); }
    if (phone !== undefined) { updateFields.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (address_line1 !== undefined) { updateFields.push(`address_line1 = $${paramIndex++}`); values.push(address_line1); }
    if (address_line2 !== undefined) { updateFields.push(`address_line2 = $${paramIndex++}`); values.push(address_line2); }
    if (city !== undefined) { updateFields.push(`city = $${paramIndex++}`); values.push(city); }
    if (state !== undefined) { updateFields.push(`state = $${paramIndex++}`); values.push(state); }
    if (zip !== undefined) { updateFields.push(`zip = $${paramIndex++}`); values.push(zip); }
    if (country !== undefined) { updateFields.push(`country = $${paramIndex++}`); values.push(country); }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(customer.id);

    const query = `UPDATE customers SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      customer: result.rows[0]
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
