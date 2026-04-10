const pg = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'drprepper_wholesale',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

const SUPER_CATS = [
  { id: 1, name: "Chips & Savory Snacks" },
  { id: 2, name: "Noodles & Rice" },
  { id: 3, name: "Cookies & Wafers" },
  { id: 4, name: "Candy & Jelly" },
  { id: 5, name: "Korean Snacks" },
  { id: 6, name: "Beverages" },
  { id: 7, name: "Ice Cream" }
];

const CATEGORIES = [
  // Chips & Savory Snacks
  { id: 1, name: "Lay's Potato Chips", super_id: 1 },
  { id: 2, name: "Lay's Wave Chips", super_id: 1 },
  { id: 3, name: "Lay's Yam Chips", super_id: 1 },
  { id: 4, name: "Cheetos", super_id: 1 },
  { id: 5, name: "Doritos", super_id: 1 },
  { id: 6, name: "Pringles", super_id: 1 },
  // Noodles & Rice
  { id: 7, name: "Samyang Noodles", super_id: 2 },
  { id: 8, name: "Nongshim Noodles", super_id: 2 },
  { id: 9, name: "Ottogi Noodles", super_id: 2 },
  { id: 10, name: "Instant Rice", super_id: 2 },
  // Cookies & Wafers
  { id: 11, name: "Choco Pie", super_id: 3 },
  { id: 12, name: "Wafer Cookies", super_id: 3 },
  { id: 13, name: "Cream Cookies", super_id: 3 },
  // Candy & Jelly
  { id: 14, name: "Hard Candy", super_id: 4 },
  { id: 15, name: "Gummy Candy", super_id: 4 },
  { id: 16, name: "Jelly Products", super_id: 4 },
  // Korean Snacks
  { id: 17, name: "Tteokbokki", super_id: 5 },
  { id: 18, name: "Korean Crackers", super_id: 5 },
  { id: 19, name: "Seaweed Snacks", super_id: 5 },
  // Beverages
  { id: 20, name: "Bottled Drinks", super_id: 6 },
  { id: 21, name: "Powdered Drinks", super_id: 6 },
  // Ice Cream
  { id: 22, name: "Frozen Desserts", super_id: 7 },
];

// Sample products - WILL BE REPLACED with imported CSV/JSON
const SAMPLE_PRODUCTS = [
  { category_id: 1, name: "Lay's Classic Potato Chips", sku: "LAYS001", weight: "155g", bags_per_case: 24, cases_per_pallet: 60 },
  { category_id: 2, name: "Lay's Wavy Chips", sku: "LAYS002", weight: "155g", bags_per_case: 24, cases_per_pallet: 60 },
  { category_id: 7, name: "Samyang Hot Ramen", sku: "SAMY001", weight: "120g", bags_per_case: 30, cases_per_pallet: 60 },
];

async function importProducts(filePath) {
  console.log(`📥 Importing products from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const ext = path.extname(filePath).toLowerCase();
  let products = [];
  
  if (ext === '.json') {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    products = Array.isArray(data) ? data : data.products || [];
  } else if (ext === '.csv') {
    // Simple CSV parser (no external dependency)
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const product = {};
      
      headers.forEach((header, idx) => {
        let value = values[idx];
        // Convert numeric fields
        if (['category_id', 'bags_per_case', 'cases_per_pallet'].includes(header)) {
          product[header] = parseInt(value, 10);
        } else {
          product[header] = value;
        }
      });
      
      products.push(product);
    }
  } else {
    throw new Error('Unsupported file format. Use .json or .csv');
  }
  
  console.log(`✅ Loaded ${products.length} products`);
  return products;
}

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seed...\n');
    
    // Clear existing data (reverse foreign key order)
    console.log('🗑️  Clearing existing data...');
    await client.query('TRUNCATE activity_log, favorites, order_items, orders, customer_cat_hidden, customer_overrides, products, categories, customers, pending_registrations, settings, super_categories CASCADE');
    
    // Seed super-categories
    console.log('➕ Seeding super-categories...');
    for (const sc of SUPER_CATS) {
      await client.query(
        'INSERT INTO super_categories (id, name, sort_order) VALUES ($1, $2, $3)',
        [sc.id, sc.name, sc.id]
      );
    }
    console.log(`   ✅ ${SUPER_CATS.length} super-categories added`);
    
    // Seed categories
    console.log('➕ Seeding categories...');
    for (const cat of CATEGORIES) {
      await client.query(
        'INSERT INTO categories (id, name, super_category_id, sort_order) VALUES ($1, $2, $3, $4)',
        [cat.id, cat.name, cat.super_id, cat.id]
      );
    }
    console.log(`   ✅ ${CATEGORIES.length} categories added`);
    
    // Seed products
    console.log('➕ Seeding products...');
    let productsToSeed = SAMPLE_PRODUCTS;
    
    // Check for CSV/JSON in scripts directory
    const csvPath = path.join(__dirname, 'products.csv');
    const jsonPath = path.join(__dirname, 'products.json');
    
    if (fs.existsSync(csvPath)) {
      productsToSeed = await importProducts(csvPath);
    } else if (fs.existsSync(jsonPath)) {
      productsToSeed = await importProducts(jsonPath);
    } else {
      console.log('   ⚠️  No products.csv or products.json found. Using sample products.');
      console.log('   📝 To import your product list:');
      console.log('      1. Create scripts/products.csv or scripts/products.json');
      console.log('      2. CSV format: category_id,name,sku,weight,bags_per_case,cases_per_pallet');
      console.log('      3. Run: npm run seed');
    }
    
    // Create category -> super_category mapping
    const catToSuper = {};
    for (const cat of CATEGORIES) {
      catToSuper[cat.id] = cat.super_id;
    }
    
    let sortOrder = 1;
    for (const prod of productsToSeed) {
      // Validate required fields
      if (!prod.category_id || !prod.name || !prod.sku) {
        console.warn(`   ⚠️  Skipping invalid product:`, prod);
        continue;
      }
      
      const superCatId = catToSuper[prod.category_id] || 1; // Default to 1 if not found
      
      await client.query(
        `INSERT INTO products 
         (id, name, category_id, sku, weight, bags_per_case, cases_per_pallet, sort_order, super_category_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          prod.id || prod.sku,
          prod.name,
          prod.category_id,
          prod.sku,
          prod.weight || '100g',
          prod.bags_per_case || 24,
          prod.cases_per_pallet || 60,
          sortOrder++,
          superCatId
        ]
      );
    }
    console.log(`   ✅ ${productsToSeed.length} products added`);
    
    // Seed demo customers
    console.log('➕ Seeding demo customers...');
    const demoPassword = 'demo1234';
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    
    const demoCustomers = [
      {
        id: 'c1',
        company_name: 'Happy Snacks Co.',
        contact_name: 'John Buyer',
        email: 'buyer@happysnacks.com',
        phone: '(555) 123-4567',
        address: '123 Snack St, LA, CA 90001',
        view_preset: 'full'
      },
      {
        id: 'c2',
        company_name: 'Pacific Rim Imports',
        contact_name: 'Sarah Pacific',
        email: 'sarah@pacificrimports.com',
        phone: '(555) 234-5678',
        address: '456 Import Ave, SF, CA 94105',
        view_preset: 'chips'
      },
      {
        id: 'c3',
        company_name: 'Seoul Garden',
        contact_name: 'Min Park',
        email: 'min@seoulgardenusa.com',
        phone: '(555) 345-6789',
        address: '789 Korean Way, NYC, NY 10001',
        view_preset: 'korean'
      },
      {
        id: 'c4',
        company_name: 'Sunshine Mart',
        contact_name: 'Maria Sunshine',
        email: 'maria@sunshinemart.com',
        phone: '(555) 456-7890',
        address: '321 Sunny Blvd, Houston, TX 77001',
        view_preset: 'noodles'
      },
      {
        id: 'c5',
        company_name: 'Test Account',
        contact_name: 'Test User',
        email: 'test@example.com',
        phone: '(555) 999-9999',
        address: '999 Test Lane, Test City, TS 99999',
        view_preset: 'full'
      }
    ];
    
    for (const cust of demoCustomers) {
      await client.query(
        `INSERT INTO customers 
         (id, company_name, contact_name, email, phone, address_line1, view_preset, password_hash, active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [cust.id, cust.company_name, cust.contact_name, cust.email, cust.phone, cust.address, cust.view_preset, hashedPassword, true]
      );
    }
    console.log(`   ✅ ${demoCustomers.length} demo customers added (password: demo1234)`);
    
    // Add admin user
    console.log('➕ Seeding admin user...');
    const adminPassword = 'admin123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO customers 
       (id, company_name, contact_name, email, phone, address_line1, view_preset, password_hash, active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      ['admin', 'Admin', 'DJ', process.env.ADMIN_EMAIL || 'admin@drprepper.com', '(555) 000-0000', 'Admin Address', 'full', adminHashedPassword, true]
    );
    console.log(`   ✅ Admin user added (email: ${process.env.ADMIN_EMAIL || 'admin@drprepper.com'})`);
    
    // Seed visibility presets
    console.log('➕ Configuring customer visibility presets...');
    
    // c2 (Pacific Rim): Chips only (hide non-chip categories)
    const nonChipCats = [2, 3, 4, 5, 6, 7]; // Hide Noodles, Cookies, Candy, Korean, Beverages, Ice Cream
    for (const catId of nonChipCats) {
      await client.query(
        'INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES ($1, $2)',
        ['c2', catId]
      );
    }
    
    // c3 (Seoul Garden): Korean only
    const nonKoreanCats = [1, 2, 3, 4, 6, 7];
    for (const catId of nonKoreanCats) {
      await client.query(
        'INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES ($1, $2)',
        ['c3', catId]
      );
    }
    
    // c4 (Sunshine Mart): Noodles only
    const nonNoodleCats = [1, 3, 4, 5, 6, 7];
    for (const catId of nonNoodleCats) {
      await client.query(
        'INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES ($1, $2)',
        ['c4', catId]
      );
    }
    
    console.log('   ✅ Visibility presets configured');
    
    // Seed settings
    console.log('➕ Seeding default settings...');
    const settings = [
      { key: 'allow_registration', value: 'true' },
      { key: 'allow_guest_checkout', value: 'false' },
      { key: 'require_approval', value: 'true' }
    ];
    
    for (const setting of settings) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2)',
        [setting.key, setting.value]
      );
    }
    console.log(`   ✅ ${settings.length} settings added`);
    
    console.log('\n✨ Database seeded successfully!\n');
    console.log('📋 Demo Credentials:');
    console.log('   Email: buyer@happysnacks.com | Password: demo1234');
    console.log('   Email: admin@drprepper.com   | Password: admin123');
    console.log('\n🔗 Start server with: npm start');
    
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
