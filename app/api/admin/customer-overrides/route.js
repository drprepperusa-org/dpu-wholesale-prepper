import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { customerId, catHidden, hiddenProducts } = await request.json();
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM customer_cat_hidden WHERE customer_id = $1', [customerId]);
      if (Array.isArray(catHidden)) {
        for (const catId of catHidden) {
          await client.query(
            'INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [customerId, catId]
          );
        }
      }

      await client.query('DELETE FROM customer_overrides WHERE customer_id = $1 AND is_hidden = TRUE', [customerId]);
      if (Array.isArray(hiddenProducts)) {
        for (const prodId of hiddenProducts) {
          await client.query(
            'INSERT INTO customer_overrides (customer_id, product_id, is_hidden, is_oos) VALUES ($1, $2, TRUE, FALSE) ON CONFLICT (customer_id, product_id) DO UPDATE SET is_hidden = TRUE',
            [customerId, prodId]
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
    console.error('Update customer overrides error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
