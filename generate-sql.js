const fs = require('fs');
const products = JSON.parse(fs.readFileSync('scripts/products.json', 'utf8'));

let sql = `-- ============================================
-- DR Prepper Wholesale Portal - Full Database Setup
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vgzuxoonuoakkgsdfsgg/sql
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- SCHEMA
CREATE TABLE IF NOT EXISTS super_categories (
  id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, sort_order INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0, is_hidden BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, weight VARCHAR(50),
  bags_per_case VARCHAR(50), cases_per_pallet INT DEFAULT 60,
  price DECIMAL(10,2) DEFAULT 25.00,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  image_url VARCHAR(512), sku VARCHAR(100), sort_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE, is_oos BOOLEAN DEFAULT FALSE,
  show_price BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY, company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255), email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, phone VARCHAR(20),
  address_line1 VARCHAR(255), address_line2 VARCHAR(255),
  city VARCHAR(100), state VARCHAR(50), zip VARCHAR(20), country VARCHAR(100),
  view_preset VARCHAR(50) DEFAULT 'full', active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(), last_login TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customer_overrides (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_hidden BOOLEAN DEFAULT FALSE, is_oos BOOLEAN DEFAULT FALSE,
  override_price DECIMAL(10,2) DEFAULT NULL,
  UNIQUE(customer_id, product_id)
);
CREATE TABLE IF NOT EXISTS customer_cat_hidden (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  super_category_id INT NOT NULL REFERENCES super_categories(id) ON DELETE CASCADE,
  UNIQUE(customer_id, super_category_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'Pending', total_cases INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INT NOT NULL, unit VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(), UNIQUE(customer_id, product_id)
);
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, detail TEXT, admin_id VARCHAR(50),
  entity_type VARCHAR(50), entity_id VARCHAR(100), ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pending_registrations (
  id VARCHAR(50) PRIMARY KEY, company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255), email VARCHAR(255) NOT NULL UNIQUE, phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL, status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'view-only' CHECK (role IN ('admin','sales','view-only')),
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP, reset_token VARCHAR(255) NULL,
  reset_token_expires TIMESTAMP NULL, password_changed_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45), success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_super_category ON products(super_category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_filter ON products(is_hidden, is_oos, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_hidden ON categories(is_hidden);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_favorites_customer ON favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_customer ON activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_admin_id ON activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_customer_overrides_customer ON customer_overrides(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_cat_hidden_customer ON customer_cat_hidden(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_created_at ON carts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_password_changed ON users(password_changed_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, created_at);

-- SEED: Super Categories
INSERT INTO super_categories (id, name, sort_order) VALUES
(1,'Chips & Savory Snacks',1),(2,'Noodles & Rice',2),(3,'Cookies & Wafers',3),
(4,'Candy & Jelly',4),(5,'Korean Snacks',5),(6,'Beverages',6),(7,'Ice Cream',7);
SELECT setval('super_categories_id_seq', 7);

-- SEED: Categories
INSERT INTO categories (id, name, super_category_id, sort_order) VALUES
(1,'Lay''s Potato Chips',1,1),(2,'Lay''s Wave Chips',1,2),(3,'Lay''s Yam Chips',1,3),
(4,'Cheetos',1,4),(5,'Doritos',1,5),(6,'Pringles',1,6),
(7,'Samyang Noodles',2,7),(8,'Nongshim Noodles',2,8),(9,'Ottogi Noodles',2,9),(10,'Instant Rice',2,10),
(11,'Choco Pie',3,11),(12,'Wafer Cookies',3,12),(13,'Cream Cookies',3,13),
(14,'Hard Candy',4,14),(15,'Gummy Candy',4,15),(16,'Jelly Products',4,16),
(17,'Tteokbokki',5,17),(18,'Korean Crackers',5,18),(19,'Seaweed Snacks',5,19),
(20,'Bottled Drinks',6,20),(21,'Powdered Drinks',6,21),(22,'Frozen Desserts',7,22);
SELECT setval('categories_id_seq', 22);

-- SEED: Products
`;

// Generate product inserts in batches
const batchSize = 50;
for (let i = 0; i < products.length; i += batchSize) {
  const batch = products.slice(i, i + batchSize);
  sql += 'INSERT INTO products (id, name, category_id, super_category_id, sku, weight, bags_per_case, cases_per_pallet, sort_order, is_hidden, is_oos) VALUES\n';
  sql += batch.map(p => {
    const name = p.name.replace(/'/g, "''");
    const sku = (p.sku || p.id).replace(/'/g, "''");
    const weight = (p.weight || '100g').replace(/'/g, "''");
    return `('${p.id}', '${name}', ${p.category_id || 1}, ${p.category_id || 1}, '${sku}', '${weight}', ${p.bags_per_case || 24}, ${p.cases_per_pallet || 60}, ${p.sort_order || 0}, ${p.is_hidden ? 'TRUE' : 'FALSE'}, ${p.is_oos ? 'TRUE' : 'FALSE'})`;
  }).join(',\n') + ';\n\n';
}

sql += `-- SEED: Customers (password: demo1234) + Admin (password: admin123)
INSERT INTO customers (id, company_name, contact_name, email, phone, address_line1, view_preset, password_hash, active) VALUES
('c1', 'Happy Snacks Co.', 'John Buyer', 'buyer@happysnacks.com', '(555) 123-4567', '123 Snack St, LA, CA 90001', 'full', crypt('demo1234', gen_salt('bf')), TRUE),
('c2', 'Pacific Rim Imports', 'Sarah Pacific', 'sarah@pacificrimports.com', '(555) 234-5678', '456 Import Ave, SF, CA 94105', 'chips', crypt('demo1234', gen_salt('bf')), TRUE),
('c3', 'Seoul Garden', 'Min Park', 'min@seoulgardenusa.com', '(555) 345-6789', '789 Korean Way, NYC, NY 10001', 'korean', crypt('demo1234', gen_salt('bf')), TRUE),
('c4', 'Sunshine Mart', 'Maria Sunshine', 'maria@sunshinemart.com', '(555) 456-7890', '321 Sunny Blvd, Houston, TX 77001', 'noodles', crypt('demo1234', gen_salt('bf')), TRUE),
('c5', 'Test Account', 'Test User', 'test@example.com', '(555) 999-9999', '999 Test Lane, Test City, TS 99999', 'full', crypt('demo1234', gen_salt('bf')), TRUE);

INSERT INTO customers (id, company_name, contact_name, email, phone, address_line1, view_preset, password_hash, active) VALUES
('admin', 'Admin', 'DJ', 'admin@drprepper.com', '(555) 000-0000', 'Admin Address', 'full', crypt('admin123', gen_salt('bf')), TRUE)
ON CONFLICT (email) DO NOTHING;

-- SEED: Admin in users table (separate from customers)
INSERT INTO users (id, email, password_hash, role, active)
SELECT gen_random_uuid()::text, email, password_hash, 'admin', true
FROM customers WHERE email = 'admin@drprepper.com'
ON CONFLICT (email) DO UPDATE SET role = 'admin', active = TRUE;

-- SEED: Customer visibility presets
INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES
('c2',2),('c2',3),('c2',4),('c2',5),('c2',6),('c2',7),
('c3',1),('c3',2),('c3',3),('c3',4),('c3',6),('c3',7),
('c4',1),('c4',3),('c4',4),('c4',5),('c4',6),('c4',7);

-- SEED: Settings
INSERT INTO settings (key, value) VALUES
('allow_registration','true'),('allow_guest_checkout','false'),('require_approval','true');

-- DONE! Credentials:
-- Admin:  admin@drprepper.com / admin123  (users table, role=admin)
-- Buyer:  buyer@happysnacks.com / demo1234  (customers table, role=customer)
`;

fs.writeFileSync('supabase-setup.sql', sql);
console.log('Generated supabase-setup.sql (' + sql.split('\n').length + ' lines, ' + Math.round(sql.length/1024) + 'KB)');
