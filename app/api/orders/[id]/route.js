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
