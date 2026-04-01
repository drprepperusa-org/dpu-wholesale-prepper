import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { extractToken, verifyToken, verifyAdminToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const customer = await verifyToken(token);
    const admin = token ? await verifyAdminToken(token) : false;

    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    let query = `
      SELECT o.id, o.customer_id, o.status, o.total_cases, o.created_at,
             c.company_name, c.email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (!admin) {
      query += ' AND o.customer_id = $1';
      params.push(customer.id);
    }

    const statusFilter = searchParams.get('status');
    if (statusFilter) {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(statusFilter);
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      orders: result.rows
    });
  } catch (err) {
    console.error('Get orders error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const customer = await verifyToken(token);

    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const { items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    const orderId = uuidv4();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO orders (id, customer_id, status) VALUES ($1, $2, $3)',
        [orderId, customer.id, 'Pending']
      );

      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, qty, unit) VALUES ($1, $2, $3, $4)',
          [orderId, item.product_id, item.qty, item.unit]
        );
      }

      // Calculate total cases
      const totalResult = await pool.query(`
        SELECT SUM(CASE WHEN unit = 'cases' THEN qty ELSE qty * p.cases_per_pallet END) as total
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [orderId]);
      const totalCases = totalResult.rows[0]?.total || 0;

      await client.query(
        'UPDATE orders SET total_cases = $1 WHERE id = $2',
        [totalCases, orderId]
      );

      await client.query(
        'INSERT INTO activity_log (customer_id, type, detail) VALUES ($1, $2, $3)',
        [customer.id, 'order', `Ordered ${items.length} products \u2014 ${totalCases} total cases`]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        orderId,
        totalCases
      }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
