import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// GET - Download products as Excel
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    // Check which optional columns exist
    const colCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name IN ('barcode_pack','barcode_bundle','barcode_box','box_image_url','bundle_image_url')`);
    const existingCols = new Set(colCheck.rows.map(r => r.column_name));
    const optCol = (col) => existingCols.has(col) ? `p.${col}` : `NULL as ${col}`;

    const result = await pool.query(`
      SELECT p.id, p.sku, ${optCol('barcode_pack')}, ${optCol('barcode_bundle')}, ${optCol('barcode_box')}, p.name, p.price, p.weight, p.bags_per_case, p.cases_per_pallet,
             p.image_url, ${optCol('box_image_url')}, ${optCol('bundle_image_url')}, p.is_hidden, p.is_oos, p.show_price,
             s.name as super_category, c.name as category,
             p.super_category_id, p.category_id, p.created_at
      FROM products p
      LEFT JOIN super_categories s ON p.super_category_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY s.sort_order, c.sort_order, p.sort_order
    `);

    const rows = result.rows.map(p => ({
      'Product ID (leave blank for new)': p.id,
      'SKU': p.sku || '',
      'Barcode (Pack)': p.barcode_pack || '',
      'Barcode (Bundle)': p.barcode_bundle || '',
      'Barcode (Box)': p.barcode_box || '',
      'Product Name': p.name || '',
      'Price': p.price ? parseFloat(p.price) : '',
      'Weight': p.weight || '',
      'Bags Per Case': p.bags_per_case || '',
      'Cases Per Pallet': p.cases_per_pallet || '',
      'Super Category': p.super_category || '',
      'Category': p.category || '',
      'Image': p.image_url || '',
      'Box Image': p.box_image_url || '',
      'Bundle Image': p.bundle_image_url || '',
      'Hidden': p.is_hidden ? 'Yes' : 'No',
      'Out of Stock': p.is_oos ? 'Yes' : 'No',
      'Show Price': p.show_price === false ? 'No' : 'Yes',
      'Super Category ID': p.super_category_id || '',
      'Category ID': p.category_id || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 28 }, // Product ID
      { wch: 14 }, // SKU
      { wch: 16 }, // Barcode (Pack)
      { wch: 16 }, // Barcode (Bundle)
      { wch: 16 }, // Barcode (Box)
      { wch: 40 }, // Name
      { wch: 10 }, // Price
      { wch: 12 }, // Weight
      { wch: 14 }, // Bags/Case
      { wch: 16 }, // Cases/Pallet
      { wch: 22 }, // Super Category
      { wch: 22 }, // Category
      { wch: 50 }, // Image
      { wch: 50 }, // Box Image
      { wch: 50 }, // Bundle Image
      { wch: 8 },  // Hidden
      { wch: 12 }, // OOS
      { wch: 10 }, // Show Price
      { wch: 16 }, // Super Cat ID
      { wch: 12 }, // Cat ID
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    // Add a reference sheet for categories
    const catsResult = await pool.query(`
      SELECT s.id as super_id, s.name as super_name, c.id as cat_id, c.name as cat_name
      FROM super_categories s
      LEFT JOIN categories c ON c.super_category_id = s.id
      ORDER BY s.sort_order, c.sort_order
    `);
    const catRows = catsResult.rows.map(r => ({
      'Super Category ID': r.super_id,
      'Super Category': r.super_name,
      'Category ID': r.cat_id || '',
      'Category': r.cat_name || '',
    }));
    const wsCats = XLSX.utils.json_to_sheet(catRows);
    wsCats['!cols'] = [{ wch: 16 }, { wch: 25 }, { wch: 12 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsCats, 'Categories Reference');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="products-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Excel download error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Upload products from Excel
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Parse image filename→URL map sent from client
    let imageMap = {};
    const imageMapStr = formData.get('imageMap');
    if (imageMapStr) {
      try { imageMap = JSON.parse(imageMapStr); } catch (e) {}
    }

    const bytes = await file.arrayBuffer();
    const wb = XLSX.read(Buffer.from(bytes), { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });

    // Load existing categories for name-to-id mapping
    const superCats = await pool.query('SELECT id, name FROM super_categories');
    const cats = await pool.query('SELECT id, name, super_category_id FROM categories');
    const superMap = {};
    superCats.rows.forEach(s => { superMap[s.name.toLowerCase()] = s.id });
    const catMap = {};
    cats.rows.forEach(c => { catMap[c.name.toLowerCase()] = { id: c.id, super_id: c.super_category_id } });

    // Pre-load all existing product IDs and SKUs into maps (1 query instead of 2 per row)
    const existingProducts = await pool.query('SELECT id, sku FROM products');
    const idSet = new Set(existingProducts.rows.map(p => p.id));
    const skuToId = {};
    existingProducts.rows.forEach(p => { if (p.sku) skuToId[p.sku.toLowerCase()] = p.id });

    let created = 0, updated = 0, skipped = 0;
    const errors = [];
    const toUpdate = [];
    const toCreate = [];

    // Parse all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const get = (keys) => {
        for (const k of keys) {
          const val = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
          if (val !== undefined && val !== null && val !== '') return String(val).trim();
        }
        return null;
      };

      const name = get(['Product Name', 'Name', 'product_name', 'name']);
      if (!name) { skipped++; continue; }

      const sku = get(['SKU', 'sku', 'Sku']);
      const barcode_pack = get(['Barcode (Pack)', 'barcode_pack', 'Barcode Pack', 'UPC', 'upc']);
      const barcode_bundle = get(['Barcode (Bundle)', 'barcode_bundle', 'Barcode Bundle']);
      const barcode_box = get(['Barcode (Box)', 'barcode_box', 'Barcode Box']);
      const price = parseFloat(get(['Price', 'price']) || 0) || null;
      const weight = get(['Weight', 'weight']);
      const bagsPerCase = get(['Bags Per Case', 'bags_per_case', 'Bags/Case']);
      const casesPerPallet = parseInt(get(['Cases Per Pallet', 'cases_per_pallet', 'Cases/Pallet']) || 0) || null;
      let imageUrl = get(['Image URL', 'image_url', 'Image', 'image']);
      if (imageUrl && !imageUrl.startsWith('http')) {
        const filename = imageUrl.replace(/\\/g, '/').split('/').pop().toLowerCase();
        const filenameNoExt = filename.replace(/\.[^.]+$/, '');
        imageUrl = imageMap[filename] || imageMap[filenameNoExt] || null;
      }
      let boxImageUrl = get(['Box Image', 'box_image_url', 'Box Image URL']);
      if (boxImageUrl && !boxImageUrl.startsWith('http')) {
        const boxFilename = boxImageUrl.replace(/\\/g, '/').split('/').pop().toLowerCase();
        const boxFilenameNoExt = boxFilename.replace(/\.[^.]+$/, '');
        boxImageUrl = imageMap[boxFilename] || imageMap[boxFilenameNoExt] || null;
      }
      let bundleImageUrl = get(['Bundle Image', 'bundle_image_url', 'Bundle Image URL']);
      if (bundleImageUrl && !bundleImageUrl.startsWith('http')) {
        const bundleFilename = bundleImageUrl.replace(/\\/g, '/').split('/').pop().toLowerCase();
        const bundleFilenameNoExt = bundleFilename.replace(/\.[^.]+$/, '');
        bundleImageUrl = imageMap[bundleFilename] || imageMap[bundleFilenameNoExt] || null;
      }
      const isHidden = ['yes', 'true', '1'].includes((get(['Hidden', 'is_hidden', 'hidden']) || '').toLowerCase());
      const isOos = ['yes', 'true', '1'].includes((get(['Out of Stock', 'is_oos', 'OOS', 'oos']) || '').toLowerCase());
      const showPrice = !['no', 'false', '0'].includes((get(['Show Price', 'show_price']) || '').toLowerCase());

      const superCatName = get(['Super Category', 'super_category', 'Super_Category']);
      const catName = get(['Category', 'category']);
      const superCatId = get(['Super Category ID', 'super_category_id']) || (superCatName ? superMap[superCatName.toLowerCase()] : null);
      const catId = get(['Category ID', 'category_id']) || (catName ? catMap[catName.toLowerCase()]?.id : null);

      if (!superCatId || !catId) {
        errors.push(`Row ${rowNum}: "${name}" - missing/invalid category`);
        skipped++;
        continue;
      }

      const productId = get(['Product ID (leave blank for new)', 'Product ID', 'product_id', 'id', 'ID']);

      // Lookup existing using pre-loaded maps (no DB query)
      let existingId = null;
      if (productId && idSet.has(productId)) existingId = productId;
      if (!existingId && sku && skuToId[sku.toLowerCase()]) existingId = skuToId[sku.toLowerCase()];

      if (existingId) {
        toUpdate.push([name, sku, barcode_pack, barcode_bundle, barcode_box, price, weight, bagsPerCase, casesPerPallet, imageUrl || '', boxImageUrl || '', bundleImageUrl || '', isHidden, isOos, showPrice, superCatId, catId, existingId]);
      } else {
        const newId = productId || uuidv4();
        const newSku = sku || `SKU-${newId.substring(0, 8).toUpperCase()}`;
        toCreate.push([newId, name, newSku, barcode_pack, barcode_bundle, barcode_box, price, weight, bagsPerCase, casesPerPallet, imageUrl, boxImageUrl, bundleImageUrl, isHidden, isOos, showPrice, superCatId, catId]);
      }
    }

    // Batch execute updates (10 at a time in parallel)
    const BATCH = 10;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(batch.map(params =>
        pool.query(`UPDATE products SET name=$1, sku=$2, barcode_pack=$3, barcode_bundle=$4, barcode_box=$5, price=$6, weight=$7, bags_per_case=$8,
          cases_per_pallet=$9, image_url=COALESCE(NULLIF($10,''), image_url), box_image_url=COALESCE(NULLIF($11,''), box_image_url), bundle_image_url=COALESCE(NULLIF($12,''), bundle_image_url), is_hidden=$13, is_oos=$14,
          show_price=$15, super_category_id=$16, category_id=$17 WHERE id=$18`, params)
          .then(() => { updated++ })
          .catch(e => { errors.push(`Update "${params[0]}": ${e.message}`); skipped++ })
      ));
    }

    // Batch execute creates (10 at a time in parallel)
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const batch = toCreate.slice(i, i + BATCH);
      await Promise.all(batch.map(params =>
        pool.query(`INSERT INTO products (id, name, sku, barcode_pack, barcode_bundle, barcode_box, price, weight, bags_per_case, cases_per_pallet, image_url, box_image_url, bundle_image_url, is_hidden, is_oos, show_price, super_category_id, category_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`, params)
          .then(() => { created++ })
          .catch(e => { errors.push(`Create "${params[1]}": ${e.message}`); skipped++ })
      ));
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      created,
      updated,
      skipped,
      errors: errors.slice(0, 20) // Limit error messages
    });
  } catch (err) {
    console.error('Excel upload error:', err);
    return NextResponse.json({ error: 'Upload failed: ' + err.message }, { status: 500 });
  }
}
