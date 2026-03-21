const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drprepper_wholesale',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function populateImageUrls() {
  try {
    console.log('Starting image URL population...');
    
    // Get all products
    const result = await pool.query('SELECT id, sort_order FROM products ORDER BY sort_order ASC');
    const products = result.rows;
    
    console.log(`Found ${products.length} products to update`);
    
    let updated = 0;
    let errors = 0;
    
    for (const product of products) {
      try {
        const imageIndex = product.sort_order;
        const imageUrl = `/images/products/product-${String(imageIndex).padStart(3, '0')}.jpg`;
        
        await pool.query(
          'UPDATE products SET image_url = $1 WHERE id = $2',
          [imageUrl, product.id]
        );
        
        updated++;
        if (updated % 50 === 0) console.log(`  Updated ${updated} products...`);
      } catch (err) {
        console.error(`Failed to update product ${product.id}:`, err.message);
        errors++;
      }
    }
    
    console.log(`\n✓ Complete: ${updated} products updated, ${errors} errors`);
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

populateImageUrls();
