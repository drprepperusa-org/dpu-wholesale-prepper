-- Migration 003: Phase 1 — Password Reset & Expiry
-- Adds: reset_token columns, password_changed_at for expiry policy, SKU unique constraint, full-text search index

-- ========================
-- PASSWORD RESET TOKENS
-- ========================

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP NULL;

-- Index for efficient reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- ========================
-- PASSWORD EXPIRY TRACKING
-- ========================

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT NOW();

-- Index for password expiry checks
CREATE INDEX IF NOT EXISTS idx_users_password_changed ON users(password_changed_at);

-- ========================
-- SKU UNIQUE CONSTRAINT
-- ========================

-- Add unique constraint to SKU column
ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS products_sku_unique UNIQUE(sku);

-- Index already exists from schema creation, but ensure it's present
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- ========================
-- FULL-TEXT SEARCH INDEX
-- ========================

-- PostgreSQL full-text search index for products (name + SKU)
-- Using GiST index for better performance on larger datasets
CREATE INDEX IF NOT EXISTS products_search_idx ON products USING gist(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(sku, '')));
