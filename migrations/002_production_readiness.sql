-- Migration 002: Production Readiness
-- Adds: indexes, users table, login_attempts, admin_activity_log enhancements

-- ========================
-- PHASE 1: INDEXES
-- ========================

-- Index on categories.is_hidden for fast visibility filtering
CREATE INDEX IF NOT EXISTS idx_categories_is_hidden ON categories(is_hidden);

-- Index on products.created_at for time-based sorting
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Composite index for product filtering (visibility + category)
CREATE INDEX IF NOT EXISTS idx_products_filter ON products(is_hidden, is_oos, category_id);

-- Index on products.super_category_id for fast joins (may already exist, use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_products_super_cat ON products(super_category_id);

-- Index on activity_log.type for filtering
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(type);

-- Index on activity_log.created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC);

-- ========================
-- PHASE 2: USERS TABLE (role-based access)
-- ========================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'view-only' CHECK (role IN ('admin', 'sales', 'view-only')),
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ========================
-- PHASE 2: LOGIN ATTEMPTS (rate limiting support)
-- ========================

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, created_at);

-- ========================
-- PHASE 1: ENHANCE activity_log
-- ========================

-- Add admin_id column to track which admin performed the action
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS admin_id VARCHAR(50);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Make customer_id nullable (admin actions may not have a customer context)
ALTER TABLE activity_log ALTER COLUMN customer_id DROP NOT NULL;

-- Index for admin_id lookups
CREATE INDEX IF NOT EXISTS idx_activity_admin_id ON activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
