#!/usr/bin/env node

const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drprepper_wholesale',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function migrate() {
  try {
    console.log('🔄 Adding price column to products table...\n');

    // Check if price column already exists
    const checkColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='products' AND column_name='price'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Price column already exists. Nothing to do.');
      await pool.end();
      process.exit(0);
    }

    // Add price column with default value
    console.log('Adding price column...');
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN price DECIMAL(10, 2) DEFAULT 25.00
    `);

    console.log('✅ Price column added successfully!');
    console.log('\nSummary:');
    console.log('  - Added price DECIMAL(10, 2) column');
    console.log('  - Default value: $25.00');
    console.log('  - All existing products now have a price of $25.00');

    await pool.end();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

migrate();
