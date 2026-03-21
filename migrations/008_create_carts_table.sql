-- Cart Persistence Table
-- Tracks shopping cart items per customer

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- Index on customer_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(customer_id);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_carts_created_at ON carts(created_at DESC);
