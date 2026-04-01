import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractToken, decodeToken } from '@/lib/auth';

async function getUpdatedCart(customerId) {
  const cartResult = await pool.query(`
    SELECT c.id, c.product_id, p.name as product_name, p.price, p.image_url,
      c.quantity, (p.price * c.quantity) as total_price, p.weight, p.bags_per_case
    FROM carts c JOIN products p ON c.product_id = p.id
    WHERE c.customer_id = $1 ORDER BY c.created_at ASC
  `, [customerId]);

  const items = cartResult.rows;
  return {
    success: true,
    items,
    total_items: items.length,
    total_cost: items.reduce((sum, item) => sum + parseFloat(item.total_price), 0)
  };
}

export async function PUT(request, { params }) {
  try {
    const { id: itemId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const payload = decodeToken(token);

    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = payload.sub;
    const { quantity } = await request.json();

    if (quantity === undefined || quantity === null) {
      return NextResponse.json({ error: 'quantity is required' }, { status: 400 });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json({ error: 'quantity must be a non-negative integer' }, { status: 400 });
    }

    const itemCheck = await pool.query(
      'SELECT id FROM carts WHERE id = $1 AND customer_id = $2',
      [itemId, customerId]
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (qty === 0) {
      await pool.query('DELETE FROM carts WHERE id = $1', [itemId]);
    } else {
      await pool.query(
        'UPDATE carts SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [qty, itemId]
      );
    }

    return NextResponse.json(await getUpdatedCart(customerId));
  } catch (err) {
    console.error('Update cart item error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: itemId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    const payload = decodeToken(token);

    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = payload.sub;

    const itemCheck = await pool.query(
      'SELECT id FROM carts WHERE id = $1 AND customer_id = $2',
      [itemId, customerId]
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await pool.query('DELETE FROM carts WHERE id = $1', [itemId]);

    return NextResponse.json(await getUpdatedCart(customerId));
  } catch (err) {
    console.error('Delete cart item error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
