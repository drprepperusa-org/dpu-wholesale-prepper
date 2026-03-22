#!/usr/bin/env node

const pg = require('pg');
const PRODS = require('./prods-data.js');
require('dotenv').config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drprepper_wholesale',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function seedProducts() {
  try {
    console.log('Starting product seeding...\n');

    // Check if data already exists
    const existingCheck = await pool.query('SELECT COUNT(*) FROM products');
    if (existingCheck.rows[0].count > 0) {
      console.log(`Products already exist (${existingCheck.rows[0].count}). Clearing...`);
      await pool.query('DELETE FROM products');
    }

    // Get all categories mapped by name
    const catResult = await pool.query(`
      SELECT 
        c.id,
        c.name as cat_name,
        c.super_category_id,
        sc.name as super_cat_name
      FROM categories c
      JOIN super_categories sc ON c.super_category_id = sc.id
      ORDER BY sc.name, c.name
    `);

    // Build a map: super_cat_name + cat_name -> {category_id, super_category_id}
    const categoryMap = {};
    catResult.rows.forEach(row => {
      const key = `${row.super_cat_name}|${row.cat_name}`;
      categoryMap[key] = {
        categoryId: row.id,
        superCategoryId: row.super_category_id
      };
    });

    console.log(`Found ${catResult.rows.length} categories in database\n`);

    // Insert products
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < PRODS.length; i++) {
      const prod = PRODS[i];
      const key = `${prod.super}|${prod.cat}`;

      if (!categoryMap[key]) {
        console.error(`❌ [${i}] Missing category mapping: ${key}`);
        errorCount++;
        continue;
      }

      const catData = categoryMap[key];

      try {
        const imageUrl = prod.img !== undefined ? `/images/products/product-${String(prod.img).padStart(3, '0')}.jpg` : null;
        
        await pool.query(
          `INSERT INTO products 
           (id, name, weight, bags_per_case, category_id, super_category_id, image_url, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            prod.id,
            prod.name,
            prod.weight || null,
            prod.pack || null,
            catData.categoryId,
            catData.superCategoryId,
            imageUrl,
            i
          ]
        );
        successCount++;
        
        if ((i + 1) % 50 === 0) {
          process.stdout.write(`  [${i + 1}/${PRODS.length}] ${successCount} inserted, ${errorCount} errors\r`);
        }
      } catch (err) {
        console.error(`\n❌ [${i}] Error inserting product ${prod.id}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Product seeding complete!`);
    console.log(`\nSummary:`);
    console.log(`  Total processed: ${PRODS.length}`);
    console.log(`  Successfully inserted: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);

    // Show product counts by super category
    const summary = await pool.query(`
      SELECT 
        sc.name,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT c.id) as category_count
      FROM super_categories sc
      LEFT JOIN categories c ON sc.id = c.super_category_id
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY sc.id, sc.name
      ORDER BY sc.name
    `);

    console.log(`\nProducts by Super Category:`);
    summary.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.product_count} products in ${row.category_count} categories`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Fatal error:', err);
    await pool.end();
    process.exit(1);
  }
}

seedProducts();
