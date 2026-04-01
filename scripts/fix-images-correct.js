#!/usr/bin/env node
/**
 * Extract PRODS array from HTML, get correct img mappings, and fix database
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const htmlPath = '/Users/djmac/Downloads/02_customer_portal (2).html';
const dbConfig = {
  user: process.env.DB_USER || 'djmac',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'drprepper_wholesale'
};

// Step 1: Extract PRODS array from HTML
console.log('📖 Reading HTML file...');
const html = fs.readFileSync(htmlPath, 'utf8');
const prodsMatch = html.match(/const PRODS=\[([\s\S]*?)\];/);
if (!prodsMatch) throw new Error('PRODS array not found in HTML');

// Parse PRODS array
const prodsStr = `[${prodsMatch[1]}]`;
let prods;
try {
  prods = eval(prodsStr);
} catch (e) {
  throw new Error(`Failed to parse PRODS: ${e.message}`);
}

console.log(`✅ Extracted ${prods.length} products from HTML`);
if (prods.length !== 205) {
  console.warn(`⚠️  Expected 205 products, got ${prods.length}`);
}

// Build mapping: product_id -> correct_image_index
const correctMapping = {};
prods.forEach((prod, idx) => {
  correctMapping[prod.id] = prod.img;
});

console.log(`📊 Correct mapping built (${Object.keys(correctMapping).length} products)`);

// Step 2: Connect to database
const pool = new Pool(dbConfig);

async function main() {
  try {
    // Get current state
    console.log('🔍 Querying current database state...');
    const res = await pool.query('SELECT id, image_url FROM products ORDER BY id');
    const currentProducts = res.rows;
    
    console.log(`✅ Got ${currentProducts.length} products from database`);
    
    // Find mismatches
    const updates = [];
    let mismatchCount = 0;
    
    currentProducts.forEach(dbProd => {
      const correctImg = correctMapping[dbProd.id];
      if (correctImg === undefined) {
        console.warn(`⚠️  ${dbProd.id} not in PRODS array`);
        return;
      }
      
      const correctUrl = `/images/products/product-${String(correctImg).padStart(3, '0')}.jpg`;
      if (dbProd.image_url !== correctUrl) {
        mismatchCount++;
        updates.push({
          id: dbProd.id,
          oldUrl: dbProd.image_url,
          newUrl: correctUrl
        });
      }
    });
    
    console.log(`\n🔴 Found ${mismatchCount} products with wrong images`);
    
    if (mismatchCount === 0) {
      console.log('✅ All images are already correct!');
      await pool.end();
      process.exit(0);
    }
    
    // Show sample mismatches
    console.log('\n📋 Sample mismatches:');
    updates.slice(0, 10).forEach(u => {
      console.log(`  ${u.id}: ${u.oldUrl} → ${u.newUrl}`);
    });
    if (updates.length > 10) {
      console.log(`  ... and ${updates.length - 10} more`);
    }
    
    // Step 3: Execute updates
    console.log(`\n⚡ Executing ${updates.length} updates...`);
    const start = Date.now();
    
    // Build transaction
    let updateSql = 'BEGIN TRANSACTION;\n';
    updates.forEach(u => {
      const escapedUrl = u.newUrl.replace(/'/g, "''");
      updateSql += `UPDATE products SET image_url = '${escapedUrl}' WHERE id = '${u.id}';\n`;
    });
    updateSql += 'COMMIT;';
    
    // Execute
    await pool.query(updateSql);
    const elapsed = Date.now() - start;
    
    console.log(`✅ Completed in ${elapsed}ms`);
    
    // Step 4: Verify
    console.log('\n🔐 Verifying...');
    const verifyRes = await pool.query('SELECT COUNT(*) as total FROM products WHERE image_url LIKE \'/images/products/product-%.jpg\'');
    const count = parseInt(verifyRes.rows[0].total, 10);
    
    console.log(`✅ ${count}/205 products have correct image URLs`);
    
    if (count !== 205) {
      console.error('❌ Verification failed - not all products updated!');
    } else {
      console.log('🎉 All images successfully reassigned!');
    }
    
    // Show new state of first 5 products
    console.log('\n📸 Sample of updated products:');
    const sampleRes = await pool.query('SELECT id, image_url FROM products LIMIT 5');
    sampleRes.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.image_url}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
