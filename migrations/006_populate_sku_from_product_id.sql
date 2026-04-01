-- Migration 006: Populate SKU from product ID for all products
-- Purpose: Set missing SKU values using product ID as the SKU
-- This provides unique identifiers for inventory/order tracking

UPDATE products 
SET sku = id 
WHERE sku IS NULL;

-- Verify migration
-- SELECT COUNT(*) as null_skus FROM products WHERE sku IS NULL;
-- Should return 0 after successful migration
