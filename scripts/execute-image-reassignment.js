#!/usr/bin/env node

/**
 * Execute Product-Image Reassignment
 * 
 * This script reads the SQL fix file and executes it against the drprepper database.
 * Run: node scripts/execute-image-reassignment.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function executeImageReassignment() {
  const sqlFile = path.join(__dirname, '..', 'sql', '001-fix-product-image-assignments.sql');
  
  if (!fs.existsSync(sqlFile)) {
    log(colors.red, `✗ SQL file not found: ${sqlFile}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
  
  const pool = new Pool({
    user: process.env.DB_USER || 'djmac',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'drprepper_wholesale',
  });

  try {
    log(colors.blue, '📦 Connecting to drprepper database...');
    const connection = await pool.connect();
    
    log(colors.blue, '🔄 Executing product-image reassignment SQL...');
    const startTime = Date.now();
    
    // Execute the entire SQL script
    await connection.query(sqlContent);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    log(colors.green, `✓ SQL executed successfully in ${elapsed}s`);
    
    // Verify the update
    log(colors.blue, '📊 Verifying updates...');
    const result = await connection.query(
      "SELECT COUNT(*) as total FROM products WHERE image_url LIKE '/images/products/product-%.jpg'"
    );
    
    const correctedCount = result.rows[0].total;
    log(colors.green, `✓ Total products with corrected image URLs: ${correctedCount}`);
    
    if (correctedCount === 205) {
      log(colors.green, '✓ SUCCESS: All 205 products have correct image assignments!');
    } else {
      log(colors.yellow, `⚠ WARNING: Expected 205 corrected products, found ${correctedCount}`);
    }
    
    // Sample verification
    log(colors.blue, '📋 Sample verification (first 5 products):');
    const sampleResult = await connection.query(
      `SELECT id, name, image_url FROM products ORDER BY created_at LIMIT 5`
    );
    sampleResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.id}: ${row.name}`);
      console.log(`     → ${row.image_url}`);
    });
    
    connection.release();
    log(colors.green, '\n✓ Product-image reassignment complete!');
    log(colors.blue, '📌 Next steps:');
    log(colors.blue, '   1. Restart Node.js server: npm start');
    log(colors.blue, '   2. Visit https://wholesale.drprepperusa.com');
    log(colors.blue, '   3. Verify product images display correctly');
    
  } catch (error) {
    log(colors.red, `✗ Error executing reassignment: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeImageReassignment();
