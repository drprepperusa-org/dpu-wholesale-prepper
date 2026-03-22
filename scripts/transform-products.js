// Transform product data from HTML format to database format
const fs = require('fs');

// Mapping of super categories to IDs
const superCategoryMap = {
  'Chips & Savory Snacks': 1,
  'Noodles & Rice': 2,
  'Cookies & Wafers': 3,
  'Candy & Jelly': 4,
  'Korean Snacks': 5,
  'Beverages': 6,
  'Ice Cream': 7
};

// Read the raw products JSON from HTML extraction
const rawData = fs.readFileSync('./scripts/products_raw.json', 'utf8');
const htmlProds = JSON.parse(rawData);

// Transform to database format
const dbProds = htmlProds.map((p, idx) => {
  const superCatId = superCategoryMap[p.super] || 1;
  const weight = p.weight || '';
  
  // Default pack sizes for common patterns
  let bagsPerCase = 1;
  let casesPerPallet = 1;
  
  if (p.pack) {
    // Parse common pack patterns
    const match = p.pack.match(/(\d+)(?:bags|boxes|btls|cans|pcs)/i);
    if (match) {
      bagsPerCase = parseInt(match[1]);
    }
    
    // Assume standard pallet quantities
    if (bagsPerCase <= 20) casesPerPallet = 50;
    else if (bagsPerCase <= 50) casesPerPallet = 40;
    else casesPerPallet = 30;
  }

  return {
    id: p.id || `PROD-${idx}`,
    name: p.name,
    sku: p.id,
    weight: weight,
    bags_per_case: bagsPerCase,
    cases_per_pallet: casesPerPallet,
    category_id: superCatId,
    sort_order: idx,
    is_hidden: false,
    is_oos: false
  };
});

// Write transformed data
fs.writeFileSync('./scripts/products_transformed.json', JSON.stringify(dbProds, null, 2));
console.log(`Transformed ${dbProds.length} products`);
console.log('Sample:', JSON.stringify(dbProds[0], null, 2));
