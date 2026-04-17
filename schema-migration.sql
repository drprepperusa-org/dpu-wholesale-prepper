-- DR Prepper Wholesale Portal - Migration Schema
-- Matches the OLD Supabase database structure exactly
-- Run this in the NEW Supabase SQL Editor BEFORE importing CSVs
--
-- IMPORTANT: Import CSVs in this exact order:
-- 1. users → 2. super_categories → 3. categories → 4. products
-- 5. customers → 6. customer_overrides → 7. customer_cat_hidden
-- 8. orders → 9. order_items → 10. favorites → 11. settings
-- 12. pending_registrations → 13. activity_log → 14. carts

-- ============================================================
-- DROP existing tables (clean slate)
-- ============================================================
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS pending_registrations CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customer_cat_hidden CASCADE;
DROP TABLE IF EXISTS customer_overrides CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS super_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- CREATE TABLES (matching old Supabase CSV column names)
-- ============================================================

-- Admin Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Super Categories
CREATE TABLE super_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  emoji VARCHAR(10),
  sort_order INT DEFAULT 0
);

-- Categories (sub-categories)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE
);

-- Products
CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  packaging_type VARCHAR(100),
  weight VARCHAR(50),
  bags_per_case VARCHAR(50),
  units_per_case VARCHAR(50),
  cases_per_pallet INT DEFAULT 60,
  price DECIMAL(10, 2) DEFAULT 25.00,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  image_url VARCHAR(512),
  box_image_url VARCHAR(512),
  bundle_image_url VARCHAR(512),
  sku VARCHAR(100),
  barcode_pack VARCHAR(100),
  barcode_bundle VARCHAR(100),
  barcode_box VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_oos BOOLEAN DEFAULT FALSE,
  show_price BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customers (includes columns from old DB: reset_token, etc.)
CREATE TABLE customers (
  id VARCHAR(50) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  alt_phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(100),
  view_preset VARCHAR(50) DEFAULT 'full',
  show_prices BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  password_changed_at TIMESTAMP
);

-- Customer Overrides (per-customer product visibility + pricing)
CREATE TABLE customer_overrides (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  override_price DECIMAL(10, 2),
  is_hidden BOOLEAN DEFAULT FALSE,
  is_oos BOOLEAN DEFAULT FALSE,
  UNIQUE(customer_id, product_id)
);

-- Customer Category Hidden
CREATE TABLE customer_cat_hidden (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  UNIQUE(customer_id, super_category_id)
);

-- Orders
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'Pending',
  total_cases INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INT NOT NULL,
  unit VARCHAR(20) NOT NULL,
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Favorites
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- Activity Log
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  admin_id INT REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  detail TEXT,
  entity_type VARCHAR(50),
  entity_id VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pending Registrations
CREATE TABLE pending_registrations (
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
CREATE TABLE settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Carts
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_super_category ON products(super_category_id);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_hidden ON products(category_id, is_hidden);
CREATE INDEX idx_categories_super ON categories(super_category_id);
CREATE INDEX idx_categories_is_hidden ON categories(is_hidden);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_favorites_customer ON favorites(customer_id);
CREATE INDEX idx_activity_customer ON activity_log(customer_id);
CREATE INDEX idx_activity_admin ON activity_log(admin_id);
CREATE INDEX idx_activity_type ON activity_log(type);
CREATE INDEX idx_activity_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_customer_overrides_customer ON customer_overrides(customer_id);
CREATE INDEX idx_customer_overrides_product ON customer_overrides(product_id);
CREATE INDEX idx_customer_cat_hidden_customer ON customer_cat_hidden(customer_id);
CREATE INDEX idx_carts_customer ON carts(customer_id);
CREATE INDEX idx_pending_reg_status ON pending_registrations(status);
CREATE INDEX idx_pending_reg_email ON pending_registrations(email);
