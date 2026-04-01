import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    // Sanitize: only allow alphanumeric, dash, underscore, dot
    if (!/^[a-zA-Z0-9\-_.]+$/.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filepath = path.join(process.cwd(), 'public', 'images', 'products', filename);

    // Verify the resolved path is within the images directory (prevent traversal)
    const realPath = path.resolve(filepath);
    const imagesDir = path.resolve(path.join(process.cwd(), 'public', 'images', 'products'));

    if (!realPath.startsWith(imagesDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const buffer = await readFile(filepath);
    const ext = path.extname(filename).toLowerCase();

    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Image proxy error:', err);
    return NextResponse.json({ error: 'Error serving image' }, { status: 500 });
  }
}
