import { NextResponse } from 'next/server';
import { extractToken, decodeToken, getUserFromPayload } from '@/lib/auth';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });

    const payload = decodeToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const user = await getUserFromPayload(payload);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || payload.role,
        companyName: user.company_name || 'DR Prepper',
        name: user.contact_name || user.email
      }
    });
  } catch (err) {
    console.error('Auth me error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
