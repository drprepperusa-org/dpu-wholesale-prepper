import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, decodeToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const payload = token ? decodeToken(token) : null;
    const hasAdminAccess = payload && ['admin', 'sales', 'view-only'].includes(payload.role);

    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get('q') || '').trim();

    if (!searchQuery || searchQuery.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'Search query must be at least 2 characters'
      });
    }

    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20);
    const offset = Math.max(0, parseInt(searchParams.get('offset')) || 0);

    const selectFields = hasAdminAccess
      ? `p.id, p.name, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category,
         s.id as super_category_id, s.name as super_category,
         p.image_url, p.sku, p.is_hidden, p.is_oos, p.show_price`
      : `p.id, p.name, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category,
         s.id as super_category_id, s.name as super_category,
         p.image_url, p.sku, p.show_price`;

    let query = `
      SELECT ${selectFields},
             ts_rank(to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.sku, '')),
                     plainto_tsquery('english', $1)) AS relevance
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN super_categories s ON p.super_category_id = s.id
      WHERE to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.sku, ''))
            @@ plainto_tsquery('english', $1)
    `;

    if (!hasAdminAccess) {
      query += ' AND p.is_hidden = FALSE AND c.is_hidden = FALSE';
    }

    query += ` ORDER BY relevance DESC, p.name ASC LIMIT $2 OFFSET $3`;

    const result = await pool.query(query, [searchQuery, limit, offset]);

    const countQuery = `
      SELECT COUNT(*) as total FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.sku, ''))
            @@ plainto_tsquery('english', $1)
    ` + (!hasAdminAccess ? ' AND p.is_hidden = FALSE AND c.is_hidden = FALSE' : '');

    const countResult = await pool.query(countQuery, [searchQuery]);

    return NextResponse.json({
      success: true,
      query: searchQuery,
      results: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      hasMore: offset + limit < parseInt(countResult.rows[0].total)
    });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
