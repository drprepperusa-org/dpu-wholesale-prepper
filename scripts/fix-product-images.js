const PRODS = require('./products.json'); // You'll need to export the PRODS array to a JSON file

/**
 * Generate SQL to fix product-image assignments
 * Maps each product to the CORRECT image based on the PRODS array
 */
function generateImageMappingSQL() {
  const updates = [];
  
  PRODS.forEach(product => {
    // The correct image is based on the product's img property
    const correctImageNum = String(product.img).padStart(3, '0');
    const imageExt = product.img < 205 ? (product.img % 2 === 0 ? 'jpg' : 'png') : 'jpg';
    const correctImageUrl = `/images/products/product-${correctImageNum}.${imageExt}`;
    
    updates.push(
      `UPDATE products SET image_url = '${correctImageUrl}' WHERE product_id = '${product.id}';`
    );
  });
  
  return updates;
}

/**
 * Generate a mapping CSV for verification
 */
function generateMappingCSV() {
  const csv = ['product_id,product_name,img_index,correct_image_file'];
  
  PRODS.forEach(product => {
    const correctImageNum = String(product.img).padStart(3, '0');
    const imageExt = product.img < 205 ? (product.img % 2 === 0 ? 'jpg' : 'png') : 'jpg';
    const imageFile = `product-${correctImageNum}.${imageExt}`;
    
    csv.push(`"${product.id}","${product.name.replace(/"/g, '""')}",${product.img},${imageFile}`);
  });
  
  return csv.join('\n');
}

// Generate SQL
const sqlUpdates = generateImageMappingSQL();
const sqlScript = `-- Fix Product-Image Assignments
-- Generated: ${new Date().toISOString()}
-- Total updates: ${sqlUpdates.length}

BEGIN TRANSACTION;

${sqlUpdates.join('\n')}

COMMIT;`;

// Generate CSV mapping
const csvMapping = generateMappingCSV();

console.log('=== SQL UPDATE SCRIPT ===\n');
console.log(sqlScript);
console.log('\n=== CSV MAPPING ===\n');
console.log(csvMapping);

// Export for file writing
module.exports = { sqlScript, csvMapping };
