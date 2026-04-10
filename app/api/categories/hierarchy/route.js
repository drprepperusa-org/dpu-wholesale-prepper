import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, verifyToken, verifyAdminToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const customer = token ? await verifyToken(token) : null;
    const isAdmin = token ? await verifyAdminToken(token) : false;

    const SUPER_EMOJI = {
      'Chips & Savory Snacks': '\uD83E\uDD54',
      'Noodles & Rice': '\uD83C\uDF5C',
      'Cookies & Wafers': '\uD83C\uDF6A',
      'Candy & Jelly': '\uD83C\uDF6C',
      'Ice Cream': '\uD83C\uDF66',
      'Beverages': '\uD83E\uDD64',
      'Korean Snacks': '\uD83C\uDDF0\uD83C\uDDF7'
    };

    // Get all super categories, categories, and product counts in 3 queries max
    const superCatsResult = await pool.query(
      'SELECT id, name, sort_order FROM super_categories ORDER BY sort_order, name'
    );

    // Build category query with product counts
    let catQuery = `
      SELECT c.id, c.name, c.super_category_id, c.sort_order, c.is_hidden,
             COUNT(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL`;

    const catParams = [];

    if (!isAdmin) {
      catQuery += ` AND (p.is_hidden = FALSE OR p.is_hidden IS NULL)`;
      if (customer) {
        catQuery += ` AND p.id NOT IN (
          SELECT product_id FROM customer_overrides WHERE customer_id = $1 AND is_hidden = TRUE
        )`;
        catParams.push(customer.id);
      }
    }

    catQuery += `) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE 1=1`;

    if (!isAdmin) {
      catQuery += ` AND (c.is_hidden = FALSE OR c.is_hidden IS NULL)`;
    }

    catQuery += ` GROUP BY c.id, c.name, c.super_category_id, c.sort_order, c.is_hidden
      ORDER BY c.sort_order, c.name`;

    const catsResult = await pool.query(catQuery, catParams);

    // Get hidden super categories for this customer
    let hiddenSuperIds = new Set();
    if (!isAdmin && customer) {
      const hidden = await pool.query(
        'SELECT super_category_id FROM customer_cat_hidden WHERE customer_id = $1',
        [customer.id]
      );
      hiddenSuperIds = new Set(hidden.rows.map(r => r.super_category_id));
    }

    // Build hierarchy in memory
    const catsBySuper = {};
    for (const cat of catsResult.rows) {
      if (!catsBySuper[cat.super_category_id]) catsBySuper[cat.super_category_id] = [];
      catsBySuper[cat.super_category_id].push({
        id: cat.id,
        name: cat.name,
        productCount: parseInt(cat.product_count)
      });
    }

    const hierarchy = [];
    for (const superCat of superCatsResult.rows) {
      if (hiddenSuperIds.has(superCat.id)) continue;

      const categories = catsBySuper[superCat.id] || [];
      const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);

      hierarchy.push({
        id: superCat.id,
        name: superCat.name,
        emoji: SUPER_EMOJI[superCat.name] || '\uD83D\uDCE6',
        totalProducts,
        categories
      });
    }

    return NextResponse.json({ success: true, hierarchy });
  } catch (err) {
    console.error('Get category hierarchy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
