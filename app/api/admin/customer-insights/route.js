import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const result = await pool.query(`
      SELECT
        c.id, c.company_name, c.contact_name, c.email, c.view_preset, c.last_login,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(o.total_cases), 0) AS total_cases,
        MAX(o.created_at) AS last_order_date
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE c.id != 'admin'
      GROUP BY c.id, c.company_name, c.contact_name, c.email, c.view_preset, c.last_login
      ORDER BY total_orders DESC, c.company_name
    `);

    const insights = await Promise.all(result.rows.map(async (cust) => {
      const topProds = await pool.query(`
        SELECT p.name, SUM(oi.qty) AS qty
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.customer_id = $1
        GROUP BY p.name
        ORDER BY qty DESC
        LIMIT 3
      `, [cust.id]);

      return {
        ...cust,
        total_orders: parseInt(cust.total_orders) || 0,
        total_cases: parseInt(cust.total_cases) || 0,
        top_products: topProds.rows
      };
    }));

    return NextResponse.json({ success: true, insights });
  } catch (err) {
    console.error('Customer insights error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
