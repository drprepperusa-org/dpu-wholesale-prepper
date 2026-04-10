// Upload all local product images to Supabase Storage and update DB
const pg = require('pg');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'products';

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    console.log(`📦 Creating bucket "${BUCKET}"...`);
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !error.message.includes('already exists')) throw error;
    console.log(`   ✅ Bucket created`);
  } else {
    console.log(`📦 Bucket "${BUCKET}" already exists`);
  }
}

async function uploadOne(filePath, filename) {
  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function main() {
  console.log('🚀 Starting image upload + DB sync...\n');

  await ensureBucket();

  // Load image mapping (db_id -> local path)
  const mappingPath = path.join(__dirname, '..', 'image-mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  // Get all products from DB sorted by sort_order so we can map by index
  const { rows: products } = await pool.query(
    'SELECT id, name, sort_order FROM products ORDER BY sort_order ASC, id ASC'
  );
  console.log(`\n📋 ${products.length} products in DB`);
  console.log(`🖼️  ${Object.keys(mapping).length} image mappings\n`);

  let uploaded = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    // image-mapping.json keys are 1-indexed sort orders
    const mapKey = String(i + 1);
    const relPath = mapping[mapKey];

    if (!relPath) {
      skipped++;
      continue;
    }

    const localPath = path.join(__dirname, '..', 'public', relPath);
    if (!fs.existsSync(localPath)) {
      console.log(`   ⚠️  Missing file: ${localPath}`);
      skipped++;
      continue;
    }

    const filename = `product-${product.id}-${Date.now()}.jpg`;
    try {
      const publicUrl = await uploadOne(localPath, filename);
      uploaded++;

      await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [
        publicUrl,
        product.id,
      ]);
      updated++;

      if ((i + 1) % 20 === 0) {
        console.log(`   Processed ${i + 1}/${products.length}...`);
      }
    } catch (err) {
      console.error(`   ❌ Failed for ${product.id}: ${err.message}`);
    }
  }

  console.log(`\n✨ Done!`);
  console.log(`   📤 Uploaded: ${uploaded}`);
  console.log(`   💾 DB updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
