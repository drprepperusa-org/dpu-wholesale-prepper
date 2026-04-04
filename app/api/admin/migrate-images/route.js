import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSupabase } from '@/lib/supabase';

const BUCKET = 'products';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== 'migrate-2025') return NextResponse.json({ error: 'Invalid key' }, { status: 403 });

    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    // Get all products with image URLs that are NOT already Supabase URLs
    const result = await pool.query(`
      SELECT id, name, image_url FROM products
      WHERE image_url IS NOT NULL
        AND image_url != ''
        AND image_url NOT LIKE '%supabase%'
      ORDER BY id
    `);

    const products = result.rows;
    const results = { migrated: 0, failed: 0, skipped: 0, errors: [] };

    for (const prod of products) {
      try {
        // Fetch the image from the current URL
        let imageUrl = prod.image_url;

        // If it's a relative path, construct full URL
        if (imageUrl.startsWith('/')) {
          // These are local files - try to fetch from the deployed site
          const baseUrl = searchParams.get('base') || 'https://dpu-wholesale-prepper-master.vercel.app';
          imageUrl = baseUrl + imageUrl;
        }

        const response = await fetch(imageUrl);
        if (!response.ok) {
          results.skipped++;
          continue;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await response.arrayBuffer());

        // Generate filename from product ID
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const filename = `${prod.id}.${ext}`;

        // Upload to Supabase
        const { data, error } = await sb.storage
          .from(BUCKET)
          .upload(filename, buffer, { contentType, upsert: true });

        if (error) {
          results.failed++;
          results.errors.push({ id: prod.id, name: prod.name, error: error.message });
          continue;
        }

        // Get public URL
        const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filename);

        // Update product in database
        await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [urlData.publicUrl, prod.id]);
        results.migrated++;
      } catch (e) {
        results.failed++;
        results.errors.push({ id: prod.id, name: prod.name, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      ...results
    });
  } catch (err) {
    console.error('Migration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== 'migrate-2025') return NextResponse.json({ error: 'Invalid key' }, { status: 403 });

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE image_url LIKE '%supabase%') as on_supabase,
        COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE '%supabase%') as not_on_supabase,
        COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') as no_image,
        COUNT(*) as total
      FROM products
    `);

    return NextResponse.json({ success: true, ...result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
