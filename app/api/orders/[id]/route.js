import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, verifyToken, verifyAdminToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


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
      SELECT oi.id, oi.product_id, oi.qty, oi.unit,
             COALESCE(oi.price, co.override_price, p.price) AS price,
             p.name, p.sku, p.weight, p.bags_per_case, p.cases_per_pallet, p.show_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN customer_overrides co ON co.product_id = oi.product_id AND co.customer_id = $2
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `, [orderId, order.customer_id]);

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
      // Need the order's customer to look up per-customer override prices
      const orderRow = await client.query('SELECT customer_id FROM orders WHERE id = $1', [orderId]);
      if (orderRow.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const customerId = orderRow.rows[0].customer_id;

      // Delete existing items and re-insert
      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      let totalCases = 0;
      for (const item of items) {
        const cpp = parseInt(item.cases_per_pallet) || 60;
        const cases = item.unit === 'pallets' ? item.qty * cpp : item.qty;
        totalCases += cases;

        // Capture effective price (override -> product) so the order shows the
        // correct amount even if the catalog price changes later.
        const priceLookup = await client.query(
          `SELECT COALESCE(co.override_price, p.price) AS price
           FROM products p
           LEFT JOIN customer_overrides co ON co.product_id = p.id AND co.customer_id = $2
           WHERE p.id = $1`,
          [item.product_id, customerId]
        );
        const effectivePrice = priceLookup.rows[0]?.price ?? null;

        await client.query(
          'INSERT INTO order_items (order_id, product_id, qty, unit, price) VALUES ($1, $2, $3, $4, $5)',
          [orderId, item.product_id, item.qty, item.unit || 'cases', effectivePrice]
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
