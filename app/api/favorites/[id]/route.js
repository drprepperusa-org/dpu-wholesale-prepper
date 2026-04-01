import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const { id: product_id } = await params;
    const customer = await requireAuth(request);
    if (!customer) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const result = await pool.query(
      'DELETE FROM favorites WHERE customer_id = $1 AND product_id = $2 RETURNING *',
      [customer.id, product_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Remove favorite error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
