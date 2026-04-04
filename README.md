# DR Prepper Wholesale Portal

Full B2B wholesale ordering platform built with **Next.js 14**, **React 18**, **Tailwind CSS v4**, **Lucide React icons**, **PostgreSQL** (Supabase), and **Supabase Storage** for product images.

## Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS v4, Lucide React
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL via Supabase (accessed through `pg` pool)
- **Storage**: Supabase Storage (product images, banner images)
- **Auth**: JWT (jsonwebtoken)
- **Deployment**: Vercel

## Project Structure

```
dpu-wholesale-prepper/
├── app/
│   ├── page.jsx                    # Main app (routes to Admin or Customer)
│   ├── login/page.jsx              # Login page route
│   ├── layout.jsx                  # Root layout
│   ├── globals.css                 # Tailwind CSS v4 imports + base styles
│   └── api/                        # API Routes
│       ├── auth/                   # Login, register, session
│       ├── products/               # CRUD, search, image upload
│       ├── orders/                 # Place/list/update orders
│       ├── favorites/              # Add/remove/list favorites
│       ├── customers/              # Profile, password change
│       ├── categories/             # Category hierarchy
│       ├── settings/               # App settings (key-value)
│       ├── upload/                 # Image upload to Supabase
│       └── admin/                  # Admin-only endpoints
│           ├── banner/             # Promo banner image upload
│           ├── bulk/               # Bulk visibility, delete
│           ├── customers/          # Customer management, views
│           ├── products/           # Bulk edit, Excel import/export
│           ├── categories-tree/    # Category tree management
│           ├── super-categories/   # Super category CRUD
│           ├── pending-registrations/ # Approve/reject registrations
│           └── ...
├── components/
│   ├── Login.jsx                   # Login/registration page
│   ├── CustomerApp.jsx             # Customer portal (catalog, cart, orders, favorites)
│   ├── AdminPortal.jsx             # Admin dashboard (products, customers, orders, settings)
│   ├── ProductCard.jsx             # Product card component
│   ├── ProductGrid.jsx             # Product grid layout
│   ├── CategorySidebar.jsx         # Category navigation sidebar
│   ├── CategoryView.jsx            # Category-grouped product view
│   ├── CartOverlay.jsx             # Cart overlay/sheet
│   ├── OrderConfirmModal.jsx       # Order confirmation modal
│   └── BulkEditView.jsx            # Bulk product editor (table view)
├── lib/
│   ├── db.js                       # PostgreSQL connection pool
│   ├── auth.js                     # JWT auth helpers (requireAdmin, requireAuth)
│   └── supabase.js                 # Supabase storage client (upload/delete images)
├── schema.sql                      # Database schema
├── postcss.config.mjs              # PostCSS config for Tailwind v4
├── next.config.mjs                 # Next.js configuration
└── package.json
```

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env.local
```

Required environment variables:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Run schema.sql against your PostgreSQL database
psql $DATABASE_URL < schema.sql
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Deploy to Vercel

```bash
npx vercel --prod
```

## Features

### Customer Portal
- Product catalog with grid/category views
- Category sidebar navigation
- Product search
- Card size slider
- Product detail sheet with cases/pallets ordering
- Shopping cart (sidebar + mobile overlay)
- Order history with status tracking
- Favorites with red heart toggle
- Account settings (profile, contact, password)
- Configurable promo banner (text or image)
- Page persistence across refreshes

### Admin Portal
- Dashboard stats cards (Total Products, Pending Orders, In Stock, New This Week)
- Product management (add, edit, delete, visibility, OOS toggle)
- Category sidebar with product counts
- Bulk actions (show/hide/delete selected products)
- Filter pills (visibility, stock, super category)
- Bulk Edit view (table-based editing)
- Excel import/export with image upload support
- Customer management with per-customer visibility
- Order management with status updates
- Category & super-category drag-and-drop ordering
- Promo banner editor (text banner or image banner)
- Customer registration approval workflow
- Activity log
- Customer insights
- Zoom control (70-150%)
- Page persistence across refreshes

### Excel Import/Export
- **Export**: Downloads all products as .xlsx with categories reference sheet
- **Import**: Upload Excel + product images together
  - Matches by Product ID or SKU (updates existing) or creates new
  - Auto-generates Product ID (UUID) and SKU if not provided
  - Resolves local image filenames (e.g. `dish1.jpg`) to uploaded Supabase URLs
  - Parallel image upload (batches of 5) and batch DB operations (10 at a time)

## API Endpoints

### Auth
- `POST /api/auth/login` — Login (returns JWT token)
- `POST /api/auth/register` — Register new customer (pending approval)
- `GET /api/auth/me` — Get current user from token

### Products
- `GET /api/products` — List products (filtered by customer visibility)
- `POST /api/products` — Create product (admin)
- `PUT /api/products/:id` — Update product (admin)
- `DELETE /api/products/:id` — Delete product + Supabase image (admin)
- `POST /api/upload` — Upload product image to Supabase

### Orders
- `POST /api/orders` — Place order
- `GET /api/orders` — Get orders (customer's own or all for admin)
- `PUT /api/orders/:id/status` — Update order status (admin)

### Favorites
- `GET /api/favorites` — Get favorites (full product data including price)
- `POST /api/favorites` — Add to favorites
- `DELETE /api/favorites/:id` — Remove from favorites

### Customers
- `GET /api/customers/profile` — Get customer profile
- `PATCH /api/customers/profile` — Update profile
- `POST /api/customers/change-password` — Change password

### Settings
- `GET /api/settings` — Get all settings (force-dynamic, no cache)
- `PUT /api/settings/:key` — Update setting (admin)

### Admin
- `GET /api/admin/customers` — List all customers
- `GET/PUT /api/admin/customers/:id/view` — Customer visibility overrides
- `POST /api/admin/bulk/delete` — Bulk delete products + images
- `POST /api/admin/bulk/visibility` — Bulk show/hide products
- `PATCH /api/admin/products/bulk` — Bulk update product fields
- `GET /api/admin/products/excel` — Export products as Excel
- `POST /api/admin/products/excel` — Import products from Excel
- `POST /api/admin/banner` — Upload banner image
- `DELETE /api/admin/banner` — Delete banner image
- `GET /api/admin/pending-registrations` — List pending registrations
- `POST /api/admin/pending-registrations` — Approve/reject registration
- `GET /api/categories/hierarchy` — Category tree with product counts

## Authentication

Uses JWT tokens (jsonwebtoken library):
- Admin users are in the `users` table with `role = 'admin'`
- Customer users are in the `customers` table
- Token sent via `Authorization: Bearer <token>` header

## Image Storage

Product and banner images are stored in **Supabase Storage**:
- Product images: `products` bucket
- Banner images: `products` bucket under `banners/` prefix
- Images are auto-deleted from storage when products are deleted (single or bulk)
- Banner bucket is cleaned when a new banner image is uploaded

## Design System

- **Color palette**: Soft indigo (#6366f1) primary, slate grays for text/borders
- **Icons**: Lucide React (consistent SVG icon library)
- **Styling**: Tailwind CSS v4 utility classes (no CSS-in-JS)
- **Typography**: DM Sans font family
- **Responsive**: Mobile-first with `max-sm:` breakpoints, bottom nav on mobile
