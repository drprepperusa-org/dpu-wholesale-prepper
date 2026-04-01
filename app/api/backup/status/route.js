import { NextResponse } from 'next/server';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Admin required' }, { status: 403 });

    const backupDir = path.join(process.cwd(), 'backups');

    if (!existsSync(backupDir)) {
      return NextResponse.json({
        success: true,
        lastBackup: null,
        message: 'No backups found'
      });
    }

    const files = readdirSync(backupDir)
      .filter(f => f.endsWith('.sql') || f.endsWith('.zip'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        stat: statSync(path.join(backupDir, f))
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        lastBackup: null,
        message: 'No backups found'
      });
    }

    const latest = files[0];
    return NextResponse.json({
      success: true,
      lastBackup: {
        filename: latest.name,
        timestamp: latest.stat.mtime.toISOString(),
        size: latest.stat.size
      }
    });
  } catch (err) {
    console.error('Backup status error:', err);
    return NextResponse.json({ error: 'Failed to get backup status' }, { status: 500 });
  }
}
