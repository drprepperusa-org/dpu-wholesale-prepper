import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, verifyToken, verifyAdminToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const customer = token ? await verifyToken(token) : null;
    const isAdmin = token ? await verifyAdminToken(token) : false;

    const superCatsResult = await pool.query(`
      SELECT sc.id, sc.name, sc.sort_order
      FROM super_categories sc
      ORDER BY sc.sort_order, sc.name
    `);

    const SUPER_EMOJI = {
      'Chips & Savory Snacks': '\uD83E\uDD54',
      'Noodles & Rice': '\uD83C\uDF5C',
      'Cookies & Wafers': '\uD83C\uDF6A',
      'Candy & Jelly': '\uD83C\uDF6C',
      'Ice Cream': '\uD83C\uDF66',
      'Beverages': '\uD83E\uDD64',
      'Korean Snacks': '\uD83C\uDDF0\uD83C\uDDF7'
    };

    const hierarchy = [];

    for (const superCat of superCatsResult.rows) {
      // For customers, skip hidden super categories
      if (!isAdmin && customer) {
        const hidden = await pool.query(
          'SELECT id FROM customer_cat_hidden WHERE customer_id = $1 AND super_category_id = $2',
          [customer.id, superCat.id]
        );
        if (hidden.rows.length > 0) continue;
      }

      // Get all subcategories for this super category
      let subCatsQuery = `
        SELECT c.id, c.name, c.sort_order, c.is_hidden
        FROM categories c
        WHERE c.super_category_id = $1
      `;

      if (!isAdmin) {
        subCatsQuery += ` AND (c.is_hidden = FALSE OR c.is_hidden IS NULL)`;
      }

      subCatsQuery += ` ORDER BY c.sort_order, c.name`;

      const subCatsResult = await pool.query(subCatsQuery, [superCat.id]);

      // Get product counts per category
      const categories = [];
      for (const cat of subCatsResult.rows) {
        let countQuery = `SELECT COUNT(*) as cnt FROM products WHERE category_id = $1`;
        const countParams = [cat.id];

        if (!isAdmin) {
          countQuery += ` AND (is_hidden = FALSE OR is_hidden IS NULL)`;
          if (customer) {
            countQuery += ` AND id NOT IN (
              SELECT product_id FROM customer_overrides
              WHERE customer_id = $2 AND is_hidden = TRUE
            )`;
            countParams.push(customer.id);
          }
        }

        const countResult = await pool.query(countQuery, countParams);
        const productCount = parseInt(countResult.rows[0].cnt);

        categories.push({
          id: cat.id,
          name: cat.name,
          productCount
        });
      }

      const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);

      hierarchy.push({
        id: superCat.id,
        name: superCat.name,
        emoji: SUPER_EMOJI[superCat.name] || '\uD83D\uDCE6',
        totalProducts,
        categories
      });
    }

    return NextResponse.json({
      success: true,
      hierarchy
    });
  } catch (err) {
    console.error('Get category hierarchy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
