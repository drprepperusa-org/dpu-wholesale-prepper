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

    const result = await pool.query(`
      SELECT p.id, p.sku, p.name, p.price, p.weight, p.bags_per_case, p.cases_per_pallet,
             p.image_url, p.is_hidden, p.is_oos, p.show_price,
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
      'Product Name': p.name || '',
      'Price': p.price ? parseFloat(p.price) : '',
      'Weight': p.weight || '',
      'Bags Per Case': p.bags_per_case || '',
      'Cases Per Pallet': p.cases_per_pallet || '',
      'Super Category': p.super_category || '',
      'Category': p.category || '',
      'Image': p.image_url || '',
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
      { wch: 40 }, // Name
      { wch: 10 }, // Price
      { wch: 12 }, // Weight
      { wch: 14 }, // Bags/Case
      { wch: 16 }, // Cases/Pallet
      { wch: 22 }, // Super Category
      { wch: 22 }, // Category
      { wch: 50 }, // Image
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

    let created = 0, updated = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row (1-indexed + header)

      // Normalize column names (handle various casing)
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
      const price = parseFloat(get(['Price', 'price']) || 0) || null;
      const weight = get(['Weight', 'weight']);
      const bagsPerCase = get(['Bags Per Case', 'bags_per_case', 'Bags/Case']);
      const casesPerPallet = parseInt(get(['Cases Per Pallet', 'cases_per_pallet', 'Cases/Pallet']) || 0) || null;
      let imageUrl = get(['Image URL', 'image_url', 'Image', 'image']);
      // Resolve local file paths to uploaded Supabase URLs using the imageMap
      if (imageUrl && !imageUrl.startsWith('http')) {
        // Extract just the filename from paths like "Downloads\dish1.jpg" or "C:\Users\...\dish1.jpg"
        const filename = imageUrl.replace(/\\/g, '/').split('/').pop().toLowerCase();
        const filenameNoExt = filename.replace(/\.[^.]+$/, '');
        imageUrl = imageMap[filename] || imageMap[filenameNoExt] || null;
      }
      const isHidden = ['yes', 'true', '1'].includes((get(['Hidden', 'is_hidden', 'hidden']) || '').toLowerCase());
      const isOos = ['yes', 'true', '1'].includes((get(['Out of Stock', 'is_oos', 'OOS', 'oos']) || '').toLowerCase());
      const showPrice = !['no', 'false', '0'].includes((get(['Show Price', 'show_price']) || '').toLowerCase());

      // Resolve category
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

      try {
        // Try to find existing product: by ID first, then by SKU
        let existingId = null;
        if (productId) {
          const check = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
          if (check.rows.length > 0) existingId = check.rows[0].id;
        }
        if (!existingId && sku) {
          const check = await pool.query('SELECT id FROM products WHERE sku = $1', [sku]);
          if (check.rows.length > 0) existingId = check.rows[0].id;
        }

        if (existingId) {
          // Update existing product
          await pool.query(`
            UPDATE products SET name=$1, sku=$2, price=$3, weight=$4, bags_per_case=$5,
            cases_per_pallet=$6, image_url=COALESCE(NULLIF($7,''), image_url), is_hidden=$8, is_oos=$9,
            show_price=$10, super_category_id=$11, category_id=$12
            WHERE id=$13
          `, [name, sku, price, weight, bagsPerCase, casesPerPallet, imageUrl || '', isHidden, isOos, showPrice, superCatId, catId, existingId]);
          updated++;
        } else {
          // Create new product - auto-generate ID and SKU if not provided
          const newId = productId || uuidv4();
          const newSku = sku || `SKU-${newId.substring(0, 8).toUpperCase()}`;
          await pool.query(`
            INSERT INTO products (id, name, sku, price, weight, bags_per_case, cases_per_pallet, image_url, is_hidden, is_oos, show_price, super_category_id, category_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          `, [newId, name, newSku, price, weight, bagsPerCase, casesPerPallet, imageUrl, isHidden, isOos, showPrice, superCatId, catId]);
          created++;
        }
      } catch (dbErr) {
        errors.push(`Row ${rowNum}: "${name}" - ${dbErr.message}`);
        skipped++;
      }
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
