-- DR Prepper Wholesale Portal Database Schema
-- PostgreSQL

-- Super Categories
CREATE TABLE IF NOT EXISTS super_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  sort_order INT DEFAULT 0
);

-- Categories (sub-categories)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  weight VARCHAR(50),
  bags_per_case VARCHAR(50),
  cases_per_pallet INT DEFAULT 60,
  price DECIMAL(10, 2) DEFAULT 25.00,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  image_url VARCHAR(512),
  sku VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_oos BOOLEAN DEFAULT FALSE,
  show_price BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(100),
  view_preset VARCHAR(50) DEFAULT 'full',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Customer Overrides (per-customer product visibility)
CREATE TABLE IF NOT EXISTS customer_overrides (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_oos BOOLEAN DEFAULT FALSE,
  UNIQUE(customer_id, product_id)
);

-- Customer Category Hidden (per-customer super-category visibility)
CREATE TABLE IF NOT EXISTS customer_cat_hidden (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  UNIQUE(customer_id, super_category_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'Pending',
  total_cases INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INT NOT NULL,
  unit VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  detail TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pending Registrations
CREATE TABLE IF NOT EXISTS pending_registrations (
  id VARCHAR(50) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Carts (Shopping Cart Persistence)
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_super_category ON products(super_category_id);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_category_hidden ON products(category_id, is_hidden);
CREATE INDEX idx_categories_is_hidden ON categories(is_hidden);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_favorites_customer ON favorites(customer_id);
CREATE INDEX idx_activity_customer ON activity_log(customer_id);
CREATE INDEX idx_activity_type ON activity_log(type);
CREATE INDEX idx_activity_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_admin ON activity_log(admin_id);
CREATE INDEX idx_customer_overrides_customer ON customer_overrides(customer_id);
CREATE INDEX idx_customer_cat_hidden_customer ON customer_cat_hidden(customer_id);
CREATE INDEX idx_carts_customer ON carts(customer_id);
CREATE INDEX idx_carts_created_at ON carts(created_at DESC);
