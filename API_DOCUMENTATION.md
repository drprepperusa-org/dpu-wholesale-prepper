# DR Prepper Wholesale Portal — API Documentation

> **Base URL:** `https://wholesale.drprepperusa.com`  
> **Port (local):** `5001`  
> **Content-Type:** `application/json` for all POST/PUT requests  
> **Authentication:** Bearer token in `Authorization` header

---

## Authentication

### Token Format
Tokens are base64-encoded strings containing `email:customerId`.

```
Authorization: Bearer <base64(email:customerId)>
```

Tokens are returned on login and must be stored by the client (e.g., `localStorage`).

### Admin Access
Only the account with email matching `ADMIN_EMAIL` env var (or `admin@drprepper.com`) has admin privileges.

---

## Response Format

All endpoints return JSON. Standard format:

```json
// Success
{ "success": true, "data": {...} }

// Error
{ "success": false, "error": "Human-readable message", "statusCode": 400 }
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Not authenticated (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, SKU, etc.) |
| 500 | Internal server error |

---

## Endpoints

### Auth

#### POST /api/auth/register
Register a new customer (creates pending registration, requires admin approval).

**Body:**
```json
{
  "email": "buyer@company.com",
  "password": "securepass123",
  "companyName": "Happy Snacks Co.",
  "contactName": "John Smith",
  "phone": "213-555-0100"
}
```

**Response 201:**
```json
{ "success": true, "message": "Registration submitted for admin approval" }
```

**Errors:** 400 (missing fields), 409 (email already exists)

---

#### POST /api/auth/login
Login and get token.

**Body:**
```json
{ "email": "buyer@company.com", "password": "securepass123" }
```

**Response 200:**
```json
{
  "success": true,
  "vendor": {
    "id": "uuid",
    "email": "buyer@company.com",
    "name": "John Smith",
    "companyName": "Happy Snacks Co."
  },
  "token": "base64encodedtoken"
}
```

**Errors:** 400 (missing fields), 401 (wrong credentials), 403 (account inactive)

---

### Products

#### GET /api/products
Get all products. Non-authenticated or customer-authenticated requests have visibility filters applied.

**Headers:** `Authorization: Bearer <token>` (optional — admin gets all products including hidden)

**Query params:** none

**Response 200:**
```json
{
  "success": true,
  "products": [
    {
      "id": "V036B02101-1",
      "name": "LS-Potato Chips (Cucumber)",
      "weight": "90g",
      "bags_per_case": "24btls/cs",
      "cases_per_pallet": 60,
      "price": "25.00",
      "category_id": 1,
      "category": "Lay's Potato Chips",
      "category_is_hidden": false,
      "super_category_id": 1,
      "super_category": "Chips & Savory Snacks",
      "image_url": "/images/products/product-000.jpg",
      "sku": null,
      "sort_order": 0,
      "is_hidden": false,
      "is_oos": false,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/products
Create a new product. **Admin only.**

**Headers:** `Authorization: Bearer <admin-token>`

**Body:**
```json
{
  "name": "New Product",
  "sku": "SKU123",
  "weight": "100g",
  "bags_per_case": "24/cs",
  "cases_per_pallet": 60,
  "price": 25.00,
  "category_id": 1,
  "super_category_id": 1,
  "image_url": "/images/products/product-xxx.jpg"
}
```

**Response 201:**
```json
{ "success": true, "product": { ...product } }
```

**Errors:** 403 (not admin), 409 (duplicate SKU)

---

#### PUT /api/products/:id
Update a product (fields, visibility, OOS status). **Admin only.**

**Headers:** `Authorization: Bearer <admin-token>`

**Body** (any subset of fields):
```json
{
  "name": "Updated Name",
  "price": 29.99,
  "is_hidden": true,
  "is_oos": false
}
```

**Response 200:**
```json
{ "success": true, "product": { ...updatedProduct } }
```

**Errors:** 403 (not admin), 404 (not found)

---

#### DELETE /api/products/:id
Delete a product permanently. **Admin only.**

**Headers:** `Authorization: Bearer <admin-token>`

**Response 200:**
```json
{ "success": true }
```

**Errors:** 403 (not admin), 404 (not found)

---

### Categories

#### GET /api/categories/hierarchy
Get super-categories with sub-categories and product counts. Filters visibility for non-admin users.

**Headers:** `Authorization: Bearer <token>` (optional)

**Response 200:**
```json
{
  "success": true,
  "hierarchy": [
    {
      "id": 1,
      "name": "Chips & Savory Snacks",
      "emoji": "🥔",
      "totalProducts": 45,
      "categories": [
        { "id": 1, "name": "Lay's Potato Chips", "productCount": 12 }
      ]
    }
  ]
}
```

---

#### PUT /api/categories/:id
Update category visibility. **Admin only.**

**Headers:** `Authorization: Bearer <admin-token>`

**Body:**
```json
{ "is_hidden": true }
```

**Response 200:**
```json
{ "success": true, "category": { ...category } }
```

---

#### GET /api/admin/categories
Get all super-categories. **Admin only.**

**Response 200:**
```json
{ "success": true, "categories": [{ "id": 1, "name": "Chips & Savory Snacks" }] }
```

---

### Orders

#### POST /api/orders
Place an order. **Auth required.**

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "items": [
    { "product_id": "V036B02101-1", "qty": 5, "unit": "cases" },
    { "product_id": "V036B02101-2", "qty": 1, "unit": "pallets" }
  ]
}
```

**Response 201:**
```json
{ "success": true, "orderId": "uuid", "totalCases": 65 }
```

---

#### GET /api/orders
Get orders. Customers see only their orders; admins see all.

**Headers:** `Authorization: Bearer <token>`

**Query params:** `?status=Pending|Processing|Received`

**Response 200:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "status": "Pending",
      "total_cases": 60,
      "created_at": "2026-01-01T00:00:00.000Z",
      "company_name": "Happy Snacks Co.",
      "email": "buyer@company.com"
    }
  ]
}
```

---

#### GET /api/orders/:orderId
Get single order with items. **Auth required** (customer sees own orders only).

**Response 200:**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "status": "Pending",
    "total_cases": 60,
    "items": [
      { "id": 1, "product_id": "V036B02101-1", "qty": 5, "unit": "cases", "name": "LS-Potato Chips" }
    ]
  }
}
```

---

#### PUT /api/orders/:orderId/status
Update order status. **Admin only.**

**Body:** `{ "status": "Processing" }` (Pending|Processing|Received)

---

### Favorites

#### POST /api/favorites
Add product to favorites. **Auth required.**

**Body:** `{ "product_id": "V036B02101-1" }`

**Response 201:** `{ "success": true, "favorite": {...} }`

---

#### DELETE /api/favorites/:product_id
Remove from favorites. **Auth required.**

**Response 200:** `{ "success": true }`

---

#### GET /api/favorites
Get customer's favorites. **Auth required.**

**Response 200:**
```json
{ "success": true, "favorites": [...products] }
```

---

### Customer Profile

#### GET /api/customers/profile
Get own profile. **Auth required.**

#### PUT /api/customers/profile
Update own profile. **Auth required.**

**Body** (any subset): `contact_name`, `company_name`, `email`, `phone`, `address_line1`, `city`, `state`, `zip`, `country`

#### POST /api/customers/change-password
Change password. **Auth required.**

**Body:** `{ "current_password": "...", "new_password": "..." }`

---

### Admin — Customers

#### GET /api/admin/customers
Get all customers. **Admin only.**

**Response 200:**
```json
{
  "success": true,
  "customers": [
    {
      "id": "uuid",
      "company_name": "Happy Snacks Co.",
      "contact_name": "John Smith",
      "email": "buyer@company.com",
      "view_preset": "full",
      "active": true,
      "created_at": "...",
      "last_login": "..."
    }
  ]
}
```

#### GET /api/customers
Alias for `/api/admin/customers`. **Admin only.**

---

#### POST /api/admin/customers
Create customer directly (no approval needed). **Admin only.**

**Body:**
```json
{
  "company_name": "Happy Snacks Co.",
  "email": "buyer@company.com",
  "contact_name": "John Smith",
  "phone": "213-555-0100",
  "preset": "full",
  "password": "optional-custom-password"
}
```

**Response 201:**
```json
{
  "success": true,
  "customer": { ...customer },
  "tempPassword": "auto-generated-if-not-provided"
}
```

---

#### GET /api/admin/customers/:customerId/view
Get customer's visibility overrides. **Admin only.**

**Response 200:**
```json
{
  "success": true,
  "catHidden": [1, 3],
  "customHidden": ["product-id-1"],
  "customOos": []
}
```

---

#### PUT /api/admin/customers/:customerId/view
Set customer's visibility overrides. **Admin only.**

**Body:**
```json
{
  "catHidden": [1, 3],
  "customHidden": ["product-id-1"],
  "customOos": []
}
```

---

#### GET /api/admin/customer-overrides/:customerId
Get customer overrides (alternative endpoint).

#### POST /api/admin/customer-overrides
Set customer overrides.

**Body:** `{ "customerId": "...", "catHidden": [...], "hiddenProducts": [...] }`

---

#### GET /api/admin/customer-insights
Get customer analytics (total orders, total cases, top products). **Admin only.**

---

### Activity Log

#### GET /api/admin/activity-log
Get activity log. **Admin only.**

**Query params:**
- `customer_id` — filter by customer
- `type` — filter by type (login, order, favorite, admin_product_edit, admin_product_delete, admin_product_create)
- `limit` — default 100
- `offset` — default 0

**Response 200:**
```json
{
  "success": true,
  "activities": [
    {
      "id": 1,
      "customer_id": "uuid",
      "admin_id": null,
      "entity_type": "product",
      "entity_id": "V036B02101-1",
      "company_name": "Happy Snacks Co.",
      "contact_name": "John Smith",
      "type": "admin_product_edit",
      "detail": "Hid product: LS-Potato Chips",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/activity-log
Alias for activity log. **Admin only.**

#### POST /api/activity-log
Log an activity from frontend. **Auth required.**

**Body:**
```json
{
  "type": "login",
  "detail": "Admin viewed catalog",
  "entityType": "product",
  "entityId": "V036B02101-1"
}
```

---

### Settings

#### GET /api/settings
Get all settings (public).

**Response 200:**
```json
{ "success": true, "settings": { "registration_enabled": "true" } }
```

#### PUT /api/settings/:key
Update a setting. **Admin only.**

**Body:** `{ "value": "true" }`

---

### Health

#### GET /api/health
Health check endpoint. No auth required.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-03-07T21:45:00.000Z" }
```

Use this for uptime monitoring.

---

## Rate Limiting

Currently no rate limiting is enforced at the API level. Recommend adding express-rate-limit if public-facing registration is enabled.

## Error Examples

### 401 Unauthorized
```json
{ "success": false, "error": "Authentication required", "statusCode": 401 }
```

### 403 Forbidden
```json
{ "error": "Admin required" }
```

### 404 Not Found
```json
{ "error": "Product not found" }
```

### 500 Internal Server Error
```json
{ "error": "Internal server error" }
```
