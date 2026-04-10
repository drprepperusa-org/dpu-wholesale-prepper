import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request, { params }) {
  try {
    const { id: customerId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const catResult = await pool.query(`
      SELECT s.id, s.name FROM customer_cat_hidden cch
      JOIN super_categories s ON cch.super_category_id = s.id
      WHERE cch.customer_id = $1
    `, [customerId]);

    const prodResult = await pool.query(`
      SELECT product_id, is_hidden, is_oos FROM customer_overrides
      WHERE customer_id = $1
    `, [customerId]);

    const custResult = await pool.query('SELECT show_prices FROM customers WHERE id = $1', [customerId]);
    const showPrices = custResult.rows[0]?.show_prices !== false;

    return NextResponse.json({
      success: true,
      catHidden: catResult.rows.map(r => r.name),
      customHidden: prodResult.rows.filter(p => p.is_hidden).map(p => p.product_id),
      customOos: prodResult.rows.filter(p => p.is_oos).map(p => p.product_id),
      showPrices
    });
  } catch (err) {
    console.error('Get view overrides error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id: customerId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { catHidden, customHidden, customOos, showPrices } = await request.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update show_prices if provided
      if (showPrices !== undefined) {
        await client.query('UPDATE customers SET show_prices = $1 WHERE id = $2', [showPrices, customerId]);
      }

      await client.query('DELETE FROM customer_cat_hidden WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM customer_overrides WHERE customer_id = $1', [customerId]);

      if (Array.isArray(catHidden)) {
        for (const catId of catHidden) {
          await client.query(
            'INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES ($1, $2)',
            [customerId, catId]
          );
        }
      }

      if (Array.isArray(customHidden) || Array.isArray(customOos)) {
        const allProducts = new Set([...(customHidden || []), ...(customOos || [])]);

        for (const prodId of allProducts) {
          const isHidden = customHidden?.includes(prodId) || false;
          const isOos = customOos?.includes(prodId) || false;

          await client.query(
            'INSERT INTO customer_overrides (customer_id, product_id, is_hidden, is_oos) VALUES ($1, $2, $3, $4)',
            [customerId, prodId, isHidden, isOos]
          );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update view overrides error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
