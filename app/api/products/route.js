import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { extractToken, decodeToken, verifyToken, verifyAdminToken, logActivity } from '@/lib/auth';
import { validateProduct } from '@/lib/validation';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const payload = token ? decodeToken(token) : null;
    const isAdmin = payload && ['admin', 'sales', 'view-only'].includes(payload.role);
    const isAdminByEmail = payload && (payload.email === process.env.ADMIN_EMAIL || payload.email === 'admin@drprepper.com');
    const hasAdminAccess = isAdmin || isAdminByEmail;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const rawLimit = searchParams.get('limit') !== null ? parseInt(searchParams.get('limit')) : 0;
    const limit = rawLimit > 0 ? Math.min(200, rawLimit) : 0;
    const offset = limit > 0 ? (page - 1) * limit : 0;

    const search = (searchParams.get('search') || '').trim();
    const superCategoryFilter = (searchParams.get('super_category') || '').trim();
    const visibilityFilter = searchParams.get('visibility') || 'all';
    const stockFilter = searchParams.get('stock') || 'all';

    // Check which optional columns exist to avoid query errors if migrations haven't run
    const _colCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name IN ('barcode_pack','barcode_bundle','barcode_box','box_image_url','bundle_image_url','brand')`);
    const _cols = new Set(_colCheck.rows.map(r => r.column_name));
    const _opt = (col) => _cols.has(col) ? `p.${col}` : `NULL as ${col}`;

    const selectFields = hasAdminAccess
      ? `p.id, p.name, ${_opt('brand')}, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category, c.is_hidden as category_is_hidden,
         s.id as super_category_id, s.name as super_category,
         p.image_url, ${_opt('box_image_url')}, ${_opt('bundle_image_url')}, p.sku, ${_opt('barcode_pack')}, ${_opt('barcode_bundle')}, ${_opt('barcode_box')}, p.sort_order, p.is_hidden, p.is_oos, p.show_price, p.created_at`
      : `p.id, p.name, ${_opt('brand')}, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category,
         s.id as super_category_id, s.name as super_category,
         p.image_url, ${_opt('box_image_url')}, ${_opt('bundle_image_url')}, p.sku, ${_opt('barcode_pack')}, ${_opt('barcode_bundle')}, ${_opt('barcode_box')}, p.sort_order, p.show_price, p.created_at`;

    let query = `SELECT ${selectFields}
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN super_categories s ON p.super_category_id = s.id
      WHERE 1=1`;

    const params = [];

    if (!hasAdminAccess) {
      query += ' AND p.is_hidden = FALSE AND c.is_hidden = FALSE';

      if (token) {
        const customer = await verifyToken(token);
        if (customer) {
          query += ` AND s.id NOT IN (
            SELECT super_category_id FROM customer_cat_hidden WHERE customer_id = $${params.length + 1}
          )`;
          params.push(customer.id);
          query += ` AND p.id NOT IN (
            SELECT product_id FROM customer_overrides WHERE customer_id = $${params.length + 1} AND is_hidden = TRUE
          )`;
          params.push(customer.id);
        }
      }
    } else {
      if (visibilityFilter === 'hidden') {
        query += ' AND p.is_hidden = TRUE';
      } else if (visibilityFilter === 'visible') {
        query += ' AND p.is_hidden = FALSE';
      }
      if (stockFilter === 'in-stock') {
        query += ' AND p.is_oos = FALSE';
      } else if (stockFilter === 'oos') {
        query += ' AND p.is_oos = TRUE';
      }
    }

    if (search) {
      query += ` AND (
        LOWER(p.name) LIKE LOWER($${params.length + 1})
        OR LOWER(COALESCE(p.sku, '')) LIKE LOWER($${params.length + 1})
        ${_cols.has('brand') ? `OR LOWER(COALESCE(p.brand, '')) LIKE LOWER($${params.length + 1})` : ''}
      )`;
      params.push(`%${search}%`);
    }

    if (superCategoryFilter) {
      query += ` AND LOWER(s.name) = LOWER($${params.length + 1})`;
      params.push(superCategoryFilter);
    }

    // Count query
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM products p
       JOIN categories c ON p.category_id = c.id
       JOIN super_categories s ON p.super_category_id = s.id
       WHERE 1=1` + query.substring(query.indexOf('WHERE 1=1') + 'WHERE 1=1'.length),
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);

    const _brandSort = _cols.has('brand') ? 'p.brand NULLS LAST, ' : '';
    query += ` ORDER BY s.sort_order NULLS LAST, c.sort_order NULLS LAST, ${_brandSort}p.name`;

    if (limit > 0) {
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      products: result.rows,
      pagination: limit > 0 ? {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      } : { total, page: 1, limit: total, pages: 1, hasNext: false, hasPrev: false }
    });
  } catch (err) {
    console.error('Get products error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const admin = await verifyAdminToken(token);

    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = validateProduct(body);
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        statusCode: 422,
        errors: validationResult.errors
      }, { status: 422 });
    }

    const { id, name, brand, weight, bags_per_case, cases_per_pallet, category_id, super_category_id, image_url, box_image_url, bundle_image_url, sku, barcode_pack, barcode_bundle, barcode_box, price, show_price } = body;

    try {
      const productId = id || uuidv4();
      const productSku = sku || `V${productId.substring(0, 8).toUpperCase()}`;

      let finalSuperCategoryId = super_category_id;

      if (!finalSuperCategoryId && category_id) {
        const catResult = await pool.query(
          'SELECT super_category_id FROM categories WHERE id = $1 LIMIT 1',
          [category_id]
        );

        if (catResult.rows[0] && catResult.rows[0].super_category_id) {
          finalSuperCategoryId = catResult.rows[0].super_category_id;
        } else {
          return NextResponse.json({
            success: false,
            statusCode: 422,
            errors: { category_id: 'Category not found or invalid' }
          }, { status: 422 });
        }
      }

      if (!finalSuperCategoryId) {
        return NextResponse.json({
          success: false,
          statusCode: 422,
          errors: { super_category_id: 'Super category ID is required' }
        }, { status: 422 });
      }

      // Get next sort_order for this category
      const maxSort = await pool.query(
        'SELECT COALESCE(MAX(sort_order), $1) + 1 as next_sort FROM products WHERE category_id = $2',
        [parseInt(category_id) * 10000 - 1, category_id]
      );
      const nextSortOrder = maxSort.rows[0]?.next_sort || (parseInt(category_id) * 10000);

      const _hasPkg = (await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='packaging_type' LIMIT 1`)).rowCount > 0;
      const result = _hasPkg
        ? await pool.query(
            `INSERT INTO products (id, name, brand, packaging_type, weight, bags_per_case, cases_per_pallet, category_id, super_category_id, image_url, box_image_url, bundle_image_url, sku, barcode_pack, barcode_bundle, barcode_box, price, show_price, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             RETURNING *`,
            [productId, name, brand || null, packaging_type || null, weight, bags_per_case, cases_per_pallet || 60, category_id, finalSuperCategoryId, image_url, box_image_url || null, bundle_image_url || null, productSku, barcode_pack || null, barcode_bundle || null, barcode_box || null, price || 25.00, show_price !== false, nextSortOrder]
          )
        : await pool.query(
            `INSERT INTO products (id, name, brand, weight, bags_per_case, cases_per_pallet, category_id, super_category_id, image_url, box_image_url, bundle_image_url, sku, barcode_pack, barcode_bundle, barcode_box, price, show_price, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             RETURNING *`,
            [productId, name, brand || null, weight, bags_per_case, cases_per_pallet || 60, category_id, finalSuperCategoryId, image_url, box_image_url || null, bundle_image_url || null, productSku, barcode_pack || null, barcode_bundle || null, barcode_box || null, price || 25.00, show_price !== false, nextSortOrder]
          );

      await logActivity(null, 'admin_product_create', `Created product: ${name}`, {
        adminId: admin.id,
        entityType: 'product',
        entityId: result.rows[0].id,
      });

      return NextResponse.json({
        success: true,
        product: result.rows[0]
      }, { status: 201 });
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        return NextResponse.json({
          success: false,
          statusCode: 409,
          error: 'SKU already in use'
        }, { status: 409 });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error('Create product error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
