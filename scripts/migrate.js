const pg = require('pg');
const fs = require('fs');
const path = require('path');
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

async function runSqlFile(client, filePath, label) {
  console.log(`\n📄 Running ${label}...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await client.query(sql);
    console.log(`   ✅ ${label} done`);
  } catch (err) {
    console.error(`   ⚠️  ${label} error:`, err.message);
    // Continue on errors (e.g. "already exists") so partial migrations don't block
  }
}

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('📦 Running schema + all migrations...');
    console.log(`🔗 Target: ${process.env.DATABASE_URL ? 'Supabase (DATABASE_URL)' : 'local PostgreSQL'}`);

    // 1. Run schema.sql first
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      await runSqlFile(client, schemaPath, 'schema.sql');
    }

    // 2. Run all migrations in order
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        await runSqlFile(client, path.join(migrationsDir, file), file);
      }
    }

    console.log('\n✨ Migrations complete!');
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
