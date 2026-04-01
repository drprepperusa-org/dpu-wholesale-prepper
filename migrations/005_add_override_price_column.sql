-- Migration 005: Add override_price column to customer_overrides table
-- Enables per-customer product price overrides for wholesale portal

-- Add override_price column to customer_overrides
ALTER TABLE customer_overrides
ADD COLUMN override_price DECIMAL(10, 2) DEFAULT NULL;

-- Add index for performance on customer overrides queries
CREATE INDEX idx_customer_overrides_with_price 
ON customer_overrides(customer_id, product_id, override_price) 
WHERE override_price IS NOT NULL;
