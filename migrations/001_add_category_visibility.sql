-- Migration: Add is_hidden column to categories table
-- This migration adds the is_hidden column to the categories table for category-level visibility control

-- Add is_hidden column to categories table if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Verify the column was added
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_hidden';
