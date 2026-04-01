import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const { productId, customerId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const result = await pool.query(`
      DELETE FROM customer_overrides
      WHERE product_id = $1 AND customer_id = $2
      RETURNING *
    `, [productId, customerId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deleted: result.rows[0]
    });
  } catch (err) {
    console.error('Delete override error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
