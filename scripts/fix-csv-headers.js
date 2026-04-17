// Fix CSV headers for Supabase migration
// Renames columns like "customer_id" back to "id" for primary keys
// Usage: node scripts/fix-csv-headers.js path/to/csv-folder
//
// Place all exported CSVs in a folder and run this script.
// It creates fixed copies with "_fixed" suffix.

const fs = require('fs');
const path = require('path');

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: node scripts/fix-csv-headers.js <csv-folder>');
  console.error('Example: node scripts/fix-csv-headers.js C:/Users/jakel/Downloads/supabase-exports');
  process.exit(1);
}

// Map of CSV filename patterns to header renames
// Supabase exports the PK as "tablename_id" but our schema uses "id"
const headerFixes = {
  // No fixes needed for tables where PK is already "id" (users, super_categories, categories, etc.)
  // These are for tables where Supabase might export differently
};

const files = fs.readdirSync(folder).filter(f => f.endsWith('.csv'));

if (files.length === 0) {
  console.log('No CSV files found in', folder);
  process.exit(0);
}

console.log(`Found ${files.length} CSV files\n`);

for (const file of files) {
  const filePath = path.join(folder, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length === 0) continue;

  const originalHeader = lines[0];
  let fixedHeader = originalHeader;

  // Fix: if first column ends with "_id" and matches table name pattern, rename to "id"
  // e.g., "customer_id,company_name,..." → "id,company_name,..."
  // But only for PRIMARY KEY columns, not foreign keys

  // Detect table name from filename (e.g., "customers.csv" → "customers")
  const tableName = path.basename(file, '.csv').toLowerCase().replace(/[^a-z_]/g, '');

  // Common Supabase export patterns where PK gets renamed
  const pkRenames = {
    'customers': { from: 'customer_id', to: 'id' },
    'products': { from: 'product_id', to: 'id' },
    'orders': { from: 'order_id', to: 'id' },
    'users': { from: 'user_id', to: 'id' },
  };

  const columns = fixedHeader.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  let changed = false;

  // Check if this table has a PK rename
  if (pkRenames[tableName]) {
    const { from, to } = pkRenames[tableName];
    const idx = columns.findIndex(c => c === from);
    if (idx !== -1 && !columns.includes(to)) {
      columns[idx] = to;
      changed = true;
      console.log(`${file}: Renamed "${from}" → "${to}"`);
    }
  }

  // Also check for any column that doesn't exist in our schema
  // Just report them
  const schemaColumns = {
    users: ['id', 'email', 'password_hash', 'role', 'active', 'created_at'],
    super_categories: ['id', 'name', 'emoji', 'sort_order'],
    categories: ['id', 'name', 'super_category_id', 'sort_order', 'is_hidden'],
    products: ['id', 'name', 'brand', 'packaging_type', 'weight', 'bags_per_case', 'cases_per_pallet', 'price', 'category_id', 'super_category_id', 'image_url', 'box_image_url', 'bundle_image_url', 'sku', 'barcode_pack', 'barcode_bundle', 'barcode_box', 'sort_order', 'is_hidden', 'is_oos', 'show_price', 'created_at'],
    customers: ['id', 'company_name', 'contact_name', 'email', 'password_hash', 'phone', 'alt_phone', 'address_line1', 'address_line2', 'city', 'state', 'zip', 'country', 'view_preset', 'show_prices', 'active', 'created_at', 'last_login', 'reset_token', 'reset_token_expires', 'password_changed_at'],
    customer_overrides: ['id', 'customer_id', 'product_id', 'override_price', 'is_hidden', 'is_oos'],
    customer_cat_hidden: ['id', 'customer_id', 'super_category_id'],
    orders: ['id', 'customer_id', 'status', 'total_cases', 'created_at', 'updated_at'],
    order_items: ['id', 'order_id', 'product_id', 'qty', 'unit', 'price', 'created_at'],
    favorites: ['id', 'customer_id', 'product_id', 'created_at'],
    activity_log: ['id', 'customer_id', 'admin_id', 'type', 'detail', 'entity_type', 'entity_id', 'metadata', 'created_at'],
    pending_registrations: ['id', 'company_name', 'contact_name', 'email', 'phone', 'password_hash', 'status', 'created_at'],
    settings: ['key', 'value', 'updated_at'],
    carts: ['id', 'customer_id', 'product_id', 'quantity', 'created_at', 'updated_at'],
  };

  if (schemaColumns[tableName]) {
    const expected = new Set(schemaColumns[tableName]);
    const extra = columns.filter(c => !expected.has(c));
    const missing = schemaColumns[tableName].filter(c => !columns.includes(c));
    if (extra.length > 0) console.log(`  ${file}: Extra columns in CSV (will be ignored by Supabase): ${extra.join(', ')}`);
    if (missing.length > 0) console.log(`  ${file}: Missing columns (will use defaults): ${missing.join(', ')}`);
  }

  if (changed) {
    lines[0] = columns.join(',');
    const fixedPath = path.join(folder, file.replace('.csv', '_fixed.csv'));
    fs.writeFileSync(fixedPath, lines.join('\n'));
    console.log(`  → Saved: ${path.basename(fixedPath)}`);
  } else {
    console.log(`${file}: Headers OK, no changes needed`);
  }
}

console.log('\nDone! Import the _fixed.csv files (or originals if no fixes needed) into the new Supabase.');
console.log('\nImport order:');
console.log('  1. users');
console.log('  2. super_categories');
console.log('  3. categories');
console.log('  4. products');
console.log('  5. customers');
console.log('  6. customer_overrides');
console.log('  7. customer_cat_hidden');
console.log('  8. orders');
console.log('  9. order_items');
console.log('  10. favorites');
console.log('  11. settings');
console.log('  12. pending_registrations');
console.log('  13. activity_log');
console.log('  14. carts');
