# Local Backend Setup - Wholesale Portal

## Overview
The Node.js + Express backend is ready to run locally. You need to:
1. Provide the 205 product list (CSV or JSON)
2. Ensure PostgreSQL is running
3. Create the database
4. Run seed script
5. Start the server

## Prerequisites

### PostgreSQL
The backend connects to PostgreSQL on `localhost:5432`. You can:
- **Use the existing Mac mini instance** (if you have access)
- **Install PostgreSQL locally** (Homebrew on Mac: `brew install postgresql@15`)

Check if PostgreSQL is running:
```bash
psql --version
# If not installed, install with Homebrew:
# brew install postgresql@15
# brew services start postgresql@15
```

### Node.js
Already have npm installed (dependencies fetched above).

## Setup Steps

### 1. Provide Product Data

The seeding script expects ONE of:
- `scripts/products.csv` — CSV file with 205 products
- `scripts/products.json` — JSON array of products

**CSV Format** (recommended):
```
category_id,name,sku,weight,bags_per_case,cases_per_pallet
1,Lay's Chips,LAYS001,155g,24,60
2,Samyang Ramen,SAMY001,120g,30,60
...
```

**JSON Format** (alternative):
```json
[
  { "category_id": 1, "name": "Lay's Chips", "sku": "LAYS001", "weight": "155g", "bags_per_case": 24, "cases_per_pallet": 60 },
  { "category_id": 2, "name": "Samyang Ramen", "sku": "SAMY001", "weight": "120g", "bags_per_case": 30, "cases_per_pallet": 60 }
]
```

Template: See `scripts/products.csv.template`

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE drprepper_wholesale;

# Exit psql
\q

# Or in one command:
createdb -U postgres drprepper_wholesale
```

### 3. Create Schema

```bash
cd /Users/djmac/.openclaw/workspace/wholesale-portal

# Load schema
psql -U postgres -d drprepper_wholesale -f schema.sql
```

### 4. Seed Database

```bash
cd /Users/djmac/.openclaw/workspace/wholesale-portal

npm run seed
```

This will:
- Clear existing data
- Seed super-categories (7)
- Seed categories (22)
- Seed products (205, from your CSV/JSON)
- Create demo customers:
  - **buyer@happysnacks.com / demo1234** (full access)
  - **sarah@pacificrimports.com / demo1234** (chips only)
  - **min@seoulgardenusa.com / demo1234** (korean only)
  - **maria@sunshinemart.com / demo1234** (noodles only)
  - **test@example.com / demo1234** (clean test account)
  - **admin@drprepper.com / admin123** (admin)

### 5. Start Server

```bash
npm start
```

Server runs on `http://localhost:5000`

## Testing

### Health Check
```bash
curl http://localhost:5000/health
```

Response:
```json
{ "status": "ok" }
```

### Login (Customer)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "buyer@happysnacks.com", "password": "demo1234" }'
```

Response:
```json
{
  "token": "YnV5ZXJAaGFwcHlzbmFja3MuY29tOmMx",
  "customer": {
    "id": "c1",
    "company_name": "Happy Snacks Co.",
    "email": "buyer@happysnacks.com",
    "view_preset": "full"
  }
}
```

### Get Products
```bash
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer YnV5ZXJAaGFwcHlzbmFja3MuY29tOmMx"
```

### Get Orders
```bash
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer YnV5ZXJAaGFwcHlzbmFja3MuY29tOmMx"
```

## Environment Variables

Current `.env`:
- **DB_HOST**: localhost
- **DB_PORT**: 5432
- **DB_NAME**: drprepper_wholesale
- **DB_USER**: postgres
- **DB_PASSWORD**: (blank)
- **PORT**: 5000
- **ADMIN_EMAIL**: admin@drprepper.com

Adjust as needed for your PostgreSQL setup.

## Next Steps

Once backend is running:
1. Test API endpoints with Postman or curl
2. Build frontend HTML files (3 pages from spec)
3. Wire frontend to API endpoints
4. Test customer flows (login → browse → cart → order)
5. Test admin flows (login → manage products → view orders → customer visibility)

## Troubleshooting

### "Database does not exist"
```bash
createdb -U postgres drprepper_wholesale
psql -U postgres -d drprepper_wholesale -f schema.sql
```

### "Connection refused" (PostgreSQL)
```bash
# Check if PostgreSQL is running
brew services list

# Start PostgreSQL
brew services start postgresql@15
```

### "Port 5000 already in use"
Change `PORT` in `.env` or kill existing process:
```bash
lsof -i :5000
kill -9 <PID>
```

### "psql: command not found"
```bash
brew install postgresql@15
```

## Architecture Reference

**API Endpoints** (see server.js for full list):
- `POST /api/auth/login` — Customer login
- `POST /api/auth/register` — Customer registration
- `GET /api/products` — Get products (filtered by customer visibility)
- `POST /api/favorites` — Add favorite
- `DELETE /api/favorites/:id` — Remove favorite
- `POST /api/orders` — Place order
- `GET /api/orders` — Get orders (customer: own, admin: all)
- `PUT /api/customers/:id/profile` — Update profile
- `PUT /api/customers/:id/password` — Change password

**Admin Endpoints** (require admin auth):
- `GET /api/admin/customers` — Get all customers
- `PUT /api/admin/customers/:id/view` — Set visibility overrides
- `GET /api/admin/products` — Get all products
- `POST /api/admin/products` — Create product
- `PUT /api/admin/products/:id` — Update product
- `DELETE /api/admin/products/:id` — Delete product
- `PUT /api/admin/products/reorder` — Reorder products (drag-drop)
- `GET /api/admin/activity` — Get activity log
- `PUT /api/admin/orders/:id/status` — Update order status
- `GET /api/admin/settings` — Get settings
- `PUT /api/admin/settings/:key` — Update setting

**Database Tables**:
- `super_categories` — 7 top-level categories (Chips, Noodles, Cookies, Candy, Korean, Beverages, Ice Cream)
- `categories` — ~22 subcategories
- `products` — 205 products
- `customers` — Customer accounts
- `customer_cat_hidden` — Per-customer category visibility
- `customer_overrides` — Per-customer product visibility (hidden/out-of-stock)
- `orders` — Order records
- `order_items` — Items in each order (cases vs pallets)
- `favorites` — Customer favorites
- `activity_log` — Audit trail (logins, orders, favorites)
- `pending_registrations` — Awaiting admin approval
- `settings` — Global settings

## Support

For issues or questions, check server.js comments or database schema.sql for implementation details.
