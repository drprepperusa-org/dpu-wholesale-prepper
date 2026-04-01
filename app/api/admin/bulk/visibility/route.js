import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin, logActivity } from '@/lib/auth';

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { productIds, is_hidden } = await request.json();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds must be a non-empty array' }, { status: 400 });
    }
    if (typeof is_hidden !== 'boolean') {
      return NextResponse.json({ error: 'is_hidden must be a boolean' }, { status: 400 });
    }

    const placeholders = productIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE products SET is_hidden = $1 WHERE id IN (${placeholders}) RETURNING id`,
      [is_hidden, ...productIds]
    );

    await logActivity(null, 'admin_bulk_update', `Bulk visibility update: ${result.rows.length} products ${is_hidden ? 'hidden' : 'shown'}`, {
      adminId: admin.id,
      entityType: 'products',
    });

    return NextResponse.json({
      success: true,
      updated: result.rows.length,
      message: `${result.rows.length} products ${is_hidden ? 'hidden' : 'shown'}`
    });
  } catch (err) {
    console.error('Bulk visibility update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
