import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, decodeToken } from '@/lib/auth';

// POST /api/cart/items - Add item to cart
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const payload = decodeToken(token);

    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = payload.sub;
    const { product_id, quantity } = await request.json();

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
    }

    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await pool.query(`
      INSERT INTO carts (customer_id, product_id, quantity, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET quantity = $3, updated_at = NOW()
    `, [customerId, product_id, qty]);

    const cartResult = await pool.query(`
      SELECT c.id, c.product_id, p.name as product_name, p.price, p.image_url,
        c.quantity, (p.price * c.quantity) as total_price, p.weight, p.bags_per_case
      FROM carts c JOIN products p ON c.product_id = p.id
      WHERE c.customer_id = $1 ORDER BY c.created_at ASC
    `, [customerId]);

    const items = cartResult.rows;
    return NextResponse.json({
      success: true,
      items,
      total_items: items.length,
      total_cost: items.reduce((sum, item) => sum + parseFloat(item.total_price), 0)
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
