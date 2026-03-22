const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pg = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validateProduct, validateCustomer, validateLogin, validateResetPasswordRequest, validateResetPasswordConfirm } = require('./lib/validation');
require('dotenv').config();

// Validate critical env vars
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('⚠️  WARNING: JWT_SECRET is not set or is using the default insecure value!');
  console.warn('   Set a strong JWT_SECRET in .env before deploying to production.');
} else if (JWT_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET is shorter than 32 characters — consider using a longer secret.');
} else {
  console.log(`✅ JWT_SECRET verified (${JWT_SECRET.length} chars)`);
}

const app = express();

// ========================
// DATABASE SETUP
// ========================
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drprepper_wholesale',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// ========================
// MIDDLEWARE
// ========================
app.set('trust proxy', 1); // Trust Cloudflare Tunnel
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Favicon route
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// ========================
// GLOBAL RATE LIMITER (with skip for public endpoints)
// ========================
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for public image proxy + health checks
    return req.path.startsWith('/catalog/image/') || req.path === '/health';
  },
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
});

app.use(globalRateLimiter);

// ========================
// PUBLIC IMAGE PROXY (No Auth Required)
// ========================
// Serves product images without Cloudflare Access protection
// Works on mobile + desktop (bypasses rate limiting & X-Forwarded-For validation)
app.get('/catalog/image/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Sanitize: only allow alphanumeric, dash, underscore, dot
  if (!/^[a-zA-Z0-9\-_.]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const filepath = path.join(__dirname, 'public', 'images', 'products', filename);
  
  // Verify the resolved path is within the images directory (prevent traversal)
  const realPath = path.resolve(filepath);
  const imagesDir = path.resolve(path.join(__dirname, 'public', 'images', 'products'));
  
  if (!realPath.startsWith(imagesDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Set cache headers + CORS for mobile/cross-origin access
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.sendFile(filepath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Image not found' });
      } else {
        return res.status(500).json({ error: 'Error serving image' });
      }
    }
  });
});

// ========================
// IMAGE UPLOAD SETUP (MULTER)
// ========================
const uploadDir = path.join(__dirname, 'public', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// ========================
// AUTH MIDDLEWARE
// ========================

// Login rate limiter: 5 attempts per 15 minutes per IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  },
  // Trust Cloudflare + handle missing X-Forwarded-For gracefully
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

function extractToken(authHeader) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  return parts[1] || null;
}

/**
 * Verify a JWT token and return the decoded user payload.
 * Returns null if token is invalid/expired.
 */
function decodeToken(token) {
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
async function getUserFromPayload(payload) {
  if (!payload) return null;
  try {
    // Check users table first (admin portal users)
    if (payload.table === 'users') {
      const result = await pool.query(
        'SELECT id, email, role, active, NULL as company_name, NULL as contact_name FROM users WHERE id = $1 AND active = TRUE',
        [payload.sub]
      );
      return result.rows[0] || null;
    }
    
    // Check customers table
    const result = await pool.query(
      'SELECT id, email, company_name, contact_name, active, \'customer\' as role FROM customers WHERE id = $1 AND active = TRUE',
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
async function verifyToken(token) {
  const payload = decodeToken(token);
  if (!payload) return null;
  return getUserFromPayload(payload);
}

/**
 * Verify an admin token. Returns user record with admin/sales role or null.
 */
async function verifyAdminToken(token) {
  const payload = decodeToken(token);
  if (!payload) return null;
  
  // Role must be admin, sales, or view-only (not 'customer')
  if (!['admin', 'sales', 'view-only'].includes(payload.role)) {
    // Backward compat: check if it's the admin email in customers table
    if (payload.email === process.env.ADMIN_EMAIL || payload.email === 'admin@drprepper.com') {
      const user = await getUserFromPayload(payload);
      if (user) return { ...user, role: 'admin' };
    }
    return null;
  }
  
  return getUserFromPayload(payload);
}

/**
 * Middleware factory: verify JWT and check role.
 * Usage: app.put('/admin/...', verifyRole('admin', 'sales'), handler)
 */
function verifyRole(...allowedRoles) {
  return (req, res, next) => {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const payload = decodeToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Check role from JWT claim
    const role = payload.role;
    if (!allowedRoles.includes(role)) {
      // Backward compat: admin email in customers table
      if (
        (payload.email === process.env.ADMIN_EMAIL || payload.email === 'admin@drprepper.com') &&
        allowedRoles.includes('admin')
      ) {
        req.user = { ...payload, role: 'admin' };
        return next();
      }
      return res.status(403).json({ error: `Requires role: ${allowedRoles.join(' or ')}` });
    }
    req.user = payload;
    next();
  };
}

// ========================
// EMAIL SETUP
// ========================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ========================
// HELPER FUNCTIONS
// ========================

// Calculate total cases from order items
async function calculateTotalCases(orderId) {
  const result = await pool.query(`
    SELECT SUM(CASE WHEN unit = 'cases' THEN qty ELSE qty * p.cases_per_pallet END) as total
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `, [orderId]);
  
  return result.rows[0]?.total || 0;
}

// Log activity (supports both customer and admin actions)
async function logActivity(customerId, type, detail, options = {}) {
  try {
    const { adminId, entityType, entityId, ipAddress } = options;
    await pool.query(
      `INSERT INTO activity_log (customer_id, type, detail, admin_id, entity_type, entity_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [customerId || null, type, detail, adminId || null, entityType || null, entityId || null, ipAddress || null]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// ========================
// AUTH ENDPOINTS
// ========================

// Register new customer (creates pending registration)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, companyName, contactName, phone } = req.body;
    
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Check pending registrations
    const pendingExisting = await pool.query('SELECT id FROM pending_registrations WHERE email = $1', [email]);
    if (pendingExisting.rows.length > 0) {
      return res.status(409).json({ error: 'Registration already pending approval' });
    }
    
    const registrationId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO pending_registrations (id, company_name, contact_name, email, phone, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [registrationId, companyName, contactName || '', email, phone || '', passwordHash, 'pending']
    );
    
    // TODO: Email admin about pending registration
    
    return res.status(201).json({
      success: true,
      message: 'Registration submitted for admin approval'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // ── Check users table first (admin/sales/view-only portal users) ──
    const userResult = await pool.query(
      'SELECT id, email, password_hash, role, active FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      
      if (!user.active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        // Log failed login attempt
        await logActivity(null, 'failed_login', `Failed login attempt for user: ${email}`, {
          entityType: 'user',
          entityId: user.id,
          failureReason: 'invalid_password',
          ipAddress: req.ip
        });
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      
      // 24h expiration for admin tokens
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, table: 'users' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        vendor: {
          id: user.id,
          email: user.email,
          name: user.email,
          companyName: 'DR Prepper',
          role: user.role
        },
        token,
        role: user.role
      });
    }
    
    // ── Fallback: check customers table ──
    const custResult = await pool.query(
      'SELECT id, email, company_name, contact_name, password_hash, active FROM customers WHERE email = $1',
      [email]
    );
    
    if (custResult.rows.length === 0) {
      // Log failed login attempt for non-existent account
      await logActivity(null, 'failed_login', `Failed login attempt for non-existent account: ${email}`, {
        failureReason: 'account_not_found',
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const customer = custResult.rows[0];
    
    if (!customer.active) {
      // Log failed login attempt for inactive account
      await logActivity(customer.id, 'failed_login', `Login attempt on inactive account`, {
        failureReason: 'account_inactive',
        ipAddress: req.ip
      });
      return res.status(403).json({ error: 'Account is inactive' });
    }
    
    const passwordMatch = await bcrypt.compare(password, customer.password_hash);
    if (!passwordMatch) {
      // Log failed login attempt for wrong password
      await logActivity(customer.id, 'failed_login', `Failed login attempt - wrong password`, {
        failureReason: 'invalid_password',
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Determine role: admin email gets admin role (backward compat)
    const isAdminEmail = customer.email === process.env.ADMIN_EMAIL || customer.email === 'admin@drprepper.com';
    const role = isAdminEmail ? 'admin' : 'customer';
    const expiresIn = isAdminEmail ? '24h' : '7d';
    
    // Update last login
    await pool.query('UPDATE customers SET last_login = NOW() WHERE id = $1', [customer.id]);
    
    // Log login
    await logActivity(customer.id, 'login', 'Signed in');
    
    const token = jwt.sign(
      { sub: customer.id, email: customer.email, role, table: 'customers' },
      JWT_SECRET,
      { expiresIn }
    );
    
    return res.json({
      success: true,
      vendor: {
        id: customer.id,
        email: customer.email,
        name: customer.contact_name,
        companyName: customer.company_name,
        role
      },
      token,
      role
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// PASSWORD RESET ENDPOINTS
// ========================

// POST /api/auth/reset-password - Generate reset token and send email
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const validation = validateResetPasswordRequest(req.body);
    if (!validation.valid) {
      return res.status(422).json({
        success: false,
        statusCode: 422,
        errors: validation.errors
      });
    }

    const email = req.body.email.toLowerCase().trim();
    
    // Check if user exists (users or customers table)
    let user = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    let isAdmin = user.rows.length > 0;
    
    if (!isAdmin) {
      user = await pool.query('SELECT id, email FROM customers WHERE email = $1', [email]);
    }
    
    // Always respond with success to avoid leaking user existence
    if (user.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: 'If this email exists, you will receive a password reset link.' 
      });
    }

    // Generate reset token (32 chars)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(16).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    const userId = user.rows[0].id;
    const table = isAdmin ? 'users' : 'customers';
    
    // Store reset token in database
    await pool.query(
      `UPDATE ${table} SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
      [resetToken, resetTokenExpires, userId]
    );

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'https://wholesale.drprepperusa.com'}/reset?token=${resetToken}`;
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@drprepperusa.com',
        to: email,
        subject: 'Password Reset Request - DR Prepper Wholesale',
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>Or paste this link: ${resetLink}</p>
          <hr>
          <p>If you didn't request this, ignore this email.</p>
        `
      });
    } catch (emailErr) {
      console.error('Error sending reset email:', emailErr);
      // Don't fail the API request if email fails
    }

    res.json({
      success: true,
      message: 'If this email exists, you will receive a password reset link.'
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password/confirm - Validate token and update password
app.post('/api/auth/reset-password/confirm', async (req, res) => {
  try {
    const validation = validateResetPasswordConfirm(req.body);
    if (!validation.valid) {
      return res.status(422).json({
        success: false,
        statusCode: 422,
        errors: validation.errors
      });
    }

    const { token, new_password } = req.body;

    // Find user with valid reset token
    let result = await pool.query(
      'SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    
    let isAdmin = result.rows.length > 0;
    let user = result.rows[0];
    let table = 'users';

    if (!user) {
      result = await pool.query(
        'SELECT id, email FROM customers WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );
      isAdmin = false;
      user = result.rows[0];
      table = 'customers';
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(new_password, 12);

    // Update password and clear reset tokens
    await pool.query(
      `UPDATE ${table} SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, password_changed_at = NOW() WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (err) {
    console.error('Password reset confirm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================
// PRODUCT ENDPOINTS
// ========================

// Get all products (filtered by customer visibility if not admin)
// Supports pagination: ?page=1&limit=50
// Supports search: ?search=chips&super_category=snacks&visibility=all|hidden|visible&stock=all|in-stock|oos
app.get('/api/products', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const payload = token ? decodeToken(token) : null;
    const isAdmin = payload && ['admin', 'sales', 'view-only'].includes(payload.role);
    const isAdminByEmail = payload && (payload.email === process.env.ADMIN_EMAIL || payload.email === 'admin@drprepper.com');
    const hasAdminAccess = isAdmin || isAdminByEmail;

    // Pagination params (limit=0 means return all; no limit param also returns all)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const rawLimit = req.query.limit !== undefined ? parseInt(req.query.limit) : 0;
    const limit = rawLimit > 0 ? Math.min(200, rawLimit) : 0; // 0 = all
    const offset = limit > 0 ? (page - 1) * limit : 0;

    // Search / filter params
    const search = (req.query.search || '').trim();
    const superCategoryFilter = (req.query.super_category || '').trim();
    const visibilityFilter = req.query.visibility || 'all'; // all|hidden|visible
    const stockFilter = req.query.stock || 'all'; // all|in-stock|oos

    // Admin gets full fields; customers get sanitized fields (no visibility data)
    const selectFields = hasAdminAccess
      ? `p.id, p.name, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category, c.is_hidden as category_is_hidden,
         s.id as super_category_id, s.name as super_category,
         p.image_url, p.sku, p.sort_order, p.is_hidden, p.is_oos, p.show_price, p.created_at`
      : `p.id, p.name, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category,
         s.id as super_category_id, s.name as super_category,
         p.image_url, p.sku, p.sort_order, p.show_price, p.created_at`;

    let query = `SELECT ${selectFields}
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN super_categories s ON p.super_category_id = s.id
      WHERE 1=1`;

    const params = [];

    if (!hasAdminAccess) {
      // Customers: only show visible, non-hidden products
      query += ' AND p.is_hidden = FALSE AND c.is_hidden = FALSE';

      if (token) {
        const customer = await verifyToken(token);
        if (customer) {
          query += ` AND s.id NOT IN (
            SELECT super_category_id FROM customer_cat_hidden WHERE customer_id = $${params.length + 1}
          )`;
          params.push(customer.id);
          query += ` AND p.id NOT IN (
            SELECT product_id FROM customer_overrides WHERE customer_id = $${params.length + 1} AND is_hidden = TRUE
          )`;
          params.push(customer.id);
        }
      }
    } else {
      // Admin filters: visibility
      if (visibilityFilter === 'hidden') {
        query += ' AND p.is_hidden = TRUE';
      } else if (visibilityFilter === 'visible') {
        query += ' AND p.is_hidden = FALSE';
      }
      // stock filter
      if (stockFilter === 'in-stock') {
        query += ' AND p.is_oos = FALSE';
      } else if (stockFilter === 'oos') {
        query += ' AND p.is_oos = TRUE';
      }
    }

    // Search filter
    if (search) {
      query += ` AND (
        LOWER(p.name) LIKE LOWER($${params.length + 1})
        OR LOWER(COALESCE(p.sku, '')) LIKE LOWER($${params.length + 1})
        OR LOWER(p.id) LIKE LOWER($${params.length + 1})
      )`;
      params.push(`%${search}%`);
    }

    // Super category filter
    if (superCategoryFilter) {
      query += ` AND LOWER(s.name) = LOWER($${params.length + 1})`;
      params.push(superCategoryFilter);
    }

    // Count query for pagination
    const countQuery = query.replace(
      new RegExp(`^SELECT ${selectFields.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, ''),
      'SELECT COUNT(*)'
    );
    // Simpler count approach
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM products p
       JOIN categories c ON p.category_id = c.id
       JOIN super_categories s ON p.super_category_id = s.id
       WHERE 1=1` + query.substring(query.indexOf('WHERE 1=1') + 'WHERE 1=1'.length),
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);

    query += ' ORDER BY s.sort_order, c.sort_order, p.sort_order';

    if (limit > 0) {
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      products: result.rows,
      pagination: limit > 0 ? {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      } : { total, page: 1, limit: total, pages: 1, hasNext: false, hasPrev: false }
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// FULL-TEXT SEARCH
// ========================

// GET /api/products/search — full-text search on product name and SKU
app.get('/api/products/search', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const payload = token ? decodeToken(token) : null;
    const isAdmin = payload && ['admin', 'sales', 'view-only'].includes(payload.role);
    const hasAdminAccess = isAdmin;

    const searchQuery = (req.query.q || '').trim();
    
    if (!searchQuery || searchQuery.length < 2) {
      return res.json({
        success: true,
        results: [],
        message: 'Search query must be at least 2 characters'
      });
    }

    // Pagination
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    // Build select fields based on admin status
    const selectFields = hasAdminAccess
      ? `p.id, p.name, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category,
         s.id as super_category_id, s.name as super_category,
         p.image_url, p.sku, p.is_hidden, p.is_oos, p.show_price`
      : `p.id, p.name, p.weight, p.bags_per_case, p.cases_per_pallet, p.price,
         p.category_id, c.name as category,
         s.id as super_category_id, s.name as super_category,
         p.image_url, p.sku, p.show_price`;

    // Full-text search query using PostgreSQL's tsvector
    let query = `
      SELECT ${selectFields},
             ts_rank(to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.sku, '')), 
                     plainto_tsquery('english', $1)) AS relevance
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN super_categories s ON p.super_category_id = s.id
      WHERE to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.sku, '')) 
            @@ plainto_tsquery('english', $1)
    `;

    if (!hasAdminAccess) {
      query += ' AND p.is_hidden = FALSE AND c.is_hidden = FALSE';
    }

    query += ` ORDER BY relevance DESC, p.name ASC 
              LIMIT $2 OFFSET $3`;

    const result = await pool.query(query, [searchQuery, limit, offset]);

    // Count total results
    const countQuery = `
      SELECT COUNT(*) as total FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.sku, '')) 
            @@ plainto_tsquery('english', $1)
    `;
    
    let countResult;
    if (hasAdminAccess) {
      countResult = await pool.query(countQuery, [searchQuery]);
    } else {
      const restricedCountQuery = countQuery + ` AND p.is_hidden = FALSE AND c.is_hidden = FALSE`;
      countResult = await pool.query(restricedCountQuery, [searchQuery]);
    }

    res.json({
      success: true,
      query: searchQuery,
      results: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      hasMore: offset + limit < parseInt(countResult.rows[0].total)
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/auth/me — returns current user profile + role
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const payload = decodeToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

    const user = await getUserFromPayload(payload);
    if (!user) return res.status(401).json({ error: 'User not found' });

    res.json({
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
    res.status(500).json({ error: err.message });
  }
});

// Upload product image (admin only)
app.post('/api/products/upload-image', verifyRole('admin', 'sales'), imageUpload.single('image'), async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      // Clean up uploaded file if unauthorized
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Failed to delete uploaded file:', err);
        });
      }
      return res.status(403).json({ error: 'Admin required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const relativePath = `/uploads/products/${req.file.filename}`;
    res.json({
      success: true,
      url: relativePath,
      filename: req.file.filename
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 5MB)' });
      }
    }
    
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// Create product (admin only)
app.post('/api/products', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    // Server-side validation
    const validationResult = validateProduct(req.body);
    if (!validationResult.valid) {
      return res.status(422).json({
        success: false,
        statusCode: 422,
        errors: validationResult.errors
      });
    }
    
    const { id, name, weight, bags_per_case, cases_per_pallet, category_id, super_category_id, image_url, sku, price, show_price } = req.body;
    
    try {
      // Generate product ID and SKU
      const productId = id || uuidv4();
      const productSku = sku || `V${productId.substring(0, 8).toUpperCase()}`;
      
      // If super_category_id not provided, look it up from category_id
      let finalSuperCategoryId = super_category_id;
      console.log('🔍 [ADD_PRODUCT] Initial super_category_id:', finalSuperCategoryId, 'category_id:', category_id);
      
      if (!finalSuperCategoryId && category_id) {
        console.log('🔍 [ADD_PRODUCT] Looking up category:', category_id);
        const catResult = await pool.query(
          'SELECT super_category_id FROM categories WHERE id = $1 LIMIT 1',
          [category_id]
        );
        console.log('🔍 [ADD_PRODUCT] Query result:', catResult.rows);
        
        if (catResult.rows[0] && catResult.rows[0].super_category_id) {
          finalSuperCategoryId = catResult.rows[0].super_category_id;
          console.log('✅ [ADD_PRODUCT] Found super_category_id:', finalSuperCategoryId);
        } else {
          // Category doesn't exist or has no super_category_id
          console.log('❌ [ADD_PRODUCT] Category not found or has no super_category_id');
          return res.status(422).json({
            success: false,
            statusCode: 422,
            errors: {
              category_id: 'Category not found or invalid'
            }
          });
        }
      }
      
      // Ensure super_category_id is not null
      if (!finalSuperCategoryId) {
        console.log('❌ [ADD_PRODUCT] Final validation failed: super_category_id is still null');
        return res.status(422).json({
          success: false,
          statusCode: 422,
          errors: {
            super_category_id: 'Super category ID is required'
          }
        });
      }
      console.log('✅ [ADD_PRODUCT] Proceeding to INSERT with super_category_id:', finalSuperCategoryId);
      
      const result = await pool.query(
        `INSERT INTO products (id, name, weight, bags_per_case, cases_per_pallet, category_id, super_category_id, image_url, sku, price, show_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [productId, name, weight, bags_per_case, cases_per_pallet || 60, category_id, finalSuperCategoryId, image_url, productSku, price || 25.00, show_price !== false]
      );
      
      // Log admin activity
      await logActivity(null, 'admin_product_create', `Created product: ${name}`, {
        adminId: admin.id,
        entityType: 'product',
        entityId: result.rows[0].id,
        ipAddress: req.ip
      });

      res.status(201).json({
        success: true,
        product: result.rows[0]
      });
    } catch (dbErr) {
      // Handle database constraint errors (e.g., duplicate SKU)
      if (dbErr.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          statusCode: 409,
          error: 'SKU already in use'
        });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get category hierarchy with product counts and emoji
app.get('/api/categories/hierarchy', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = token ? await verifyToken(token) : null;
    const isAdmin = token ? await verifyAdminToken(token) : false;

    // Fetch all super categories with their categories
    const superCatsResult = await pool.query(`
      SELECT sc.id, sc.name, sc.sort_order
      FROM super_categories sc
      ORDER BY sc.sort_order
    `);

    // Map of emoji for super categories
    const SUPER_EMOJI = {
      'Chips & Savory Snacks': '🥔',
      'Noodles & Rice': '🍜',
      'Cookies & Wafers': '🍪',
      'Candy & Jelly': '🍬',
      'Ice Cream': '🍦',
      'Beverages': '🥤',
      'Korean Snacks': '🇰🇷'
    };

    // Build the hierarchy
    const hierarchy = [];

    for (const superCat of superCatsResult.rows) {
      // Check if customer has hidden this super category
      if (!isAdmin && customer) {
        const hidden = await pool.query(
          'SELECT id FROM customer_cat_hidden WHERE customer_id = $1 AND super_category_id = $2',
          [customer.id, superCat.id]
        );
        if (hidden.rows.length > 0) continue;
      }

      // Get sub-categories for this super category
      let subCatsQuery = `
        SELECT c.id, c.name, c.sort_order,
               COUNT(DISTINCT p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        WHERE c.super_category_id = $1
      `;

      // Apply category visibility filter if not admin
      if (!isAdmin) {
        subCatsQuery += ` AND (c.is_hidden = FALSE OR c.is_hidden IS NULL)`;
      }

      // Apply product visibility filters if customer
      if (!isAdmin && customer) {
        subCatsQuery += ` AND (p.is_hidden = FALSE OR p.is_hidden IS NULL)
          AND p.id NOT IN (
            SELECT product_id FROM customer_overrides 
            WHERE customer_id = $2 AND is_hidden = TRUE
          )`;
      } else if (!isAdmin) {
        subCatsQuery += ` AND (p.is_hidden = FALSE OR p.is_hidden IS NULL)`;
      }

      subCatsQuery += ` GROUP BY c.id, c.name, c.sort_order ORDER BY c.sort_order`;

      const params = [superCat.id];
      if (!isAdmin && customer) params.push(customer.id);

      const subCatsResult = await pool.query(subCatsQuery, params);

      // Only include super categories that have visible products
      if (subCatsResult.rows.length > 0) {
        const totalProducts = subCatsResult.rows.reduce((sum, cat) => sum + parseInt(cat.product_count), 0);

        hierarchy.push({
          id: superCat.id,
          name: superCat.name,
          emoji: SUPER_EMOJI[superCat.name] || '📦',
          totalProducts: totalProducts,
          categories: subCatsResult.rows.map(cat => ({
            id: cat.id,
            name: cat.name,
            productCount: parseInt(cat.product_count)
          }))
        });
      }
    }

    res.json({
      success: true,
      hierarchy
    });
  } catch (err) {
    console.error('Get category hierarchy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update product (admin only)
app.put('/api/products/:id', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { id } = req.params;
    const { name, weight, bags_per_case, cases_per_pallet, category_id, super_category_id, image_url, sku, is_hidden, is_oos, show_price, price } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) { updateFields.push(`name = $${paramIndex++}`); values.push(name); }
    if (weight !== undefined) { updateFields.push(`weight = $${paramIndex++}`); values.push(weight); }
    if (bags_per_case !== undefined) { updateFields.push(`bags_per_case = $${paramIndex++}`); values.push(bags_per_case); }
    if (cases_per_pallet !== undefined) { updateFields.push(`cases_per_pallet = $${paramIndex++}`); values.push(cases_per_pallet); }
    if (category_id !== undefined) { updateFields.push(`category_id = $${paramIndex++}`); values.push(category_id); }
    if (super_category_id !== undefined) { updateFields.push(`super_category_id = $${paramIndex++}`); values.push(super_category_id); }
    if (image_url !== undefined) { updateFields.push(`image_url = $${paramIndex++}`); values.push(image_url); }
    if (sku !== undefined) { updateFields.push(`sku = $${paramIndex++}`); values.push(sku); }
    if (is_hidden !== undefined) { updateFields.push(`is_hidden = $${paramIndex++}`); values.push(is_hidden); }
    if (is_oos !== undefined) { updateFields.push(`is_oos = $${paramIndex++}`); values.push(is_oos); }
    if (show_price !== undefined) { updateFields.push(`show_price = $${paramIndex++}`); values.push(show_price); }
    if (price !== undefined) { updateFields.push(`price = $${paramIndex++}`); values.push(price); }
    
    values.push(id);
    
    const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log admin activity — distinguish visibility toggle from full edit
    const updatedProduct = result.rows[0];
    let actionDetail;
    if (updateFields.length === 1 && updateFields[0].startsWith('is_hidden')) {
      actionDetail = `${updatedProduct.is_hidden ? 'Hid' : 'Unhid'} product: ${updatedProduct.name}`;
    } else if (updateFields.length === 1 && updateFields[0].startsWith('is_oos')) {
      actionDetail = `Marked product ${updatedProduct.is_oos ? 'OOS' : 'In Stock'}: ${updatedProduct.name}`;
    } else {
      actionDetail = `Edited product: ${updatedProduct.name}`;
    }
    await logActivity(null, 'admin_product_edit', actionDetail, {
      adminId: admin.id,
      entityType: 'product',
      entityId: id,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete product (admin only)
app.delete('/api/products/:id', verifyRole('admin'), async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { id } = req.params;

    // Fetch product name before deleting for activity log
    const nameResult = await pool.query('SELECT name FROM products WHERE id = $1', [id]);
    if (nameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productName = nameResult.rows[0].name;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log admin activity
    await logActivity(null, 'admin_product_delete', `Deleted product: ${productName}`, {
      adminId: admin.id,
      entityType: 'product',
      entityId: id,
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reorder products (admin only) - drag-drop persistence
app.put('/api/products/reorder', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds must be an array' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < productIds.length; i++) {
        await client.query('UPDATE products SET sort_order = $1 WHERE id = $2', [i, productIds[i]]);
      }
      
      await client.query('COMMIT');
      
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reorder products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// ORDER ENDPOINTS
// ========================

// Place order
app.post('/api/orders', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }
    
    const orderId = uuidv4();
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create order
      await client.query(
        'INSERT INTO orders (id, customer_id, status) VALUES ($1, $2, $3)',
        [orderId, customer.id, 'Pending']
      );
      
      // Add order items
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, qty, unit) VALUES ($1, $2, $3, $4)',
          [orderId, item.product_id, item.qty, item.unit]
        );
      }
      
      // Calculate total cases
      const totalCases = await calculateTotalCases(orderId);
      
      await client.query(
        'UPDATE orders SET total_cases = $1 WHERE id = $2',
        [totalCases, orderId]
      );
      
      // Log activity
      await client.query(
        'INSERT INTO activity_log (customer_id, type, detail) VALUES ($1, $2, $3)',
        [customer.id, 'order', `Ordered ${items.length} products — ${totalCases} total cases`]
      );
      
      await client.query('COMMIT');
      
      // TODO: Email order to admin (DJ)
      
      res.status(201).json({
        success: true,
        orderId,
        totalCases
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get orders (customer: own only, admin: all)
app.get('/api/orders', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    const admin = token ? await verifyAdminToken(token) : false;
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    let query = `
      SELECT o.id, o.customer_id, o.status, o.total_cases, o.created_at,
             c.company_name, c.email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (!admin) {
      query += ' AND o.customer_id = $1';
      params.push(customer.id);
    }
    
    const statusFilter = req.query.status;
    if (statusFilter) {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(statusFilter);
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      orders: result.rows
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single order with items
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    const admin = token ? await verifyAdminToken(token) : false;
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const { orderId } = req.params;
    
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    if (!admin && order.customer_id !== customer.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const itemsResult = await pool.query(`
      SELECT oi.id, oi.product_id, oi.qty, oi.unit, p.name, p.weight, p.bags_per_case
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);
    
    res.json({
      success: true,
      order: {
        ...order,
        items: itemsResult.rows
      }
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update order status (admin only)
app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { orderId } = req.params;
    const { status } = req.body;
    
    if (!['Pending', 'Processing', 'Received'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      success: true,
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// FAVORITES ENDPOINTS
// ========================

// Add to favorites
app.post('/api/favorites', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const { product_id } = req.body;
    
    const result = await pool.query(
      'INSERT INTO favorites (customer_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [customer.id, product_id]
    );
    
    // Log activity
    const prodResult = await pool.query('SELECT name FROM products WHERE id = $1', [product_id]);
    if (prodResult.rows.length > 0) {
      await logActivity(customer.id, 'favorite', `Added "${prodResult.rows[0].name}" to favorites`);
    }
    
    res.status(201).json({
      success: true,
      favorite: result.rows[0] || {}
    });
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove from favorites
app.delete('/api/favorites/:product_id', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const { product_id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM favorites WHERE customer_id = $1 AND product_id = $2 RETURNING *',
      [customer.id, product_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get customer's favorites
app.get('/api/favorites', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const result = await pool.query(`
      SELECT p.id, p.name, p.weight, p.bags_per_case, p.category_id, c.name as category,
             p.super_category_id, s.name as super_category, p.image_url, p.sku
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN super_categories s ON p.super_category_id = s.id
      WHERE f.customer_id = $1
      ORDER BY s.sort_order, c.sort_order, p.sort_order
    `, [customer.id]);
    
    res.json({
      success: true,
      favorites: result.rows
    });
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// CUSTOMER ENDPOINTS (PROFILE)
// ========================

// Get customer profile
app.get('/api/customers/profile', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const result = await pool.query(`
      SELECT id, company_name, contact_name, email, phone, 
             address_line1, address_line2, city, state, zip, country,
             created_at, last_login
      FROM customers WHERE id = $1
    `, [customer.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({
      success: true,
      customer: result.rows[0]
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update customer profile
app.put('/api/customers/profile', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const { contact_name, company_name, email, phone, address_line1, address_line2, city, state, zip, country } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (contact_name !== undefined) { updateFields.push(`contact_name = $${paramIndex++}`); values.push(contact_name); }
    if (company_name !== undefined) { updateFields.push(`company_name = $${paramIndex++}`); values.push(company_name); }
    if (email !== undefined) { updateFields.push(`email = $${paramIndex++}`); values.push(email); }
    if (phone !== undefined) { updateFields.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (address_line1 !== undefined) { updateFields.push(`address_line1 = $${paramIndex++}`); values.push(address_line1); }
    if (address_line2 !== undefined) { updateFields.push(`address_line2 = $${paramIndex++}`); values.push(address_line2); }
    if (city !== undefined) { updateFields.push(`city = $${paramIndex++}`); values.push(city); }
    if (state !== undefined) { updateFields.push(`state = $${paramIndex++}`); values.push(state); }
    if (zip !== undefined) { updateFields.push(`zip = $${paramIndex++}`); values.push(zip); }
    if (country !== undefined) { updateFields.push(`country = $${paramIndex++}`); values.push(country); }
    
    values.push(customer.id);
    
    const query = `UPDATE customers SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      customer: result.rows[0]
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Change password
app.post('/api/customers/change-password', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const customer = await verifyToken(token);
    
    if (!customer) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const result = await pool.query('SELECT password_hash FROM customers WHERE id = $1', [customer.id]);
    const customerData = result.rows[0];
    
    const passwordMatch = await bcrypt.compare(current_password, customerData.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    
    await pool.query('UPDATE customers SET password_hash = $1 WHERE id = $2', [newPasswordHash, customer.id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// ADMIN ENDPOINTS
// ========================

// Get all customers (admin only)
app.get('/api/admin/customers', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const result = await pool.query(`
      SELECT id, company_name, contact_name, email, phone, view_preset, active, created_at, last_login
      FROM customers
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      customers: result.rows
    });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new customer directly (admin only)
app.post('/api/admin/customers', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);

    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }

    const { company_name, email, preset, contact_name, phone, password } = req.body;

    if (!company_name || !email) {
      return res.status(400).json({ error: 'company_name and email are required' });
    }

    // Check for existing email
    const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate a temporary password if not provided
    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const customerId = uuidv4();

    await pool.query(
      `INSERT INTO customers (id, company_name, contact_name, email, phone, password_hash, view_preset, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())`,
      [customerId, company_name, contact_name || '', email, phone || '', passwordHash, preset || 'full']
    );

    const result = await pool.query(
      'SELECT id, company_name, contact_name, email, view_preset, active FROM customers WHERE id = $1',
      [customerId]
    );

    return res.status(201).json({
      success: true,
      customer: result.rows[0],
      tempPassword: !password ? tempPassword : undefined
    });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get customer visibility overrides (admin only)
app.get('/api/admin/customers/:customerId/view', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { customerId } = req.params;
    
    // Get category-level hidden
    const catResult = await pool.query(`
      SELECT s.id, s.name FROM customer_cat_hidden cch
      JOIN super_categories s ON cch.super_category_id = s.id
      WHERE cch.customer_id = $1
    `, [customerId]);
    
    // Get product-level overrides
    const prodResult = await pool.query(`
      SELECT product_id, is_hidden, is_oos FROM customer_overrides
      WHERE customer_id = $1
    `, [customerId]);
    
    res.json({
      success: true,
      catHidden: catResult.rows.map(r => r.id),
      customHidden: prodResult.rows.filter(p => p.is_hidden).map(p => p.product_id),
      customOos: prodResult.rows.filter(p => p.is_oos).map(p => p.product_id)
    });
  } catch (err) {
    console.error('Get view overrides error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update customer visibility overrides (admin only)
app.put('/api/admin/customers/:customerId/view', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { customerId } = req.params;
    const { catHidden, customHidden, customOos } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear existing overrides
      await client.query('DELETE FROM customer_cat_hidden WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM customer_overrides WHERE customer_id = $1', [customerId]);
      
      // Set category-level hidden
      if (Array.isArray(catHidden)) {
        for (const catId of catHidden) {
          await client.query(
            'INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES ($1, $2)',
            [customerId, catId]
          );
        }
      }
      
      // Set product-level overrides
      if (Array.isArray(customHidden) || Array.isArray(customOos)) {
        const allProducts = new Set([...(customHidden || []), ...(customOos || [])]);
        
        for (const prodId of allProducts) {
          const isHidden = customHidden?.includes(prodId) || false;
          const isOos = customOos?.includes(prodId) || false;
          
          await client.query(
            'INSERT INTO customer_overrides (customer_id, product_id, is_hidden, is_oos) VALUES ($1, $2, $3, $4)',
            [customerId, prodId, isHidden, isOos]
          );
        }
      }
      
      await client.query('COMMIT');
      
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update view overrides error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get activity log (admin only)
app.get('/api/admin/activity', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { customer_id, type, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT al.id, al.customer_id, al.admin_id, al.entity_type, al.entity_id,
             c.company_name, c.contact_name, 
             al.type, al.detail, al.created_at
      FROM activity_log al
      LEFT JOIN customers c ON al.customer_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (customer_id) {
      query += ` AND al.customer_id = $${paramIndex++}`;
      params.push(customer_id);
    }
    
    if (type) {
      query += ` AND al.type = $${paramIndex++}`;
      params.push(type);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      activities: result.rows
    });
  } catch (err) {
    console.error('Get activity log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get settings (admin only for PUT)
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update settings (admin only)
app.put('/api/settings/:key', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }
    
    const { key } = req.params;
    const { value } = req.body;
    
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// HEALTH CHECK
// ========================
// ========================
// MISSING ADMIN ENDPOINTS (Vue portal compatibility)
// ========================

// POST /api/admin/reorder-products
app.post('/api/admin/reorder-products', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ error: 'Admin required' });

    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds must be an array' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < productIds.length; i++) {
        await client.query('UPDATE products SET sort_order = $1 WHERE id = $2', [i, productIds[i]]);
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reorder products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/activity-log (alias for /api/admin/activity)
app.get('/api/admin/activity-log', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ error: 'Admin required' });

    const { customer_id, type, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT al.id, al.customer_id, al.admin_id, al.entity_type, al.entity_id,
             c.company_name, c.contact_name,
             al.type, al.detail, al.created_at
      FROM activity_log al
      LEFT JOIN customers c ON al.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (customer_id) { query += ` AND al.customer_id = $${paramIndex++}`; params.push(customer_id); }
    if (type && type !== 'all') { query += ` AND al.type = $${paramIndex++}`; params.push(type); }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json({ success: true, activities: result.rows });
  } catch (err) {
    console.error('Get activity log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activity-log (frontend-initiated logging, requires auth)
app.post('/api/activity-log', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required', statusCode: 401 });
    }

    const customer = await verifyToken(token);
    const admin = await verifyAdminToken(token);

    if (!customer && !admin) {
      return res.status(401).json({ success: false, error: 'Invalid token', statusCode: 401 });
    }

    const { type, detail, entityType, entityId } = req.body;

    if (!type || !detail) {
      return res.status(400).json({ success: false, error: 'type and detail are required', statusCode: 400 });
    }

    await logActivity(
      customer ? customer.id : null,
      type,
      detail,
      {
        adminId: admin ? admin.id : null,
        entityType: entityType || null,
        entityId: entityId || null,
        ipAddress: req.ip
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Post activity log error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', statusCode: 500 });
  }
});

// GET /api/activity-log (alias, requires auth)
app.get('/api/activity-log', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required', statusCode: 401 });
    }
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ success: false, error: 'Admin required', statusCode: 403 });

    const { customer_id, type, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT al.id, al.customer_id, al.admin_id, al.entity_type, al.entity_id,
             c.company_name, c.contact_name,
             al.type, al.detail, al.created_at
      FROM activity_log al
      LEFT JOIN customers c ON al.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (customer_id) { query += ` AND al.customer_id = $${paramIndex++}`; params.push(customer_id); }
    if (type && type !== 'all') { query += ` AND al.type = $${paramIndex++}`; params.push(type); }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json({ success: true, activities: result.rows });
  } catch (err) {
    console.error('Get activity log error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', statusCode: 500 });
  }
});

// GET /api/admin/customer-insights
app.get('/api/admin/customer-insights', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ error: 'Admin required' });

    const result = await pool.query(`
      SELECT
        c.id, c.company_name, c.contact_name, c.email, c.view_preset, c.last_login,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(o.total_cases), 0) AS total_cases,
        MAX(o.created_at) AS last_order_date
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE c.id != 'admin'
      GROUP BY c.id, c.company_name, c.contact_name, c.email, c.view_preset, c.last_login
      ORDER BY total_orders DESC, c.company_name
    `);

    // For each customer, get their top 3 products
    const insights = await Promise.all(result.rows.map(async (cust) => {
      const topProds = await pool.query(`
        SELECT p.name, SUM(oi.qty) AS qty
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.customer_id = $1
        GROUP BY p.name
        ORDER BY qty DESC
        LIMIT 3
      `, [cust.id]);

      return {
        ...cust,
        total_orders: parseInt(cust.total_orders) || 0,
        total_cases: parseInt(cust.total_cases) || 0,
        top_products: topProds.rows
      };
    }));

    res.json({ success: true, insights });
  } catch (err) {
    console.error('Customer insights error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers (public alias for admin customer list — used by Vue portal)
app.get('/api/customers', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ error: 'Admin required' });

    const result = await pool.query(`
      SELECT id, company_name, contact_name, email, view_preset, active
      FROM customers
      WHERE id != 'admin'
      ORDER BY company_name
    `);

    res.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/customer-overrides/:customerId
app.get('/api/admin/customer-overrides/:customerId', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ error: 'Admin required' });

    const { customerId } = req.params;

    const catResult = await pool.query(`
      SELECT s.id, s.name FROM customer_cat_hidden cch
      JOIN super_categories s ON cch.super_category_id = s.id
      WHERE cch.customer_id = $1
    `, [customerId]);

    const prodResult = await pool.query(`
      SELECT product_id, is_hidden, is_oos FROM customer_overrides
      WHERE customer_id = $1
    `, [customerId]);

    res.json({
      success: true,
      catHidden: catResult.rows.map(r => r.id),
      hiddenProducts: prodResult.rows.filter(p => p.is_hidden).map(p => p.product_id)
    });
  } catch (err) {
    console.error('Get customer overrides error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/customer-overrides
app.post('/api/admin/customer-overrides', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ error: 'Admin required' });

    const { customerId, catHidden, hiddenProducts } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update category-level hidden
      await client.query('DELETE FROM customer_cat_hidden WHERE customer_id = $1', [customerId]);
      if (Array.isArray(catHidden)) {
        for (const catId of catHidden) {
          await client.query(
            'INSERT INTO customer_cat_hidden (customer_id, super_category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [customerId, catId]
          );
        }
      }

      // Update product-level hidden
      await client.query('DELETE FROM customer_overrides WHERE customer_id = $1 AND is_hidden = TRUE', [customerId]);
      if (Array.isArray(hiddenProducts)) {
        for (const prodId of hiddenProducts) {
          await client.query(
            'INSERT INTO customer_overrides (customer_id, product_id, is_hidden, is_oos) VALUES ($1, $2, TRUE, FALSE) ON CONFLICT (customer_id, product_id) DO UPDATE SET is_hidden = TRUE',
            [customerId, prodId]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update customer overrides error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// PRICE OVERRIDE ENDPOINTS
// ========================

// GET /api/admin/products/:productId/with-overrides
// Returns product details + all customer overrides for that product
app.get('/api/admin/products/:productId/with-overrides', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { productId } = req.params;

    // Get product details
    const productResult = await pool.query(`
      SELECT p.id, p.name, p.price, p.is_hidden, p.is_oos, p.category_id, p.super_category_id,
             p.weight, p.bags_per_case, p.cases_per_pallet, p.image_url, p.sku, p.show_price
      FROM products p
      WHERE p.id = $1
    `, [productId]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    // Get all customer overrides for this product
    const overridesResult = await pool.query(`
      SELECT co.customer_id, co.override_price, co.is_hidden, co.is_oos
      FROM customer_overrides co
      WHERE co.product_id = $1
    `, [productId]);

    res.json({
      success: true,
      product,
      overrides: overridesResult.rows
    });
  } catch (err) {
    console.error('Get product with overrides error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/customers/:customerId/products
// Returns all products visible to a specific customer (with override logic applied)
app.get('/api/admin/customers/:customerId/products', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { customerId } = req.params;

    // Verify customer exists
    const customerResult = await pool.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get all products with customer overrides
    const productsResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price as default_price,
        COALESCE(co.override_price, p.price) as price,
        COALESCE(co.is_hidden, p.is_hidden) as is_hidden,
        COALESCE(co.is_oos, p.is_oos) as is_oos,
        co.override_price,
        co.is_hidden as override_is_hidden,
        co.is_oos as override_is_oos,
        p.category_id,
        p.super_category_id,
        p.weight,
        p.bags_per_case,
        p.image_url,
        p.sku
      FROM products p
      LEFT JOIN customer_overrides co ON p.id = co.product_id AND co.customer_id = $1
      ORDER BY p.id
    `, [customerId]);

    res.json({
      success: true,
      customerId,
      products: productsResult.rows
    });
  } catch (err) {
    console.error('Get customer products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products/:productId/override
// Set or update override for a customer (price, is_hidden, is_oos)
app.post('/api/admin/products/:productId/override', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { customer_id, override_price, is_hidden, is_oos } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id required' });
    }

    // Verify product exists
    const productResult = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify customer exists
    const customerResult = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Upsert override
    const result = await pool.query(`
      INSERT INTO customer_overrides (customer_id, product_id, override_price, is_hidden, is_oos)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET 
        override_price = COALESCE($3, customer_overrides.override_price),
        is_hidden = COALESCE($4, customer_overrides.is_hidden),
        is_oos = COALESCE($5, customer_overrides.is_oos)
      RETURNING *
    `, [customer_id, productId, override_price || null, is_hidden !== undefined ? is_hidden : null, is_oos !== undefined ? is_oos : null]);

    res.json({
      success: true,
      override: result.rows[0]
    });
  } catch (err) {
    console.error('Set override error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/products/:productId/override/:customerId
// Clear/remove an override for a customer
app.delete('/api/admin/products/:productId/override/:customerId', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { productId, customerId } = req.params;

    // Delete the override
    const result = await pool.query(`
      DELETE FROM customer_overrides
      WHERE product_id = $1 AND customer_id = $2
      RETURNING *
    `, [productId, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Override not found' });
    }

    res.json({
      success: true,
      deleted: result.rows[0]
    });
  } catch (err) {
    console.error('Delete override error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/products/bulk
// Edit default product prices/properties (applies to all customers without specific overrides)
app.patch('/api/admin/products/bulk', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { ids, price, super_category_id, category_id, is_hidden } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }

    // Build dynamic UPDATE statement
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      params.push(price);
    }
    if (super_category_id !== undefined) {
      updates.push(`super_category_id = $${paramCount++}`);
      params.push(super_category_id);
    }
    if (category_id !== undefined) {
      updates.push(`category_id = $${paramCount++}`);
      params.push(category_id);
    }
    if (is_hidden !== undefined) {
      updates.push(`is_hidden = $${paramCount++}`);
      params.push(is_hidden);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'At least one field to update required' });
    }

    // Add ids to params
    params.push(ids);
    const query = `
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = ANY($${paramCount})
      RETURNING id, name, price, is_hidden
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      updated: result.rows.length,
      products: result.rows
    });
  } catch (err) {
    console.error('Bulk update products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products/bulk-override
// Bulk set price overrides for multiple products for a specific customer
app.post('/api/admin/products/bulk-override', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { product_ids, customer_id, override_price, is_hidden, is_oos } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'product_ids array required' });
    }
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id required' });
    }

    // Verify customer exists
    const customerResult = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const productId of product_ids) {
        const result = await client.query(`
          INSERT INTO customer_overrides (customer_id, product_id, override_price, is_hidden, is_oos)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (customer_id, product_id)
          DO UPDATE SET 
            override_price = COALESCE($3, customer_overrides.override_price),
            is_hidden = COALESCE($4, customer_overrides.is_hidden),
            is_oos = COALESCE($5, customer_overrides.is_oos)
          RETURNING *
        `, [customer_id, productId, override_price || null, is_hidden !== undefined ? is_hidden : null, is_oos !== undefined ? is_oos : null]);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.json({
        success: true,
        count: results.length,
        overrides: results
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Bulk override error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/categories (super categories list)
app.get('/api/admin/categories', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    if (!admin) return res.status(403).json({ error: 'Admin required' });

    const result = await pool.query('SELECT id, name FROM super_categories ORDER BY name');
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id (update category visibility)
app.put('/api/categories/:id', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_hidden } = req.body;

    if (typeof is_hidden !== 'boolean') {
      return res.status(400).json({ error: 'is_hidden must be a boolean' });
    }

    const result = await pool.query(
      'UPDATE categories SET is_hidden = $1 WHERE id = $2 RETURNING *',
      [is_hidden, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, category: result.rows[0] });
  } catch (err) {
    console.error('Update category visibility error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id/visibility — toggle ALL products in this category
app.put('/api/categories/:id/visibility', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_hidden } = req.body;

    if (typeof is_hidden !== 'boolean') {
      return res.status(400).json({ error: 'is_hidden must be a boolean' });
    }

    // Update all products in this category
    const result = await pool.query(
      'UPDATE products SET is_hidden = $1 WHERE category_id = $2 RETURNING id',
      [is_hidden, id]
    );

    res.json({
      success: true,
      updated: result.rows.length,
      message: `${result.rows.length} products ${is_hidden ? 'hidden' : 'shown'}`
    });
  } catch (err) {
    console.error('Category visibility bulk update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/bulk/visibility — bulk hide/show products
app.post('/api/admin/bulk/visibility', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    const { productIds, is_hidden } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds must be a non-empty array' });
    }
    if (typeof is_hidden !== 'boolean') {
      return res.status(400).json({ error: 'is_hidden must be a boolean' });
    }

    const placeholders = productIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE products SET is_hidden = $1 WHERE id IN (${placeholders}) RETURNING id`,
      [is_hidden, ...productIds]
    );

    // Log bulk operation
    if (admin) {
      await logActivity(null, 'admin_bulk_update', `Bulk visibility update: ${result.rows.length} products ${is_hidden ? 'hidden' : 'shown'}`, {
        adminId: admin.id,
        entityType: 'products',
        operationType: 'bulk_visibility_update',
        affected_count: result.rows.length,
        product_ids: productIds,
        ipAddress: req.ip
      });
    }

    res.json({
      success: true,
      updated: result.rows.length,
      message: `${result.rows.length} products ${is_hidden ? 'hidden' : 'shown'}`
    });
  } catch (err) {
    console.error('Bulk visibility update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/bulk/delete — bulk delete products
app.post('/api/admin/bulk/delete', verifyRole('admin'), async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds must be a non-empty array' });
    }

    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `DELETE FROM products WHERE id IN (${placeholders}) RETURNING id`,
      productIds
    );

    // Log bulk deletion
    if (admin) {
      await logActivity(null, 'admin_bulk_delete', `Bulk delete: ${result.rows.length} products deleted`, {
        adminId: admin.id,
        entityType: 'products',
        operationType: 'bulk_delete',
        affected_count: result.rows.length,
        product_ids: productIds,
        ipAddress: req.ip
      });
    }

    res.json({
      success: true,
      deleted: result.rows.length,
      message: `${result.rows.length} products deleted`
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ROOT ROUTE
// ========================
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ========================
// ========================
// BACKUP STATUS
// ========================

app.get('/api/backup/status', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }

    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({
        success: true,
        lastBackup: null,
        message: 'No backups found'
      });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sql') || f.endsWith('.zip'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        stat: fs.statSync(path.join(backupDir, f))
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    if (files.length === 0) {
      return res.json({
        success: true,
        lastBackup: null,
        message: 'No backups found'
      });
    }

    const latest = files[0];
    res.json({
      success: true,
      lastBackup: {
        filename: latest.name,
        timestamp: latest.stat.mtime.toISOString(),
        size: latest.stat.size
      }
    });
  } catch (err) {
    console.error('Backup status error:', err);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

// ========================
// LOG RETENTION STATUS
// ========================

app.get('/api/admin/logs/status', async (req, res) => {
  try {
    const token = extractToken(req.headers.authorization);
    const admin = await verifyAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin required' });
    }

    // Get log stats
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM activity_log');
    const total = parseInt(totalResult.rows[0].total);
    
    // Get oldest log
    const oldestResult = await pool.query(
      'SELECT created_at FROM activity_log ORDER BY created_at ASC LIMIT 1'
    );
    const oldest = oldestResult.rows[0]?.created_at || null;
    
    // Get logs by type in last 30 days
    const recentResult = await pool.query(
      `SELECT action, COUNT(*) as count 
       FROM activity_log 
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY action
       ORDER BY count DESC`
    );
    
    res.json({
      success: true,
      logStats: {
        totalRecords: total,
        oldestLog: oldest,
        retentionDays: 365,
        lastCleanup: process.env.LAST_LOG_CLEANUP || 'unknown'
      },
      recentActivity: recentResult.rows
    });
  } catch (err) {
    console.error('Log status error:', err);
    res.status(500).json({ error: 'Failed to get log status' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================
// ERROR HANDLING
// ========================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ========================
// CATEGORIES & SORTING
// ========================

// GET /api/admin/categories-tree — Fetch all categories and super-categories with sort order
app.get('/api/admin/categories-tree', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const superResult = await pool.query(`
      SELECT id, name, sort_order
      FROM super_categories
      ORDER BY sort_order ASC, name ASC
    `);
    
    const catsResult = await pool.query(`
      SELECT id, name, super_category_id, sort_order
      FROM categories
      ORDER BY super_category_id ASC, sort_order ASC, name ASC
    `);

    res.json({
      success: true,
      superCategories: superResult.rows,
      categories: catsResult.rows
    });
  } catch (err) {
    console.error('Get categories tree error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/super-categories-reorder — Update super-category sort order
app.post('/api/admin/super-categories-reorder', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        const { id, sort_order } = update;
        await client.query(
          'UPDATE super_categories SET sort_order = $1 WHERE id = $2',
          [sort_order, id]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, count: updates.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Super categories reorder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/categories-reorder — Update category sort order
app.post('/api/admin/categories-reorder', verifyRole('admin', 'sales'), async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        const { id, sort_order } = update;
        await client.query(
          'UPDATE categories SET sort_order = $1 WHERE id = $2',
          [sort_order, id]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, count: updates.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Categories reorder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// CART PERSISTENCE ENDPOINTS
// ========================

/**
 * GET /api/cart
 * Returns current customer's cart items with product details
 * Response: { items: [...], total_items, total_cost }
 */
app.get('/api/cart', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    const payload = decodeToken(token);
    
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = payload.sub;

    // Get all cart items with product details
    const result = await pool.query(`
      SELECT 
        c.id,
        c.product_id,
        p.name as product_name,
        p.price,
        p.image_url,
        c.quantity,
        (p.price * c.quantity) as total_price,
        p.weight,
        p.bags_per_case
      FROM carts c
      JOIN products p ON c.product_id = p.id
      WHERE c.customer_id = $1
      ORDER BY c.created_at ASC
    `, [customerId]);

    const items = result.rows;
    const totalItems = items.length;
    const totalCost = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    res.json({
      success: true,
      items,
      total_items: totalItems,
      total_cost: totalCost
    });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/cart/items
 * Add item to cart or update quantity if already exists
 * Body: { product_id, quantity }
 * Returns updated cart
 */
app.post('/api/cart/items', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    const payload = decodeToken(token);
    
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = payload.sub;
    const { product_id, quantity } = req.body;

    // Validate input
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: 'quantity is required' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    // Check if product exists
    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Upsert cart item (insert or update)
    await pool.query(`
      INSERT INTO carts (customer_id, product_id, quantity, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET quantity = $3, updated_at = NOW()
    `, [customerId, product_id, qty]);

    // Return updated cart
    const cartResult = await pool.query(`
      SELECT 
        c.id,
        c.product_id,
        p.name as product_name,
        p.price,
        p.image_url,
        c.quantity,
        (p.price * c.quantity) as total_price,
        p.weight,
        p.bags_per_case
      FROM carts c
      JOIN products p ON c.product_id = p.id
      WHERE c.customer_id = $1
      ORDER BY c.created_at ASC
    `, [customerId]);

    const items = cartResult.rows;
    const totalItems = items.length;
    const totalCost = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    res.json({
      success: true,
      items,
      total_items: totalItems,
      total_cost: totalCost
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/cart/items/:itemId
 * Update quantity for a specific cart item
 * Body: { quantity }
 * Returns updated cart item
 */
app.put('/api/cart/items/:itemId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    const payload = decodeToken(token);
    
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = payload.sub;
    const itemId = req.params.itemId;
    const { quantity } = req.body;

    // Validate quantity
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: 'quantity is required' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative integer' });
    }

    // Check if item exists and belongs to this customer
    const itemCheck = await pool.query(
      'SELECT id FROM carts WHERE id = $1 AND customer_id = $2',
      [itemId, customerId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // If quantity is 0, remove the item
    if (qty === 0) {
      await pool.query(
        'DELETE FROM carts WHERE id = $1',
        [itemId]
      );
    } else {
      // Update quantity
      await pool.query(
        'UPDATE carts SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [qty, itemId]
      );
    }

    // Return updated cart
    const cartResult = await pool.query(`
      SELECT 
        c.id,
        c.product_id,
        p.name as product_name,
        p.price,
        p.image_url,
        c.quantity,
        (p.price * c.quantity) as total_price,
        p.weight,
        p.bags_per_case
      FROM carts c
      JOIN products p ON c.product_id = p.id
      WHERE c.customer_id = $1
      ORDER BY c.created_at ASC
    `, [customerId]);

    const items = cartResult.rows;
    const totalItems = items.length;
    const totalCost = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    res.json({
      success: true,
      items,
      total_items: totalItems,
      total_cost: totalCost
    });
  } catch (err) {
    console.error('Update cart item error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart
 * Returns updated cart
 */
app.delete('/api/cart/items/:itemId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    const payload = decodeToken(token);
    
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = payload.sub;
    const itemId = req.params.itemId;

    // Check if item exists and belongs to this customer
    const itemCheck = await pool.query(
      'SELECT id FROM carts WHERE id = $1 AND customer_id = $2',
      [itemId, customerId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Delete the item
    await pool.query(
      'DELETE FROM carts WHERE id = $1',
      [itemId]
    );

    // Return updated cart
    const cartResult = await pool.query(`
      SELECT 
        c.id,
        c.product_id,
        p.name as product_name,
        p.price,
        p.image_url,
        c.quantity,
        (p.price * c.quantity) as total_price,
        p.weight,
        p.bags_per_case
      FROM carts c
      JOIN products p ON c.product_id = p.id
      WHERE c.customer_id = $1
      ORDER BY c.created_at ASC
    `, [customerId]);

    const items = cartResult.rows;
    const totalItems = items.length;
    const totalCost = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    res.json({
      success: true,
      items,
      total_items: totalItems,
      total_cost: totalCost
    });
  } catch (err) {
    console.error('Delete cart item error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/cart
 * Clear entire cart
 * Returns empty cart
 */
app.delete('/api/cart', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    const payload = decodeToken(token);
    
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = payload.sub;

    // Delete all cart items for this customer
    await pool.query(
      'DELETE FROM carts WHERE customer_id = $1',
      [customerId]
    );

    // Return empty cart
    res.json({
      success: true,
      items: [],
      total_items: 0,
      total_cost: 0
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ error: err.message });
  }
});

// SPA CATCH-ALL ROUTE (must be after all API routes)
// Serves index.html for all non-API routes so client-side routing works
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 DR Prepper Wholesale Portal running on port ${PORT}`);
});
