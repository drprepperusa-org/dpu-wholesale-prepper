import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin, logActivity } from '@/lib/auth';

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { productIds } = await request.json();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds must be a non-empty array' }, { status: 400 });
    }

    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `DELETE FROM products WHERE id IN (${placeholders}) RETURNING id`,
      productIds
    );

    await logActivity(null, 'admin_bulk_delete', `Bulk delete: ${result.rows.length} products deleted`, {
      adminId: admin.id,
      entityType: 'products',
    });

    return NextResponse.json({
      success: true,
      deleted: result.rows.length,
      message: `${result.rows.length} products deleted`
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
