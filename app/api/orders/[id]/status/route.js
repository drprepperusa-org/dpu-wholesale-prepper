import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id: orderId } = await params;
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const { status } = await request.json();

    if (!['Pending', 'Processing', 'Received'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Update order status error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
