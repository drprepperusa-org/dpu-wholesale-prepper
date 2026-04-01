# DR Prepper Wholesale Portal

Full B2B wholesale ordering platform with product catalog, cart, favorites, order management, and admin dashboard.

## Project Structure

```
wholesale-portal/
├── server.js                 # Express API server (all 25+ endpoints)
├── schema.sql               # PostgreSQL database schema
├── package.json             # Dependencies
├── .env.example             # Environment variables template
├── public/                  # Static HTML files (frontend)
│   ├── 01_login.html
│   ├── 02_customer_portal.html
│   └── 03_admin_portal.html
├── scripts/
│   ├── seed.js             # Database seeding (demo customers)
│   └── migrate.js          # Run migrations (create tables)
└── products.json           # Product import data (populate via seed.js)
```

## Quick Start

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb drprepper_wholesale

# Copy environment template
cp .env.example .env

# Edit .env with your PostgreSQL credentials
nano .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Migrations

```bash
npm run migrate
```

This creates all tables: products, customers, orders, favorites, activity_log, settings, etc.

### 4. Import Products

**Option A: From products.json file**

```bash
npm run seed
```

This will read `products.json` and import all 205 products.

**Option B: Extract from Prototype HTML**

The spec comes with a complete prototype (01_login.html, 02_customer_portal.html, 03_admin_portal.html) that has all 205 products as base64-encoded JavaScript arrays in the PRODS and IMGS variables.

To extract and convert:
1. Open the prototype HTML in a browser
2. Run this in the browser console to export:
```javascript
copy(JSON.stringify(PRODS.map(p => ({
  id: p.id,
  name: p.name,
  weight: p.weight,
  bags_per_case: p.pack,
  category_id: 1, // Map to your category_id
  super_category_id: 1, // Map to your super_category_id
  sku: p.id
}))))
```
3. Paste into `products.json` and run `npm run seed`

### 5. Seed Demo Customers

```bash
npm run seed
```

Creates 3 demo customers:
- buyer@happysnacks.com / demo1234 (full catalog access)
- sarah@pacificrimports.com / demo1234 (chips only)
- min@seoulgardens.com / demo1234 (korean only)

### 6. Start Server

```bash
npm start
```

Runs on port 5000 by default (override with PORT env var).

## Frontend

The three HTML files (01_login.html, 02_customer_portal.html, 03_admin_portal.html) are served as static files from `public/`:

- **01_login.html** — Authentication gateway (customer + admin modes)
- **02_customer_portal.html** — Customer catalog, cart, orders, favorites
- **03_admin_portal.html** — Admin dashboard (products, customers, visibility, orders, settings)

These should be the prototype files from the spec document (with all 205 products embedded).

## API Endpoints

### Auth
- `POST /api/auth/login` — Customer login
- `POST /api/auth/register` — Register new customer (creates pending registration)

### Products
- `GET /api/products` — Get products (filtered by customer visibility)
- `POST /api/products` — Create product (admin)
- `PUT /api/products/:id` — Update product (admin)
- `DELETE /api/products/:id` — Delete product (admin)
- `PUT /api/products/reorder` — Update sort order (admin, drag-drop)

### Orders
- `POST /api/orders` — Place order
- `GET /api/orders` — Get customer's orders (or all if admin)
- `GET /api/orders/:orderId` — Get order details
- `PUT /api/orders/:orderId/status` — Update order status (admin)

### Favorites
- `POST /api/favorites` — Add to favorites
- `DELETE /api/favorites/:product_id` — Remove from favorites
- `GET /api/favorites` — Get customer's favorites

### Profile
- `GET /api/customers/profile` — Get profile
- `PUT /api/customers/profile` — Update profile
- `POST /api/customers/change-password` — Change password

### Admin
- `GET /api/admin/customers` — List all customers
- `GET /api/admin/customers/:customerId/view` — Get visibility overrides
- `PUT /api/admin/customers/:customerId/view` — Update visibility overrides
- `GET /api/admin/activity` — Activity log (with filters)
- `GET /api/settings` — Get all settings
- `PUT /api/settings/:key` — Update setting (admin)

## Authentication

Token format: `base64(email:customerId)`

Sent in Authorization header: `Authorization: Bearer <token>`

Admin check: Email matches `ADMIN_EMAIL` env var (default: admin@drprepper.com)

## Data Models

### Customer
```javascript
{
  id: "c1",
  company_name: "Happy Snacks Co.",
  contact_name: "John Buyer",
  email: "buyer@happysnacks.com",
  phone: "(555) 123-4567",
  address_line1, address_line2, city, state, zip, country,
  view_preset: "full", // or "chips", "korean", "noodles", etc.
  active: true,
  created_at, last_login
}
```

### Product
```javascript
{
  id: "LS-CHKN-90G-24",
  name: "Lay's Potato Chips",
  weight: "90g",
  bags_per_case: "24bags/cs",
  cases_per_pallet: 60,
  category_id: 1,
  super_category_id: 1,
  image_url: "https://...",
  sku: "LS-CHKN-90G-24",
  is_hidden: false,
  is_oos: false,
  sort_order: 0
}
```

### Order
```javascript
{
  id: "order-uuid",
  customer_id: "c1",
  status: "Pending", // or "Processing", "Received"
  total_cases: 120,
  created_at,
  items: [
    { product_id, qty, unit: "cases" | "pallets" }
  ]
}
```

### Visibility Overrides
```javascript
// Global product state
prodState[product_id] = {
  hidden: true,        // Hidden for ALL customers
  oos: false
}

// Per-customer overrides
customer.catHidden: [1, 2, 3]  // Super-category IDs hidden for this customer
customer.customHidden: ["prod-id-1", "prod-id-2"]  // Products hidden
customer.customOos: ["prod-id-3"]  // Products marked OOS
```

## TODO / In Progress

- [ ] Email notifications on order placement (send to DJ)
- [ ] Email notifications on order status updates
- [ ] Image upload endpoint (S3/R2 integration)
- [ ] Registration approval workflow (admin reviews pending registrations)
- [ ] Mobile app or responsive improvements
- [ ] Export orders as CSV/PDF

## Deployment

See DEPLOYMENT.md for production setup on Mac mini with PM2.

## Notes

- **JWT**: Uses simple base64 encoding, not cryptographic JWT. Suitable for internal B2B use; upgrade to proper JWT/OAuth for public-facing.
- **Images**: Currently expects `image_url` strings. Prototype has base64-encoded images; migrate to CDN on deployment.
- **Email**: Configured for Gmail; update EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env for other providers.
