-- ============================================
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
INSERT INTO products (id, name, category_id, super_category_id, sku, weight, bags_per_case, cases_per_pallet, sort_order, is_hidden, is_oos) VALUES
('V036B02101-1', 'LS-Potato Chips (Cucumber)', 1, 1, 'V036B02101-1', '90g', 24, 40, 0, FALSE, FALSE),
('V036B02102-1', 'LS-Potato Chips (Tomato)', 1, 1, 'V036B02102-1', '90g', 24, 40, 1, FALSE, FALSE),
('V036B02104', 'LS-Potato Chips (Braised Pork Flavor)', 1, 1, 'V036B02104', '104g', 24, 40, 2, FALSE, FALSE),
('V036B02106', 'LS-Potato Avocado Chips (Wasabi)', 1, 1, 'V036B02106', '90g', 24, 40, 3, FALSE, FALSE),
('V036B02107', 'LS-Potato Chips (Roasted Seaweed)', 1, 1, 'V036B02107', '104g', 24, 40, 4, FALSE, FALSE),
('V036B02110', 'LS-Potato Chips (Spicy Crayfish)', 1, 1, 'V036B02110', '104g', 24, 40, 5, FALSE, FALSE),
('V036B02201', 'LS-Potato Chips (Cucumber)', 1, 1, 'V036B02201', '70g', 22, 40, 6, FALSE, FALSE),
('V036B02202', 'LS-Potato Chips (Spicy Hot Pot)', 1, 1, 'V036B02202', '70g', 22, 40, 7, FALSE, FALSE),
('V036B02203', 'LS-Potato Chips (Italian Red Meat)', 1, 1, 'V036B02203', '70g', 22, 40, 8, FALSE, FALSE),
('V036B02204', 'LS-Potato Chips (Mexican Tomato Chicken)', 1, 1, 'V036B02204', '70g', 22, 40, 9, FALSE, FALSE),
('V036B02208', 'LS-Potato Chips (Crispy Grilled Fish)', 1, 1, 'V036B02208', '70g', 22, 40, 10, FALSE, FALSE),
('V036B02210', 'LS-Potato Chips (Garlic Roasted Oyster)', 1, 1, 'V036B02210', '70g', 22, 40, 11, FALSE, FALSE),
('V036B02211', 'LS-Potato Chips (Cumin Kebab)', 1, 1, 'V036B02211', '70g', 22, 40, 12, FALSE, FALSE),
('V036B02217', 'Lay''s Potato Chips (Spicy Hot Pot)', 1, 1, 'V036B02217', '70g', 22, 40, 13, FALSE, FALSE),
('V036B02218', 'Lay''s Potato Chips (Sesame Sauce Hot Pot)', 1, 1, 'V036B02218', '70g', 22, 40, 14, FALSE, FALSE),
('V036B02301', 'LS-Wave Chips (BBQ Squid)', 1, 1, 'V036B02301', '70g', 22, 40, 15, FALSE, FALSE),
('V036B02302', 'LS-Wave Chips (BBQ Chicken)', 1, 1, 'V036B02302', '70g', 22, 40, 16, FALSE, FALSE),
('V036B02304', 'LS-Wave Chips (Spicy)', 1, 1, 'V036B02304', '70g', 22, 40, 17, FALSE, FALSE),
('V036B02305', 'LS-Wave Potato Chips (Pure Tomato)', 1, 1, 'V036B02305', '70g', 22, 40, 18, FALSE, FALSE),
('V036B02401', 'LS-Potato Chips (Spicy Crayfish)', 1, 1, 'V036B02401', '70g', 22, 40, 19, FALSE, FALSE),
('V036B02403', 'LS-Potato Chips (Fried Crab)', 1, 1, 'V036B02403', '70g', 22, 40, 20, FALSE, FALSE),
('V036B02501', 'LS-Yam Chips (Cucumber)', 1, 1, 'V036B02501', '80g', 40, 40, 21, FALSE, FALSE),
('V036B02502', 'LS-Yam Chips (Tomato)', 1, 1, 'V036B02502', '80g', 40, 40, 22, FALSE, FALSE),
('V036B02618', 'Lay''s Potato Chips (Spiced Braised Artificial Beef Fla)', 1, 1, 'V036B02618', '70g', 22, 40, 23, FALSE, FALSE),
('V036B02619', 'Lay''s Potato Chips (Hot & Spicy Braised Artificial Duck Tongue)', 1, 1, 'V036B02619', '70g', 22, 40, 24, FALSE, FALSE),
('V036B02622', 'Lay''s Potato Chips (Hot & Sour Lemon Braised Artificial)', 1, 1, 'V036B02622', '70g', 22, 40, 25, FALSE, FALSE),
('V036B02628', 'Lay''s Potato Chips (Imitation Peppercorn Crispy Artificial)', 1, 1, 'V036B02628', '70g', 22, 40, 26, FALSE, FALSE),
('V036B02629', 'Lay''s Potato Chips (Imitation Sweet and Spicy Fried Artificial)', 1, 1, 'V036B02629', '70g', 22, 40, 27, FALSE, FALSE),
('V036B02630', 'Lay''s Potato Chips (Imitation Mustard Octopus Flavor)', 1, 1, 'V036B02630', '70g', 22, 40, 28, FALSE, FALSE),
('V036B08701', 'Weilong Crispy Fire Spicy Flavor 320g (boxed)', 1, 1, 'V036B08701', '320g', 8, 50, 29, FALSE, FALSE),
('V036B08702', 'Weilong Crispy Fire Lime Flavor 320g (boxed)', 1, 1, 'V036B08702', '320g', 8, 50, 30, FALSE, FALSE),
('V036B08703', 'Weilong Crispy Fire Spicy Flavor 45g (bag)', 1, 1, 'V036B08703', '45g', 60, 30, 31, FALSE, FALSE),
('V036B08704', 'Weilong Crispy Fire Lime Flavor 45g (bag)', 1, 1, 'V036B08704', '45g', 60, 30, 32, FALSE, FALSE),
('V036B23101-1', 'QD-Corn Sticks (Japanese Steak)', 1, 1, 'V036B23101-1', '50g', 50, 40, 33, FALSE, FALSE),
('V036B23102-2', 'QD-Corn Sticks (American Turkey)', 1, 1, 'V036B23102-2', '50g', 50, 40, 34, FALSE, FALSE),
('V036B28101-1', 'XWX-XHX Snack Noodles (BBQ)', 2, 2, 'V036B28101-1', '35g', 30, 40, 35, FALSE, FALSE),
('V036B28102-1', 'XWX-Snack Noodles (New Orleans Roast Chicken)', 2, 2, 'V036B28102-1', '35g', 30, 40, 36, FALSE, FALSE),
('V036B28103-1', 'XHX-Snack Noodles (Spicy Crab)', 2, 2, 'V036B28103-1', '35g', 30, 40, 37, FALSE, FALSE),
('V036B28105-1', 'XWX-Snack Noodles (Red Stew)', 2, 2, 'V036B28105-1', '35g', 30, 40, 38, FALSE, FALSE),
('V036B41202', 'ZX-Natural Series Seaweed Crackers', 3, 3, 'V036B41202', '280g', 12, 50, 39, FALSE, FALSE),
('V036B41203', 'ZX-Butter Cheese Biscuits', 3, 3, 'V036B41203', '300g', 12, 50, 40, FALSE, FALSE),
('V036B41301', 'ZX-Natural Series Nougat Sandwich Crackers', 3, 3, 'V036B41301', '145g', 12, 50, 41, FALSE, FALSE),
('V036B41402', 'ZX-Sandwich Crackers - Strawberry', 3, 3, 'V036B41402', '144g', 18, 50, 42, FALSE, FALSE),
('V036B41403', 'ZX-Sandwich Crackers - Lemon', 3, 3, 'V036B41403', '144g', 18, 50, 43, FALSE, FALSE),
('V036B41404', 'ZX-Sandwich Crackers - Chocolate', 3, 3, 'V036B41404', '144g', 18, 50, 44, FALSE, FALSE),
('V036B41405', 'ZX-Sandwich Crackers - Blueberry Yogurt Flavor', 3, 3, 'V036B41405', '144g', 18, 50, 45, FALSE, FALSE),
('V036B41501', 'ZX-Coffee Biscuits', 3, 3, 'V036B41501', '120g', 12, 50, 46, FALSE, FALSE),
('V036B56304', 'XFJ-Marshmallow Yogurt', 4, 4, 'V036B56304', '64g', 20, 50, 47, FALSE, FALSE),
('V036B56305', 'XFJ-Marshmallow Peach', 4, 4, 'V036B56305', '64g', 20, 50, 48, FALSE, FALSE),
('V036B56306', 'XFJ-Marshmallow Grape', 4, 4, 'V036B56306', '64g', 20, 50, 49, FALSE, FALSE);

INSERT INTO products (id, name, category_id, super_category_id, sku, weight, bags_per_case, cases_per_pallet, sort_order, is_hidden, is_oos) VALUES
('V036B56306-1', 'Hsu Fu Chi Stuffed Marshmallow Grape Flavor', 4, 4, 'V036B56306-1', '64g', 20, 50, 50, FALSE, FALSE),
('V036B56307', 'XFJ-Blueberry Flavor Marshmallow', 4, 4, 'V036B56307', '64g', 20, 50, 51, FALSE, FALSE),
('V036B56307-1', 'HSU FU CHI Blueberry Flavor Marshmallow', 4, 4, 'V036B56307-1', '64g', 20, 50, 52, FALSE, FALSE),
('V036B56310-1', 'HSU FU CHI Strawberry Flavor Crispy Rolls', 4, 4, 'V036B56310-1', '52g', 6, 50, 53, FALSE, FALSE),
('V036B56311-1', 'HSU FU CHI Vanilla Flavor Crispy Rolls', 4, 4, 'V036B56311-1', '52g', 6, 50, 54, FALSE, FALSE),
('V036B56316', 'XFJ-Orange Flavor Marshmallow', 4, 4, 'V036B56316', '64g', 20, 50, 55, FALSE, FALSE),
('V036B56321', 'Hsu Fu Chi Passion Fruit Green Tea Flavor Absorb Jelly', 4, 4, 'V036B56321', '150g', 40, 40, 56, FALSE, FALSE),
('V036B56322', 'Hsu Fu Chi Yuzu Oolong Tea Flavor Suction Jelly', 4, 4, 'V036B56322', '150g', 40, 40, 57, FALSE, FALSE),
('V036B56330', 'HSU FU CHI Strawberry Flavor Wafer Biscuit', 4, 4, 'V036B56330', '190g', 20, 50, 58, FALSE, FALSE),
('V036B56333', 'HSU FU CHI Raw Coconut Original Jelly', 4, 4, 'V036B56333', '120g', 40, 40, 59, FALSE, FALSE),
('V036B56334', 'HSU FU CHI Raw Coconut Pineapple Flavor Jelly', 4, 4, 'V036B56334', '120g', 40, 40, 60, FALSE, FALSE),
('V036B56335', 'HSU FU CHI Raw Coconut Latte Flavor Jelly', 4, 4, 'V036B56335', '120g', 40, 40, 61, FALSE, FALSE),
('V036B56411', 'XFJ-Nougat Candy (Blueberry/Strawberry)', 4, 4, 'V036B56411', '210g', 20, 50, 62, FALSE, FALSE),
('V036B56412-1', 'HSU FU CHI Nougat Candy (Milk Cranberry Flavor)', 4, 4, 'V036B56412-1', '210g', 20, 50, 63, FALSE, FALSE),
('V036B56413', 'HSU FU CHI Mixed Flavor Nougat Candy Can', 4, 4, 'V036B56413', '409g', 1, 50, 64, FALSE, FALSE),
('V036B56415-1', 'HSU FU CHI Cream Flavor Corn Soft Candy', 4, 4, 'V036B56415-1', '330g', 20, 50, 65, FALSE, FALSE),
('V036B56416', 'XFJ-Durian Flavor Soft Candy', 4, 4, 'V036B56416', '200g', 20, 50, 66, FALSE, FALSE),
('V036J07401', 'EC-Herbal Jelly (Pear Flavor)', 4, 4, 'V036J07401', '253g', 1, 50, 67, FALSE, FALSE),
('V036J07402', 'EC-Herbal Jelly (Osmanthus Flavor)', 4, 4, 'V036J07402', '253g', 1, 50, 68, FALSE, FALSE),
('V036J07403', 'EC-Herbal Jelly (Bayberry Flavor)', 4, 4, 'V036J07403', '253g', 1, 50, 69, FALSE, FALSE),
('V036B56501', 'HSU FU CHI Antarctic Krill Corn Balls', 4, 4, 'V036B56501', '40g', 20, 50, 70, FALSE, FALSE),
('V036B56502', 'HSU FU CHI Cheese Cheddar Corn Balls', 4, 4, 'V036B56502', '40g', 20, 50, 71, FALSE, FALSE),
('V036B56507', 'XFJ-Dr. Bear Fruit Cake Flavor Fruit Juice Gummy', 4, 4, 'V036B56507', '60g', 10, 50, 72, FALSE, FALSE),
('V036B56508', 'XFJ-Dr. Bear Sour Peach Flavor Fruit Juice Gummy', 4, 4, 'V036B56508', '60g', 10, 50, 73, FALSE, FALSE),
('V036B59104', 'LYFEN Glutinous Rice Chips (Spicy Flavor)', 1, 1, 'V036B59104', '98g', 20, 50, 74, FALSE, FALSE),
('V036B76101', 'Nestle Cuicuisha Chocolate Flavor Wafer', 3, 3, 'V036B76101', '595.2g', 24, 40, 75, FALSE, FALSE),
('V036B76101-1', 'Nestle Cuicuisha Chocolate Flavor Wafer', 3, 3, 'V036B76101-1', '212.5g', 1, 50, 76, FALSE, FALSE),
('V036B76102', 'Nestle Cuicuisha Milk Flavor Wafer', 3, 3, 'V036B76102', '595.2g', 24, 40, 77, FALSE, FALSE),
('V036B76102-1', 'Nestle Cuicuisha Milk Flavor Wafer', 3, 3, 'V036B76102-1', '212.5g', 1, 50, 78, FALSE, FALSE),
('V036B76103', 'Nestle Cuicuisha Peanut Flavor Wafer', 3, 3, 'V036B76103', '595.2g', 24, 40, 79, FALSE, FALSE),
('V036B76104-1', 'Nestle Cuicuisha Wafer Assorted Flavor', 3, 3, 'V036B76104-1', '330g', 1, 50, 80, FALSE, FALSE),
('V036B76105', 'MILO Chocolate Flavoured Cookie with Chocolate Flavoured', 3, 3, 'V036B76105', '108g', 12, 50, 81, FALSE, FALSE),
('V036B76105-1', 'MILO Chocolate Flavoured Cookie with Chocolate Flavoured', 3, 3, 'V036B76105-1', '216g', 12, 50, 82, FALSE, FALSE),
('HQ001', 'HQ Ningxia Lemon Flavored Ice Cream', 7, 7, 'HQ001', '75g', 3, 50, 83, FALSE, FALSE),
('HQ002', 'HQ Taoqi Peach Flavored Ice Cream', 7, 7, 'HQ002', '75g', 3, 50, 84, FALSE, FALSE),
('HQ003', 'HQ Fumang Mango Flavored Ice Cream', 7, 7, 'HQ003', '75g', 3, 50, 85, FALSE, FALSE),
('AIKO001', 'Aiko Garden Mandarin Flavored Ice Cream', 7, 7, 'AIKO001', '75g', 3, 50, 86, FALSE, FALSE),
('HQ004', 'HQ Lemon Yogurt Ice Cream', 7, 7, 'HQ004', '75g', 3, 50, 87, FALSE, FALSE),
('HQ005', 'HQ Taoshan Milk Flavored Ice Cream', 7, 7, 'HQ005', '60g', 3, 50, 88, FALSE, FALSE),
('AIKO002', 'Aiko Garden Grape Flavored Ice Cream', 7, 7, 'AIKO002', '75g', 3, 50, 89, FALSE, FALSE),
('AIKO003', 'Aiko Garden Strawberry Flavored Ice Cream', 7, 7, 'AIKO003', '75g', 3, 50, 90, FALSE, FALSE),
('BD001', 'Buldak Chips - Original', 2, 2, 'BD001', '100g', 1, 50, 91, FALSE, FALSE),
('BD002', 'Buldak Chips - Habanero Lime', 2, 2, 'BD002', '100g', 1, 50, 92, FALSE, FALSE),
('BD003', 'Buldak Chips - Quattro Cheese', 2, 2, 'BD003', '100g', 1, 50, 93, FALSE, FALSE),
('BD004', 'Buldak Big Bowl - Original', 2, 2, 'BD004', '100g', 1, 50, 94, FALSE, FALSE),
('BD005', 'Buldak Big Bowl - Carbonara', 2, 2, 'BD005', '100g', 1, 50, 95, FALSE, FALSE),
('BD006', 'Buldak Big Bowl - Cream Carbonara', 2, 2, 'BD006', '100g', 1, 50, 96, FALSE, FALSE),
('BD007', 'Buldak Big Bowl - Rose', 2, 2, 'BD007', '100g', 1, 50, 97, FALSE, FALSE),
('BD008', 'Buldak Big Bowl - Cheese', 2, 2, 'BD008', '100g', 1, 50, 98, FALSE, FALSE),
('BD009', 'Buldak Big Bowl - Taco', 2, 2, 'BD009', '100g', 1, 50, 99, FALSE, FALSE);

INSERT INTO products (id, name, category_id, super_category_id, sku, weight, bags_per_case, cases_per_pallet, sort_order, is_hidden, is_oos) VALUES
('BD010', 'Buldak Big Bowl - Habanero Lime', 2, 2, 'BD010', '100g', 1, 50, 100, FALSE, FALSE),
('BD011', 'Buldak Big Bowl - Tomyum', 2, 2, 'BD011', '100g', 1, 50, 101, FALSE, FALSE),
('BD012', 'Buldak Cups - Cheese', 2, 2, 'BD012', '100g', 1, 50, 102, FALSE, FALSE),
('BD013', 'Buldak Cups - 2x Spicy', 2, 2, 'BD013', '100g', 1, 50, 103, FALSE, FALSE),
('BD014', 'Buldak Cups - Original', 2, 2, 'BD014', '100g', 1, 50, 104, FALSE, FALSE),
('BD015', 'Buldak Cups - Carbonara', 2, 2, 'BD015', '100g', 1, 50, 105, FALSE, FALSE),
('BD016', 'Buldak - Spicy Dumplings - Carbonara', 2, 2, 'BD016', '100g', 1, 50, 106, FALSE, FALSE),
('BD017', 'Buldak - Spicy Rice Cake', 2, 2, 'BD017', '100g', 1, 50, 107, FALSE, FALSE),
('BD018', 'Buldak - Spicy Dumplings - Original', 2, 2, 'BD018', '100g', 1, 50, 108, FALSE, FALSE),
('BD019', 'Buldak - Fried Rice - Original', 2, 2, 'BD019', '100g', 1, 50, 109, FALSE, FALSE),
('BD020', 'Buldak - Fried Rice - Carbonara', 2, 2, 'BD020', '100g', 1, 50, 110, FALSE, FALSE),
('BD021', 'Buldak Multi - Carbonara', 2, 2, 'BD021', '100g', 1, 50, 111, FALSE, FALSE),
('BD022', 'Buldak Multi - Cream Carbonara', 2, 2, 'BD022', '100g', 1, 50, 112, FALSE, FALSE),
('BD023', 'Buldak Multi - Habanero Lime', 2, 2, 'BD023', '100g', 1, 50, 113, FALSE, FALSE),
('BD024', 'Buldak Multi - Taco', 2, 2, 'BD024', '100g', 1, 50, 114, FALSE, FALSE),
('BD025', 'Buldak Multi - Tomyum', 2, 2, 'BD025', '100g', 1, 50, 115, FALSE, FALSE),
('BD026', 'Buldak Multi - Swicy', 2, 2, 'BD026', '100g', 1, 50, 116, FALSE, FALSE),
('BD027', 'Buldak Multi - Habanero Lime', 2, 2, 'BD027', '100g', 1, 50, 117, FALSE, FALSE),
('BD028', 'Buldak Multi - 2x Spicy', 2, 2, 'BD028', '100g', 1, 50, 118, FALSE, FALSE),
('BD029', 'Buldak Multi - Original', 2, 2, 'BD029', '100g', 1, 50, 119, FALSE, FALSE),
('BD030', 'Buldak Multi - Cheese', 2, 2, 'BD030', '100g', 1, 50, 120, FALSE, FALSE),
('BD031', 'Buldak Multi - Quattro Cheese', 2, 2, 'BD031', '100g', 1, 50, 121, FALSE, FALSE),
('BD032', 'Buldak Multi - Yakisoba', 2, 2, 'BD032', '100g', 1, 50, 122, FALSE, FALSE),
('BD033', 'Buldak Multi - Rose', 2, 2, 'BD033', '100g', 1, 50, 123, FALSE, FALSE),
('V036A01101', 'KSF-Ice Black Tea Drink', 6, 6, 'V036A01101', '500ml', 15, 50, 124, FALSE, FALSE),
('V036A01102', 'KSF-Honey Grapefruit Drink', 6, 6, 'V036A01102', '500ml', 15, 50, 125, FALSE, FALSE),
('V036A01103', 'KSF-Green Tea Drink', 6, 6, 'V036A01103', '500ml', 15, 50, 126, FALSE, FALSE),
('V036A01104', 'KSF-Snow Pear Juice', 6, 6, 'V036A01104', '500ml', 15, 50, 127, FALSE, FALSE),
('V036A01105', 'KSF-Honey Jasmine Tea Drink', 6, 6, 'V036A01105', '500ml', 15, 50, 128, FALSE, FALSE),
('V036A01106', 'KSF-Jasmine Tea Drink', 6, 6, 'V036A01106', '500ml', 15, 50, 129, FALSE, FALSE),
('V036A01108', 'KSF-Syrup of Plum Drink', 6, 6, 'V036A01108', '500ml', 15, 50, 130, FALSE, FALSE),
('V036A01111', 'KSF-Peach Drink', 6, 6, 'V036A01111', '500ml', 15, 50, 131, FALSE, FALSE),
('V036A01112', 'KSF-Mango Ice Black Tea Drink', 6, 6, 'V036A01112', '500ml', 15, 50, 132, FALSE, FALSE),
('V036A01119', 'KSF-Peach Flavor Drink', 6, 6, 'V036A01119', '500ml', 15, 50, 133, FALSE, FALSE),
('V036A01123', 'KSF-Ice Black Tea Drink (Sugar Free)', 6, 6, 'V036A01123', '500ml', 15, 50, 134, FALSE, FALSE),
('V036A04101', 'BBY-Refined Mandarin Soda', 6, 6, 'V036A04101', '248ml', 12, 50, 135, FALSE, FALSE),
('V036A04102', 'BBY-Tangerine Drink', 6, 6, 'V036A04102', '330ml', 24, 40, 136, FALSE, FALSE),
('V036A04103', 'BBY-Orange Drink', 6, 6, 'V036A04103', '330ml', 24, 40, 137, FALSE, FALSE),
('V036A09102', 'WY-Plant Protein Beverage', 6, 6, 'V036A09102', '245ml', 20, 50, 138, FALSE, FALSE),
('V036A09102-2', 'Plant Protein Beverage', 6, 6, 'V036A09102-2', '245ml', 4, 50, 139, FALSE, FALSE),
('V036A11102', 'YS-Coconut Juice', 6, 6, 'V036A11102', '245ml', 24, 40, 140, FALSE, FALSE),
('V036A11103', 'YS-Coconut Juice', 6, 6, 'V036A11103', '1000ml', 12, 50, 141, FALSE, FALSE),
('V036A11104', 'YS-Coconut Juice', 6, 6, 'V036A11104', '1.25L', 6, 50, 142, FALSE, FALSE),
('V036A25101', 'GF-Oolong Tea Original', 6, 6, 'V036A25101', '500ml', 15, 50, 143, FALSE, FALSE),
('V036A25108', 'CF-Tangerine Puerh Unsweetened Tea', 6, 6, 'V036A25108', '500ml', 15, 50, 144, FALSE, FALSE),
('V036A16101', 'MD-Vitamin Drink-Peach', 6, 6, 'V036A16101', '600ml', 15, 50, 145, FALSE, FALSE),
('V036A16102', 'MD-Vitamin Drink-Lime', 6, 6, 'V036A16102', '600ml', 15, 50, 146, FALSE, FALSE),
('V036A16103', 'MD-Vitamin Drink-Orange', 6, 6, 'V036A16103', '600ml', 15, 50, 147, FALSE, FALSE),
('V036A16107', 'MD-Vitamin Drink-Mango', 6, 6, 'V036A16107', '600ml', 15, 50, 148, FALSE, FALSE),
('V036A17102', 'ChaPai-Peach Oolong Tea', 6, 6, 'V036A17102', '500ml', 15, 50, 149, FALSE, FALSE);

INSERT INTO products (id, name, category_id, super_category_id, sku, weight, bags_per_case, cases_per_pallet, sort_order, is_hidden, is_oos) VALUES
('V036A17103', 'ChaPai-Grapefruit Jasmine Tea', 6, 6, 'V036A17103', '500ml', 15, 50, 150, FALSE, FALSE),
('V036A18101', 'TY-Assam Milk Tea Drink (Plain Flavor)', 6, 6, 'V036A18101', '500ml', 15, 50, 151, FALSE, FALSE),
('V036A25109', 'GF FaCha Osmanthus Pu-erh Tea', 6, 6, 'V036A25109', '550ml', 15, 50, 152, FALSE, FALSE),
('V036A21102', 'HCT-Yogurt Drink', 6, 6, 'V036A21102', '330ml', 12, 50, 153, FALSE, FALSE),
('V036A25110', 'GF-Jasmine Unsweetened Tea', 6, 6, 'V036A25110', '500ml', 15, 50, 154, FALSE, FALSE),
('V036A25202', 'GF-Sparkling W WH Peach', 6, 6, 'V036A25202', '480ml', 15, 50, 155, FALSE, FALSE),
('V036A25207', 'GF-Sparkling W Lychee', 6, 6, 'V036A25207', '480ml', 15, 50, 156, FALSE, FALSE),
('V036A37101', 'Sangaria-Grape Flavor Soda', 6, 6, 'V036A37101', '500g', 24, 40, 157, FALSE, FALSE),
('V036A37102', 'Sangaria-Original Flavor Soda', 6, 6, 'V036A37102', '500g', 24, 40, 158, FALSE, FALSE),
('V036A37103', 'Sangaria-Melon Flavor Soda', 6, 6, 'V036A37103', '500g', 24, 40, 159, FALSE, FALSE),
('V036A37301', 'Sangaria WH Grape Pulp Juice', 6, 6, 'V036A37301', '380g', 24, 40, 160, FALSE, FALSE),
('V036A37302', 'Sangaria Mellow Strawberry & Milk', 6, 6, 'V036A37302', '275ml', 24, 40, 161, FALSE, FALSE),
('V036A37401', 'Sangaria-Princess Royal Milk Tea', 6, 6, 'V036A37401', '275g', 24, 40, 162, FALSE, FALSE),
('V036A50103', 'Kimura Peach Flavor Sparkling Water', 6, 6, 'V036A50103', '240ml', 20, 50, 163, FALSE, FALSE),
('V036A50104', 'Kimura Apple Flavor Sparkling Water', 6, 6, 'V036A50104', '240ml', 20, 50, 164, FALSE, FALSE),
('V036A60101', 'Hata Ramune Soda (Original Fla)', 6, 6, 'V036A60101', '200ml', 30, 40, 165, FALSE, FALSE),
('V036A60102', 'Hata Ramune Soda (Strawberry Fla)', 6, 6, 'V036A60102', '200ml', 30, 40, 166, FALSE, FALSE),
('V036A60103', 'Hata Ramune Soda (Cantaloupe)', 6, 6, 'V036A60103', '200ml', 30, 40, 167, FALSE, FALSE),
('V036A60104', 'Hata Ramune Soda (Blueberry Fla)', 6, 6, 'V036A60104', '200ml', 30, 40, 168, FALSE, FALSE),
('V036A60105', 'Hata Ramune Soda (Watermelon Fla)', 6, 6, 'V036A60105', '200ml', 30, 40, 169, FALSE, FALSE),
('V036A60107', 'Hata Ramune Soda (Lychee Fla)', 6, 6, 'V036A60107', '200ml', 30, 40, 170, FALSE, FALSE),
('V036A60108', 'Hata Ramune Soda (Cola Flavor)', 6, 6, 'V036A60108', '200ml', 30, 40, 171, FALSE, FALSE),
('V036B12303-1', 'KITKAT Chocolate Mini Wafer Dark Chocolate Flavor 11pcs', 3, 3, 'V036B12303-1', '11.3g x 11pcs', 1, 50, 172, FALSE, FALSE),
('V036B12304', 'Kitkat-Chocolate Mini Wafer Mocha Fla 11pcs', 3, 3, 'V036B12304', '100g', 1, 50, 173, FALSE, FALSE),
('V036B12305-1', 'KITKAT Chocolate Mini Wafer Strawberry Flavor 10pcs', 3, 3, 'V036B12305-1', '11.6g x 10pcs', 1, 50, 174, FALSE, FALSE),
('V036B12301-1', 'KITKAT Chocolate Mini Wafer Original Flavor 12pcs', 3, 3, 'V036B12301-1', '11.6g x 12pcs', 1, 50, 175, FALSE, FALSE),
('V036B12307', 'KITKAT Chocolate Mini Wafer Milk Tea Flavor 7pcs', 3, 3, 'V036B12307', '12.9g x 7pcs', 1, 50, 176, FALSE, FALSE),
('V036B54102', 'Bourbon Burger Shaped Chocolatey Filled Cookies', 3, 3, 'V036B54102', '66g', 10, 50, 177, FALSE, FALSE),
('V036B58103', 'FUJIYA-Katchkochi Milky Bag', 3, 3, 'V036B58103', '80g', 1, 50, 178, FALSE, FALSE),
('V036B64103-1', 'Orion Turtle Chip Choco Churros', 5, 5, 'V036B64103-1', '160g', 14, 50, 179, FALSE, FALSE),
('V036B53302', 'Glico-Bisco L Bag Assorted 2pcs', 3, 3, 'V036B53302', '100g', 24, 40, 180, FALSE, FALSE),
('V036B64104', 'Orion Korebob Marine Boy (Seaweed Flavored)', 5, 5, 'V036B64104', '40g', 30, 40, 181, FALSE, FALSE),
('V036B64106', 'Orion Choco Boy (Twin Pack)', 5, 5, 'V036B64106', '36g', 2, 50, 182, FALSE, FALSE),
('V036B64107-1', 'Orion FCIO0001 Chocopie', 5, 5, 'V036B64107-1', '39g', 12, 50, 183, FALSE, FALSE),
('V036B65301', 'NS Onion Ring', 5, 5, 'V036B65301', '50g', 20, 50, 184, FALSE, FALSE),
('V036B65201', 'NS Honey Twist Snack', 5, 5, 'V036B65201', '75g', 20, 50, 185, FALSE, FALSE),
('V036B64125', 'Orion Turtle Chips New Hot Spicy', 5, 5, 'V036B64125', '160g', 10, 50, 186, FALSE, FALSE),
('V036B64108', 'Orion Turtle Chips Corn', 5, 5, 'V036B64108', '160g', 12, 50, 187, FALSE, FALSE),
('V036B64109', 'Orion Turtle Chips Truffle Salt', 5, 5, 'V036B64109', '160g', 12, 50, 188, FALSE, FALSE),
('V036B64110', 'Orion Custard Soft Cake', 5, 5, 'V036B64110', '23g', 12, 50, 189, FALSE, FALSE),
('V036B64111', 'Orion FCIO0196 Banana Chocopie', 5, 5, 'V036B64111', '37g', 8, 50, 190, FALSE, FALSE),
('V036B64113', 'Orion FCIO0177 Turtle Chip Flamin Lime', 5, 5, 'V036B64113', '160g', 12, 50, 191, FALSE, FALSE),
('V036B64115', 'Orion FCIO0210 Turtle Chip Seaweed', 5, 5, 'V036B64115', '160g', 12, 50, 192, FALSE, FALSE),
('V036B64118', 'Orion FCIO0225 O''Jelly Soft Grape', 5, 5, 'V036B64118', '66g', 1, 50, 193, FALSE, FALSE),
('V036B64119', 'Orion FCIO0226 O''Jelly Soft Peach', 5, 5, 'V036B64119', '66g', 1, 50, 194, FALSE, FALSE),
('V036B64120', 'Orion FCIO0227 O''Jelly Soft Green Grape', 5, 5, 'V036B64120', '66g', 1, 50, 195, FALSE, FALSE),
('V036B64122', 'Orion Turtle Chips Sour Cream and Onion', 5, 5, 'V036B64122', '160g', 10, 50, 196, FALSE, FALSE),
('V036B64123', 'Orion FCIO0260 O''Tube Honey Butter', 5, 5, 'V036B64123', '115g', 12, 50, 197, FALSE, FALSE),
('V036B64124', 'Orion Turtle Chips Cheese', 5, 5, 'V036B64124', '160g', 10, 50, 198, FALSE, FALSE),
('V036B65103', 'NS Shrimp Cracker', 5, 5, 'V036B65103', '75g', 20, 50, 199, FALSE, FALSE);

INSERT INTO products (id, name, category_id, super_category_id, sku, weight, bags_per_case, cases_per_pallet, sort_order, is_hidden, is_oos) VALUES
('V036B65101', 'NS Shrimp Cracker (Family Pack)', 5, 5, 'V036B65101', '400g', 6, 50, 200, FALSE, FALSE),
('V036B65102', 'NS Shrimp Cracker (Hot & Spicy)', 5, 5, 'V036B65102', '75g', 20, 50, 201, FALSE, FALSE),
('B02214', 'Lay''s Potato Chips (Texas Grilled BBQ)', 1, 1, 'B02214', '70g', 22, 40, 202, FALSE, FALSE),
('B02220', 'Lay''s Korean Kimchi Flavored Potato Chips', 1, 1, 'B02220', '70g', 22, 40, 203, FALSE, FALSE),
('LS-WAVEPORK-01', 'Lay''s Wave Chips (Imitation Charcoal Grilled Pork Belly)', 1, 1, 'LS-WAVEPORK-01', '70g', 20, 50, 204, FALSE, FALSE);

-- SEED: Customers (password: demo1234) + Admin (password: admin123)
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
