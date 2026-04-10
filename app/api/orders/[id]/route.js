import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, verifyToken, verifyAdminToken } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id: orderId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const customer = await verifyToken(token);
    const admin = token ? await verifyAdminToken(token) : false;

    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult.rows[0];

    if (!admin && order.customer_id !== customer.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const itemsResult = await pool.query(`
      SELECT oi.id, oi.product_id, oi.qty, oi.unit, p.name, p.weight, p.bags_per_case
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: itemsResult.rows
      }
    });
  } catch (err) {
    console.error('Get order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id: orderId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const admin = token ? await verifyAdminToken(token) : false;

    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const { items } = await request.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Delete existing items and re-insert
      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      let totalCases = 0;
      for (const item of items) {
        const cpp = parseInt(item.cases_per_pallet) || 60;
        const cases = item.unit === 'pallets' ? item.qty * cpp : item.qty;
        totalCases += cases;
        await client.query(
          'INSERT INTO order_items (order_id, product_id, qty, unit) VALUES ($1, $2, $3, $4)',
          [orderId, item.product_id, item.qty, item.unit || 'cases']
        );
      }
      await client.query('UPDATE orders SET total_cases = $1 WHERE id = $2', [totalCases, orderId]);
      await client.query('COMMIT');
      return NextResponse.json({ success: true, totalCases });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: orderId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const admin = token ? await verifyAdminToken(token) : false;

    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
      await client.query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Delete order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
