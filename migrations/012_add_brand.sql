-- Add brand column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
