import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, verifyToken, verifyAdminToken, logActivity } from '@/lib/auth';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required', statusCode: 401 }, { status: 401 });
    }
    const admin = await verifyAdminToken(token);
    if (!admin) return NextResponse.json({ success: false, error: 'Admin required', statusCode: 403 }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get('customer_id');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') || 100;
    const offset = searchParams.get('offset') || 0;

    let query = `
      SELECT al.id, al.customer_id, al.admin_id, al.entity_type, al.entity_id,
             c.company_name, c.contact_name,
             al.type, al.detail, al.created_at
      FROM activity_log al
      LEFT JOIN customers c ON al.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (customer_id) { query += ` AND al.customer_id = $${paramIndex++}`; params.push(customer_id); }
    if (type && type !== 'all') { query += ` AND al.type = $${paramIndex++}`; params.push(type); }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, activities: result.rows });
  } catch (err) {
    console.error('Get activity log error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error', statusCode: 500 }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required', statusCode: 401 }, { status: 401 });
    }

    const customer = await verifyToken(token);
    const admin = await verifyAdminToken(token);

    if (!customer && !admin) {
      return NextResponse.json({ success: false, error: 'Invalid token', statusCode: 401 }, { status: 401 });
    }

    const { type, detail, entityType, entityId } = await request.json();

    if (!type || !detail) {
      return NextResponse.json({ success: false, error: 'type and detail are required', statusCode: 400 }, { status: 400 });
    }

    await logActivity(
      customer ? customer.id : null,
      type,
      detail,
      {
        adminId: admin ? admin.id : null,
        entityType: entityType || null,
        entityId: entityId || null,
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Post activity log error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error', statusCode: 500 }, { status: 500 });
  }
}
