import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

// Use 'products' bucket with 'banners/' prefix since we know it works and is public
const BUCKET = 'products';
const PREFIX = 'banners';

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image') || formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const sb = getSupabase();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase storage not configured' }, { status: 500 });
    }

    // Delete old banner images from banners/ folder
    try {
      const { data: existingFiles } = await sb.storage.from(BUCKET).list(PREFIX, { limit: 100 });
      if (existingFiles && existingFiles.length > 0) {
        const filePaths = existingFiles.map(f => `${PREFIX}/${f.name}`);
        await sb.storage.from(BUCKET).remove(filePaths);
      }
    } catch (e) {
      console.error('Failed to clean old banner images:', e);
    }

    // Upload new image
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.name.split('.').pop() || 'jpg';
    const filepath = `${PREFIX}/banner-${uniqueSuffix}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { data, error } = await sb.storage
      .from(BUCKET)
      .upload(filepath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
    }

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filepath);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filepath
    });
  } catch (err) {
    console.error('Banner upload error:', err);
    return NextResponse.json({ error: 'Upload failed: ' + err.message }, { status: 500 });
  }
}

// DELETE - remove banner image
export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const sb = getSupabase();
    if (!sb) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    // Delete all files in banners/ folder
    const { data: existingFiles } = await sb.storage.from(BUCKET).list(PREFIX, { limit: 100 });
    if (existingFiles && existingFiles.length > 0) {
      const filePaths = existingFiles.map(f => `${PREFIX}/${f.name}`);
      await sb.storage.from(BUCKET).remove(filePaths);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Banner delete error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
