# Product-Image Reassignment: Scenario A - Order Mismatch Fix

## Problem
Product-image assignments in the database are incorrect. The issue is that products were assigned images sequentially (product-001.jpg → product-205.jpg) without matching the correct `img` index from the source product data.

## Root Cause
- **Source file**: `/Users/djmac/Downloads/02_customer_portal (2).html` (1.1MB, 205 base64-encoded images)
- **Product data**: `PRODS` array in frontend code (205 products with `img` property indices 0-204)
- **Mismatch**: When images were extracted, they were numbered sequentially, but the PRODS array has specific `img` mappings that don't follow this order
- **Result**: Customer portal displays wrong images for most products

## Solution: Scenario A - Sequential Remapping

The fix maps each product's correct image based on the `img` index in the PRODS array:
- **Product index 0** (V036B02101-1) → image 0 (product-000.jpg)
- **Product index 1** (V036B02102-1) → image 1 (product-001.jpg)
- **Product index 2** (V036B02104) → image 2 (product-002.jpg)
- ... and so on for all 205 products

## Implementation Steps

### Step 1: Review the Mapping
Open `sql/001-fix-product-image-assignments.sql` to see all 205 product-to-image mappings.

Sample mapping:
```sql
UPDATE products SET image_url = '/images/products/product-000.jpg' WHERE product_id = 'V036B02101-1';
UPDATE products SET image_url = '/images/products/product-001.jpg' WHERE product_id = 'V036B02102-1';
UPDATE products SET image_url = '/images/products/product-002.jpg' WHERE product_id = 'V036B02104';
```

### Step 2: Execute the SQL Update (Choose one method)

#### Method A: Direct SQL Execution (Easiest)
```bash
# Via psql command line
psql -U postgres -d drprepper < sql/001-fix-product-image-assignments.sql

# Or within psql interactive:
\i sql/001-fix-product-image-assignments.sql
```

#### Method B: Via Node.js API Client
```javascript
// Using your existing database connection
const fs = require('fs');
const sqlScript = fs.readFileSync('sql/001-fix-product-image-assignments.sql', 'utf-8');
await db.query(sqlScript);
```

#### Method C: Via pgAdmin GUI
1. Open pgAdmin
2. Connect to drprepper database
3. Go to Tools → Query Tool
4. Paste the SQL from `sql/001-fix-product-image-assignments.sql`
5. Execute

### Step 3: Verify the Fix
```bash
# Via psql:
psql -U postgres -d drprepper -c \
  "SELECT COUNT(*) as corrected_products FROM products WHERE image_url LIKE '/images/products/product-%.jpg';"

# Should return: 205
```

### Step 4: Test in Browser
1. Restart your Node.js server: `npm start`
2. Navigate to `https://wholesale.drprepperusa.com` (or `http://localhost:5001`)
3. Verify that:
   - Product grid loads correctly
   - Each product displays its correct product image
   - Images are crisp and upscaled (2x resolution)
   - Cart operations work normally

## Verification Checklist
- [ ] SQL executed without errors
- [ ] All 205 products have correct image URLs in database
- [ ] Server restarted
- [ ] Product grid loads
- [ ] Sample products display correct images (spot-check 5-10 random products)
- [ ] Admin portal shows correct product images
- [ ] Cart operations functional
- [ ] Images load from `/images/products/` directory with no 404 errors

## Rollback (if needed)
If the fix causes issues, you can restore the old sequential mapping:
```bash
psql -U postgres -d drprepper << 'EOF'
BEGIN TRANSACTION;
UPDATE products SET image_url = '/images/products/product-' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY product_id) - 1 AS TEXT), 3, '0') || '.jpg';
COMMIT;
EOF
```

## Reference Information

### Product-Image Mapping Source
The correct mappings are derived from the PRODS array structure:
```javascript
const PRODS = [
  {id: "V036B02101-1", name: "LS-Potato Chips (Cucumber)", ..., img: 0},
  {id: "V036B02102-1", name: "LS-Potato Chips (Tomato)", ..., img: 1},
  {id: "V036B02104", name: "LS-Potato Chips (Braised Pork Flavor)", ..., img: 2},
  // ... etc
];
```

Each `img` value points to the correct index in the IMGS array of 205 base64-encoded images.

### File Locations
- Source images (extracted): `/Users/djmac/drprepper-wholesale-portal/public/images/products/`
- SQL fix script: `/Users/djmac/drprepper-wholesale-portal/sql/001-fix-product-image-assignments.sql`
- Frontend product data: `src/data/products.js` or `public/products.json`
- API endpoint: `GET /api/products` (returns all products with image_url)

## Timeline
- **Identified**: Product-image assignments confirmed incorrect (2026-03-06)
- **Root Cause**: Sequential extraction order ≠ product array order
- **Solution**: Mapped by img index (Scenario A)
- **Status**: Ready for execution
