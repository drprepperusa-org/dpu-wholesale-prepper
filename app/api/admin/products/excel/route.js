import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Normalize CSV/Excel header names (handles BOM, spacing, punctuation, case)
function normalizeHeaderKey(key) {
  return String(key || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()/]+/g, '');
}

// Normalize cell values for matching and parsing
function cleanCellValue(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value)
    .replace(/^\uFEFF/, '')
    .trim()
    // Excel/CSV often wraps text identifiers in quotes/apostrophes
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
  return cleaned === '' ? null : cleaned;
}

// Normalize IDs/SKUs for resilient lookup (case-insensitive, ignores extra spaces)
function normalizeLookupValue(value) {
  const cleaned = cleanCellValue(value);
  if (!cleaned) return null;
  return cleaned.replace(/\s+/g, '').toLowerCase();
}

// Looser matching for IDs/SKUs that may come with punctuation/formatting changes
function normalizeLooseLookupValue(value) {
  const cleaned = cleanCellValue(value);
  if (!cleaned) return null;
  return cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// GET - Download products as Excel
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    // Check which optional columns exist
    const colCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name IN ('barcode_pack','barcode_bundle','barcode_box','box_image_url','bundle_image_url','brand')`);
    const existingCols = new Set(colCheck.rows.map(r => r.column_name));
    const optCol = (col) => existingCols.has(col) ? `p.${col}` : `NULL as ${col}`;

    const result = await pool.query(`
      SELECT p.id, p.sku, ${optCol('brand')}, ${optCol('barcode_pack')}, ${optCol('barcode_bundle')}, ${optCol('barcode_box')}, p.name, p.price, p.weight, p.bags_per_case, COALESCE((SELECT units_per_case FROM products WHERE id = p.id), NULL) as units_per_case, p.cases_per_pallet,
             p.image_url, ${optCol('box_image_url')}, ${optCol('bundle_image_url')}, p.is_hidden, p.is_oos, p.show_price,
             s.name as super_category, c.name as category,
             p.super_category_id, p.category_id, p.created_at
      FROM products p
      LEFT JOIN super_categories s ON p.super_category_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY s.sort_order, c.sort_order, p.sort_order
    `);

    // Extract just the filename from a Supabase URL (e.g. "1775776912923-481487594.jpg")
    const urlToFilename = (url) => {
      if (!url) return '';
      try {
        return url.split('/').pop().split('?')[0] || url;
      } catch { return url; }
    };

    const rows = result.rows.map(p => ({
      'Product ID (leave blank for new)': p.id,
      'SKU': p.sku || '',
      'Brand': p.brand || '',
      'Barcode (Pack)': p.barcode_pack || '',
      'Barcode (Bundle)': p.barcode_bundle || '',
      'Barcode (Box)': p.barcode_box || '',
      'Product Name': p.name || '',
      'Price': p.price ? parseFloat(p.price) : '',
      'Weight': p.weight || '',
      'Bags Per Case': p.bags_per_case || '',
      'Units Per Case': p.units_per_case || '',
      'Cases Per Pallet': p.cases_per_pallet || '',
      'Super Category': p.super_category || '',
      'Category': p.category || '',
      'Image': urlToFilename(p.image_url),
      'Box Image': urlToFilename(p.box_image_url),
      'Bundle Image': urlToFilename(p.bundle_image_url),
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
      { wch: 20 }, // Brand
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

    // Ensure optional columns exist so imports work on older schemas
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_pack VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_bundle VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_box VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS box_image_url VARCHAR(512);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_image_url VARCHAR(512);
    `);

    // Parse image filename→URL map sent from client
    let imageMap = {};
    const imageMapStr = formData.get('imageMap');
    if (imageMapStr) {
      try { imageMap = JSON.parse(imageMapStr); } catch (e) {}
    }

    const bytes = await file.arrayBuffer();
    const wb = XLSX.read(Buffer.from(bytes), { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    if (!rows.length) return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });

    // Load existing categories for name-to-id mapping
    const superCats = await pool.query('SELECT id, name FROM super_categories');
    const cats = await pool.query('SELECT id, name, super_category_id FROM categories');
    const superMap = {};
    superCats.rows.forEach(s => { superMap[s.name.toLowerCase()] = s.id });
    const catMapByName = {};
    const catMapById = {};
    cats.rows.forEach(c => {
      catMapByName[c.name.toLowerCase()] = { id: c.id, super_id: c.super_category_id };
      catMapById[String(c.id)] = { id: c.id, super_id: c.super_category_id };
    });

    // Pre-load all existing product IDs and SKUs into maps (1 query instead of 2 per row)
    const existingProducts = await pool.query('SELECT id, sku, name, super_category_id, category_id FROM products');
    const idLookup = {};
    const idLookupLoose = {};
    const skuToId = {};
    const skuToIdLoose = {};
    const nameToIds = {};
    const existingById = {};
    existingProducts.rows.forEach((p) => {
      const idKey = normalizeLookupValue(p.id);
      if (idKey) idLookup[idKey] = p.id;
      const idLooseKey = normalizeLooseLookupValue(p.id);
      if (idLooseKey) idLookupLoose[idLooseKey] = p.id;
      const skuKey = normalizeLookupValue(p.sku);
      if (skuKey) skuToId[skuKey] = p.id;
      const skuLooseKey = normalizeLooseLookupValue(p.sku);
      if (skuLooseKey) skuToIdLoose[skuLooseKey] = p.id;
      const nameKey = normalizeLookupValue(p.name);
      if (nameKey) {
        if (!nameToIds[nameKey]) nameToIds[nameKey] = [];
        nameToIds[nameKey].push(p.id);
      }
      existingById[p.id] = p;
    });

    let created = 0, updated = 0, skipped = 0;
    let matchedById = 0, matchedBySku = 0, matchedByLoose = 0, matchedByName = 0, matchedByFallbackUpdate = 0;
    const errors = [];
    const unmatchedSamples = [];
    const toUpdate = [];
    const toCreate = [];

    // Capture detected headers for diagnostics
    const detectedHeaders = rows.length > 0 ? Object.keys(rows[0]).map(k => ({ original: k, normalized: normalizeHeaderKey(k) })) : [];

    // Parse all rows first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const normalizedRow = {};
      Object.entries(row || {}).forEach(([key, value]) => {
        normalizedRow[normalizeHeaderKey(key)] = value;
      });

      const get = (keys) => {
        for (const k of keys) {
          const val = normalizedRow[normalizeHeaderKey(k)];
          const cleaned = cleanCellValue(val);
          if (cleaned !== null) return cleaned;
        }
        return null;
      };

      const name = get(['Product Name', 'Name', 'product_name', 'name']);
      if (!name) { skipped++; continue; }

      const sku = get(['SKU', 'sku', 'Sku', 'Item SKU', 'Product SKU', 'item_sku', 'product_sku', 'ItemSKU', 'ProductSKU']);
      const brand = get(['Brand', 'brand', 'BRAND']);
      const barcode_pack = get(['Barcode (Pack)', 'barcode_pack', 'Barcode Pack', 'UPC', 'upc']);
      const barcode_bundle = get(['Barcode (Bundle)', 'barcode_bundle', 'Barcode Bundle']);
      const barcode_box = get(['Barcode (Box)', 'barcode_box', 'Barcode Box']);
      const rawPrice = get(['Price', 'price', 'Unit Price', 'unit_price', 'Cost', 'cost']);
      const price = rawPrice ? (parseFloat(String(rawPrice).replace(/[$,]/g, '')) || null) : null;
      const weight = get(['Weight', 'weight']);
      const bagsPerCase = get(['Bags Per Case', 'bags_per_case', 'Bags/Case']);
      const unitsPerCase = get(['Units Per Case', 'units_per_case', 'Units/Case']);
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
      const rawSuperCatId = get(['Super Category ID', 'super_category_id']);
      const rawCatId = get(['Category ID', 'category_id']);

      const productId = get(['Product ID (leave blank for new)', 'Product ID', 'product_id', 'id', 'ID']);

      // Lookup existing using pre-loaded maps (no DB query)
      let existingId = null;
      const productIdKey = normalizeLookupValue(productId);
      if (productIdKey && idLookup[productIdKey]) {
        existingId = idLookup[productIdKey];
        matchedById++;
      }
      const skuKey = normalizeLookupValue(sku);
      if (!existingId && skuKey && skuToId[skuKey]) {
        existingId = skuToId[skuKey];
        matchedBySku++;
      }
      if (!existingId) {
        const productIdLooseKey = normalizeLooseLookupValue(productId);
        if (productIdLooseKey && idLookupLoose[productIdLooseKey]) {
          existingId = idLookupLoose[productIdLooseKey];
          matchedByLoose++;
        }
      }
      if (!existingId) {
        const skuLooseKey = normalizeLooseLookupValue(sku);
        if (skuLooseKey && skuToIdLoose[skuLooseKey]) {
          existingId = skuToIdLoose[skuLooseKey];
          matchedByLoose++;
        }
      }
      if (!existingId) {
        const nameKey = normalizeLookupValue(name);
        const ids = nameKey ? nameToIds[nameKey] : null;
        if (ids && ids.length === 1) {
          existingId = ids[0];
          matchedByName++;
        }
      }

      // Category name takes priority — if a name is provided, use it (triggers auto-create if new).
      // Only fall back to ID when no name is given.
      let catId = null;
      if (catName) {
        catId = catMapByName[catName.toLowerCase()]?.id || null;
        // Don't fall back to rawCatId — the user explicitly typed a category name
      } else if (rawCatId) {
        const parsedCatId = parseInt(rawCatId, 10);
        if (Number.isFinite(parsedCatId) && catMapById[String(parsedCatId)]) {
          catId = parsedCatId;
        }
      }

      let superCatId = null;
      if (superCatName) {
        superCatId = superMap[superCatName.toLowerCase()] || null;
      } else if (rawSuperCatId) {
        const parsedSuperId = parseInt(rawSuperCatId, 10);
        if (Number.isFinite(parsedSuperId)) superCatId = parsedSuperId;
      }

      // Auto-create missing super category if name provided but not found
      if (!superCatId && superCatName) {
        try {
          const newSc = await pool.query('INSERT INTO super_categories (name, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order),0)+1 FROM super_categories)) RETURNING id', [superCatName.trim()]);
          superCatId = newSc.rows[0].id;
          superMap[superCatName.toLowerCase()] = superCatId;
        } catch (e) {
          // Might already exist from concurrent insert — re-check
          const check = await pool.query('SELECT id FROM super_categories WHERE LOWER(name) = LOWER($1)', [superCatName.trim()]);
          if (check.rows.length > 0) { superCatId = check.rows[0].id; superMap[superCatName.toLowerCase()] = superCatId; }
        }
      }

      // Auto-create missing subcategory if name provided but not found
      if (!catId && catName && superCatId) {
        try {
          const newCat = await pool.query('INSERT INTO categories (name, super_category_id, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order),0)+1 FROM categories WHERE super_category_id=$2)) RETURNING id', [catName.trim(), superCatId]);
          catId = newCat.rows[0].id;
          catMapByName[catName.toLowerCase()] = { id: catId, super_id: superCatId };
          catMapById[String(catId)] = { id: catId, super_id: superCatId };
        } catch (e) {
          // Might already exist — re-check
          const check = await pool.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND super_category_id = $2', [catName.trim(), superCatId]);
          if (check.rows.length > 0) { catId = check.rows[0].id; catMapByName[catName.toLowerCase()] = { id: catId, super_id: superCatId }; catMapById[String(catId)] = { id: catId, super_id: superCatId }; }
        }
      }

      // If category is known but super category is omitted, derive it from categories table
      if (!superCatId && catId) {
        const catInfo = catMapById[String(parseInt(catId, 10))];
        if (catInfo) superCatId = catInfo.super_id;
      }

      // For updates, category columns are optional: fallback to existing values when absent.
      if (existingId) {
        const existing = existingById[existingId];
        if (!catId && existing?.category_id) catId = existing.category_id;
        if (!superCatId && existing?.super_category_id) superCatId = existing.super_category_id;
      } else {
        // For new rows, category fields are required.
        if (!superCatId || !catId) {
          errors.push(`Row ${rowNum}: "${name}" - missing/invalid category`);
          skipped++;
          continue;
        }
      }

      if (existingId) {
        toUpdate.push([name, sku, brand, barcode_pack, barcode_bundle, barcode_box, price, weight, bagsPerCase, unitsPerCase, casesPerPallet, imageUrl || '', boxImageUrl || '', bundleImageUrl || '', isHidden, isOos, showPrice, superCatId, catId, existingId]);
      } else {
        if (unmatchedSamples.length < 20) unmatchedSamples.push({ row: rowNum, productId: productId || '', sku: sku || '', name });
        const newId = productId || uuidv4();
        const newSku = sku || `SKU-${newId.substring(0, 8).toUpperCase()}`;
        toCreate.push({
          params: [newId, name, newSku, brand, barcode_pack, barcode_bundle, barcode_box, price, weight, bagsPerCase, unitsPerCase, casesPerPallet, imageUrl, boxImageUrl, bundleImageUrl, isHidden, isOos, showPrice, superCatId, catId],
          providedId: !!productId,
          providedSku: !!sku
        });
      }
    }

    // Batch execute updates (10 at a time in parallel)
    const BATCH = 10;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(batch.map(params =>
        pool.query(`UPDATE products SET name=$1, sku=COALESCE(NULLIF($2,''), sku), brand=$3, barcode_pack=$4, barcode_bundle=$5, barcode_box=$6, price=COALESCE($7, price), weight=$8, bags_per_case=$9, units_per_case=$10,
          cases_per_pallet=COALESCE($11, cases_per_pallet), image_url=COALESCE(NULLIF($12,''), image_url), box_image_url=COALESCE(NULLIF($13,''), box_image_url), bundle_image_url=COALESCE(NULLIF($14,''), bundle_image_url), is_hidden=$15, is_oos=$16,
          show_price=$17, super_category_id=COALESCE($18, super_category_id), category_id=COALESCE($19, category_id) WHERE id=$20`, params)
          .then(() => { updated++ })
          .catch(e => { errors.push(`Update "${params[0]}": ${e.message}`); skipped++ })
      ));
    }

    // Batch execute creates (10 at a time in parallel)
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const batch = toCreate.slice(i, i + BATCH);
      await Promise.all(batch.map(async (entry) => {
        const params = entry.params;
        try {
          // Strong fallback: if caller provided ID or SKU, force an overwrite attempt before creating.
          if (entry.providedId) {
            const updateByIdParams = [params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9], params[10], params[11], params[12] || '', params[13] || '', params[14] || '', params[15], params[16], params[17], params[18], params[19], params[0]];
            const byId = await pool.query(`UPDATE products SET name=$1, sku=COALESCE(NULLIF($2,''), sku), brand=$3, barcode_pack=$4, barcode_bundle=$5, barcode_box=$6, price=COALESCE($7, price), weight=$8, bags_per_case=$9, units_per_case=$10,
              cases_per_pallet=COALESCE($11, cases_per_pallet), image_url=COALESCE(NULLIF($12,''), image_url), box_image_url=COALESCE(NULLIF($13,''), box_image_url), bundle_image_url=COALESCE(NULLIF($14,''), bundle_image_url), is_hidden=$15, is_oos=$16,
              show_price=$17, super_category_id=COALESCE($18, super_category_id), category_id=COALESCE($19, category_id) WHERE id=$20`, updateByIdParams);
            if (byId.rowCount > 0) {
              updated++;
              matchedByFallbackUpdate++;
              return;
            }
          }

          if (entry.providedSku) {
            const updateBySkuParams = [params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9], params[10], params[11], params[12] || '', params[13] || '', params[14] || '', params[15], params[16], params[17], params[18], params[19], params[2]];
            const bySku = await pool.query(`UPDATE products SET name=$1, sku=COALESCE(NULLIF($2,''), sku), brand=$3, barcode_pack=$4, barcode_bundle=$5, barcode_box=$6, price=COALESCE($7, price), weight=$8, bags_per_case=$9, units_per_case=$10,
              cases_per_pallet=COALESCE($11, cases_per_pallet), image_url=COALESCE(NULLIF($12,''), image_url), box_image_url=COALESCE(NULLIF($13,''), box_image_url), bundle_image_url=COALESCE(NULLIF($14,''), bundle_image_url), is_hidden=$15, is_oos=$16,
              show_price=$17, super_category_id=COALESCE($18, super_category_id), category_id=COALESCE($19, category_id) WHERE LOWER(sku)=LOWER($20)`, updateBySkuParams);
            if (bySku.rowCount > 0) {
              updated++;
              matchedByFallbackUpdate++;
              return;
            }
          }

          await pool.query(`INSERT INTO products (id, name, sku, brand, barcode_pack, barcode_bundle, barcode_box, price, weight, bags_per_case, units_per_case, cases_per_pallet, image_url, box_image_url, bundle_image_url, is_hidden, is_oos, show_price, super_category_id, category_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`, params);
          created++;
        } catch (e) {
          errors.push(`Create "${params[1]}": ${e.message}`);
          skipped++;
        }
      }));
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      created,
      updated,
      skipped,
      matchDiagnostics: {
        matchedById,
        matchedBySku,
        matchedByLoose,
        matchedByName,
        matchedByFallbackUpdate,
        queuedUpdates: toUpdate.length,
        queuedCreates: toCreate.length,
        unmatchedSamples,
        detectedHeaders,
        existingProductCount: existingProducts.rows.length
      },
      errors: errors.slice(0, 20)
    });
  } catch (err) {
    console.error('Excel upload error:', err);
    return NextResponse.json({ error: 'Upload failed: ' + err.message }, { status: 500 });
  }
}
