#!/usr/bin/env node

const pg = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drprepper_wholesale',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Category structure extracted from HTML
const CATEGORY_STRUCTURE = {
  'Chips & Savory Snacks': {
    emoji: '🥔',
    order: 1,
    categories: [
      { name: 'Lay\'s Potato Chips', order: 1 },
      { name: 'Lay\'s Wave Chips', order: 2 },
      { name: 'Lay\'s Yam Chips', order: 3 },
      { name: 'Cheetos & Corn Sticks', order: 4 },
      { name: 'Weilong Crispy Fire Snacks', order: 5 },
      { name: 'LYFEN Rice Chips', order: 6 }
    ]
  },
  'Noodles & Rice': {
    emoji: '🍜',
    order: 2,
    categories: [
      { name: 'XWX Snack Noodles', order: 1 },
      { name: 'Buldak Chips & Snacks', order: 2 },
      { name: 'Buldak Big Bowls', order: 3 },
      { name: 'Buldak Cups', order: 4 },
      { name: 'Buldak Spicy Dumplings & Rice', order: 5 },
      { name: 'Buldak Multi-Packs', order: 6 }
    ]
  },
  'Cookies & Wafers': {
    emoji: '🍪',
    order: 3,
    categories: [
      { name: 'ZX Crackers & Biscuits', order: 1 },
      { name: 'Nestle Cuicuisha Wafers', order: 2 },
      { name: 'KitKat Chocolate', order: 3 },
      { name: 'MILO Cookies', order: 4 },
      { name: 'Japanese & Korean Cookies', order: 5 }
    ]
  },
  'Candy & Jelly': {
    emoji: '🍬',
    order: 4,
    categories: [
      { name: 'XFJ Marshmallows & Candy', order: 1 },
      { name: 'HSU FU CHI Snacks', order: 2 },
      { name: 'XFJ Gummy & Fruit Snacks', order: 3 },
      { name: 'EC Herbal Jelly', order: 4 }
    ]
  },
  'Ice Cream': {
    emoji: '🍦',
    order: 5,
    categories: [
      { name: 'Ice Cream', order: 1 }
    ]
  },
  'Beverages': {
    emoji: '🥤',
    order: 6,
    categories: [
      { name: 'KSF Beverages', order: 1 },
      { name: 'BBY Beverages', order: 2 },
      { name: 'WY & YS Beverages', order: 3 },
      { name: 'GF Tea & Sparkling', order: 4 },
      { name: 'MD Vitamin Drinks', order: 5 },
      { name: 'ChaPai & TY Tea', order: 6 },
      { name: 'HCT Yogurt', order: 7 },
      { name: 'Sangaria Beverages', order: 8 },
      { name: 'Kimura Sparkling Water', order: 9 },
      { name: 'Hata Ramune Soda', order: 10 }
    ]
  },
  'Korean Snacks': {
    emoji: '🇰🇷',
    order: 7,
    categories: [
      { name: 'Orion Snacks', order: 1 },
      { name: 'NS Korean Snacks', order: 2 }
    ]
  }
};

async function seedCategories() {
  try {
    console.log('Starting category seeding...\n');

    // Check if data already exists
    const existingCheck = await pool.query('SELECT COUNT(*) FROM super_categories');
    if (existingCheck.rows[0].count > 0) {
      console.log('Categories already exist. Clearing...');
      await pool.query('DELETE FROM categories');
      await pool.query('DELETE FROM super_categories');
    }

    // Insert super categories
    for (const [superName, superData] of Object.entries(CATEGORY_STRUCTURE)) {
      console.log(`📌 Inserting super category: ${superData.emoji} ${superName}`);
      
      const result = await pool.query(
        'INSERT INTO super_categories (name, sort_order) VALUES ($1, $2) RETURNING id',
        [superName, superData.order]
      );
      
      const superCatId = result.rows[0].id;

      // Insert sub-categories
      for (const subCat of superData.categories) {
        console.log(`   └─ ${subCat.name}`);
        
        await pool.query(
          'INSERT INTO categories (name, super_category_id, sort_order) VALUES ($1, $2, $3)',
          [subCat.name, superCatId, subCat.order]
        );
      }
    }

    console.log('\n✅ Category seeding complete!');
    
    // Show summary
    const superCount = await pool.query('SELECT COUNT(*) FROM super_categories');
    const catCount = await pool.query('SELECT COUNT(*) FROM categories');
    
    console.log(`\nSummary:`);
    console.log(`  Super Categories: ${superCount.rows[0].count}`);
    console.log(`  Sub Categories: ${catCount.rows[0].count}`);

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err);
    await pool.end();
    process.exit(1);
  }
}

seedCategories();
