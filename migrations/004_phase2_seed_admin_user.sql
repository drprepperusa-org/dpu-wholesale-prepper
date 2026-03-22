-- Migration 004: Phase 2 — Seed admin user in users table
-- Run this AFTER seeding the customers table (which contains admin@drprepper.com)
-- This creates a users-table entry for the admin with the same password hash

-- Copy admin@drprepper.com from customers table into users table
-- with role='admin'. Uses ON CONFLICT so it's safe to re-run.
INSERT INTO users (id, email, password_hash, role, active)
SELECT gen_random_uuid()::text, email, password_hash, 'admin', true
FROM customers
WHERE email = 'admin@drprepper.com'
ON CONFLICT (email) DO UPDATE SET role = 'admin', active = TRUE;

-- Optional: add more staff users here with INSERT statements
-- Example:
-- INSERT INTO users (id, email, password_hash, role, active)
-- VALUES (gen_random_uuid()::text, 'sales@drprepper.com', '<bcrypt_hash>', 'sales', true)
-- ON CONFLICT (email) DO NOTHING;
