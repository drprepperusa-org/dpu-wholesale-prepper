// Database Migration Script
// Usage: node scripts/migrate-db.js
//
// Set environment variables:
//   OLD_DB_URL=postgresql://postgres:PASSWORD@db.OLD-PROJECT.supabase.co:5432/postgres
//   NEW_DB_URL=postgresql://postgres:PASSWORD@db.NEW-PROJECT.supabase.co:5432/postgres

const { Pool } = require('pg');

const OLD_DB_URL = process.env.OLD_DB_URL;
const NEW_DB_URL = process.env.NEW_DB_URL;

if (!OLD_DB_URL || !NEW_DB_URL) {
  console.error('Set OLD_DB_URL and NEW_DB_URL environment variables');
  console.error('Example: OLD_DB_URL=postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres NEW_DB_URL=postgresql://postgres:pass@db.yyy.supabase.co:5432/postgres node scripts/migrate-db.js');
  process.exit(1);
}

const oldPool = new Pool({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
const newPool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  console.log('Connecting to databases...');

  const oldClient = await oldPool.connect();
  const newClient = await newPool.connect();

  try {
    // Tables in dependency order (parents first)
    const tables = [
      'users',
      'super_categories',
      'categories',
      'products',
      'customers',
      'customer_overrides',
      'customer_cat_hidden',
      'orders',
      'order_items',
      'favorites',
      'activity_log',
      'pending_registrations',
      'settings',
      'carts'
    ];

    // Ensure schema exists on new DB (add missing columns)
    console.log('Ensuring schema compatibility...');
    await newClient.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_pack VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_bundle VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_box VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS box_image_url VARCHAR(512);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_image_url VARCHAR(512);
    `);

    for (const table of tables) {
      console.log(`\nMigrating: ${table}...`);

      // Check if table exists in old DB
      const tableCheck = await oldClient.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      if (!tableCheck.rows[0].exists) {
        console.log(`  Skipped (not in old DB)`);
        continue;
      }

      // Get column names from old DB
      const colResult = await oldClient.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      const oldColumns = colResult.rows.map(r => r.column_name);

      // Get column names from new DB
      const newColResult = await newClient.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      const newColumns = new Set(newColResult.rows.map(r => r.column_name));

      // Only use columns that exist in BOTH databases
      const columns = oldColumns.filter(c => newColumns.has(c));
      if (columns.length === 0) {
        console.log(`  Skipped (no matching columns)`);
        continue;
      }

      // Fetch all rows from old DB
      const colList = columns.map(c => `"${c}"`).join(', ');
      const rows = await oldClient.query(`SELECT ${colList} FROM "${table}"`);
      console.log(`  Found ${rows.rows.length} rows (${columns.length} columns)`);

      if (rows.rows.length === 0) continue;

      // Clear existing data in new DB (in reverse dependency order handled by CASCADE)
      await newClient.query(`DELETE FROM "${table}"`);

      // Insert in batches of 50
      const BATCH = 50;
      let inserted = 0;
      for (let i = 0; i < rows.rows.length; i += BATCH) {
        const batch = rows.rows.slice(i, i + BATCH);

        for (const row of batch) {
          const values = columns.map(c => row[c]);
          const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

          try {
            await newClient.query(
              `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              values
            );
            inserted++;
          } catch (e) {
            console.error(`  Error inserting row: ${e.message}`);
          }
        }
      }
      console.log(`  Inserted ${inserted} rows`);
    }

    // Reset sequences
    console.log('\nResetting sequences...');
    const sequences = [
      ['super_categories_id_seq', 'super_categories'],
      ['categories_id_seq', 'categories'],
      ['users_id_seq', 'users'],
      ['customer_overrides_id_seq', 'customer_overrides'],
      ['customer_cat_hidden_id_seq', 'customer_cat_hidden'],
      ['favorites_id_seq', 'favorites'],
      ['order_items_id_seq', 'order_items'],
      ['activity_log_id_seq', 'activity_log'],
    ];

    for (const [seq, table] of sequences) {
      try {
        await newClient.query(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1)`);
        console.log(`  Reset ${seq}`);
      } catch (e) {
        console.log(`  Skipped ${seq}: ${e.message}`);
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    oldClient.release();
    newClient.release();
    await oldPool.end();
    await newPool.end();
  }
}

migrate();
