import jwt from 'jsonwebtoken';
import pool from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'temp-secret-key-for-development';

/**
 * Extract Bearer token from Authorization header string.
 */
export function extractToken(authHeader) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  return parts[1] || null;
}

/**
 * Decode and verify a JWT token. Returns decoded payload or null.
 */
export function decodeToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Get user record from DB for a decoded JWT payload.
 * Checks users table first (admin/sales/view-only), then customers table.
 */
export async function getUserFromPayload(payload) {
  if (!payload) return null;
  try {
    if (payload.table === 'users') {
      const result = await pool.query(
        'SELECT id, email, role, active, NULL as company_name, NULL as contact_name FROM users WHERE id = $1 AND active = TRUE',
        [payload.sub]
      );
      return result.rows[0] || null;
    }

    const result = await pool.query(
      "SELECT id, email, company_name, contact_name, active, 'customer' as role FROM customers WHERE id = $1 AND active = TRUE",
      [payload.sub]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Auth error:', err.message);
    return null;
  }
}

/**
 * Verify any valid token (customer or admin). Returns user record or null.
 */
export async function verifyToken(token) {
  const payload = decodeToken(token);
  if (!payload) return null;
  return getUserFromPayload(payload);
}

/**
 * Verify an admin token. Returns user record with admin/sales role or null.
 */
export async function verifyAdminToken(token) {
  const payload = decodeToken(token);
  if (!payload) return null;

  if (!['admin', 'sales', 'view-only'].includes(payload.role)) {
    if (payload.email === process.env.ADMIN_EMAIL || payload.email === 'admin@drprepper.com') {
      const user = await getUserFromPayload(payload);
      if (user) return { ...user, role: 'admin' };
    }
    return null;
  }

  return getUserFromPayload(payload);
}

/**
 * Verify auth from a Next.js request object. Returns { user, isAdmin } or throws.
 * Usage:
 *   const { user, isAdmin } = await verifyAuth(request);
 */
export async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return { user: null, isAdmin: false, payload: null };
  }

  const payload = decodeToken(token);
  if (!payload) {
    return { user: null, isAdmin: false, payload: null };
  }

  const user = await getUserFromPayload(payload);
  const isAdmin = payload.role && ['admin', 'sales', 'view-only'].includes(payload.role);
  const isAdminByEmail = payload.email === process.env.ADMIN_EMAIL || payload.email === 'admin@drprepper.com';

  return {
    user,
    isAdmin: isAdmin || isAdminByEmail,
    payload
  };
}

/**
 * Require admin auth. Returns admin user or null.
 */
export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader);
  return verifyAdminToken(token);
}

/**
 * Require any auth (customer or admin). Returns user or null.
 */
export async function requireAuth(request) {
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader);
  return verifyToken(token);
}

/**
 * Log activity (supports both customer and admin actions)
 */
export async function logActivity(customerId, type, detail, options = {}) {
  try {
    const { adminId, entityType, entityId, ipAddress } = options;
    // admin_id column is INT — only accept numeric ids. If a string-id admin
    // (e.g. the seeded 'admin' customer) is passed, log them as customer_id instead.
    let numericAdminId = null;
    let effectiveCustomerId = customerId || null;
    if (adminId != null) {
      const n = Number(adminId);
      if (Number.isInteger(n)) {
        numericAdminId = n;
      } else if (!effectiveCustomerId) {
        effectiveCustomerId = String(adminId);
      }
    }
    await pool.query(
      `INSERT INTO activity_log (customer_id, type, detail, admin_id, entity_type, entity_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [effectiveCustomerId, type, detail, numericAdminId, entityType || null, entityId || null, ipAddress || null]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export { JWT_SECRET };
