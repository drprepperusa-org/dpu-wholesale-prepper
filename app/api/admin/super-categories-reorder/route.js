import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const { updates } = await request.json();
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates must be an array' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const update of updates) {
        await client.query(
          'UPDATE super_categories SET sort_order = $1 WHERE id = $2',
          [update.sort_order, update.id]
        );
      }
      await client.query('COMMIT');
      return NextResponse.json({ success: true, count: updates.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Super categories reorder error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
