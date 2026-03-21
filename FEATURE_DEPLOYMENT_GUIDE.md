# Feature Deployment Guide: Category Visibility & NEW ITEMS Tab

## Overview
This guide covers the deployment of the category visibility hiding and NEW ITEMS tab features for the DR Prepper Wholesale Portal.

## Features Implemented

### 1. Category-Level Visibility Control
- **Admin Feature**: Admins can hide/show individual product categories from the customer view
- **Implementation**: Toggle button (👁/🚫) next to each category name in AdminPortal
- **Visibility Scope**: Hidden categories exclude all their products from the customer view
- **Database**: New `is_hidden` column in categories table

### 2. NEW ITEMS Tab (Customer View)
- **Customer Feature**: New tab showing products added in the last 7 days
- **Grouping**: Products displayed by category (same as CategoryView)
- **Tab Position**: 4th tab (after Catalog, Favorites, and before History)
- **Icon**: ✨

### 3. NEW ITEM Badge
- **Visual Indicator**: Red badge on product cards for products created ≤7 days ago
- **Styling**: Top-left corner, red background (#c0392b), white text
- **Applies To**: All views (Catalog, Favorites, NEW ITEMS)

## Files Modified

### Backend (server.js)
1. **New Endpoint**: `PUT /api/categories/:id`
   - Requires admin authentication (JWT)
   - Updates category visibility: `{ is_hidden: boolean }`
   - Returns updated category object

2. **Updated Endpoint**: `GET /api/products`
   - Added `created_at` field to response
   - Added `category_is_hidden` field to response
   - Filters out products in hidden categories for customers
   - Maintains backward compatibility

3. **Updated Endpoint**: `GET /api/categories/hierarchy`
   - Filters hidden categories from customer view
   - Admins see all categories regardless of visibility

### Database (schema.sql)
1. **New Column**: `categories.is_hidden` (BOOLEAN, DEFAULT FALSE)

### Frontend (Vue Components)

#### AdminPortal.vue
1. Added `categoryMetadata` object to track category visibility
2. Enhanced `buildCategoryTree()` to capture category_is_hidden status
3. Added `toggleCategoryVisibility()` method for API integration
4. Updated template to show visibility toggle button next to each category
5. Added CSS for `.cat-visibility-toggle` button

#### ProductCard.vue
1. Added `isNewItem` computed property (7-day logic)
2. Added `.new-badge` element to template
3. Added CSS styling for `.new-badge` (red background, white text)

#### App.vue
1. Added `newItems` tab to tabs array with ✨ icon
2. Added `newItems` computed property to filter products by creation date
3. Added NEW ITEMS page section using CategoryView component
4. Included empty state for when no new items exist

## Database Migration

### For Existing Databases

Run the migration script to add the `is_hidden` column:

```bash
psql drprepper_wholesale -f migrations/001_add_category_visibility.sql
```

Or manually execute:
```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
```

### For New Databases

The schema.sql already includes the `is_hidden` column, so no migration is needed.

## Deployment Steps

### 1. Pull Latest Changes
```bash
cd ~/wholesale-portal
git pull origin main
```

### 2. Install/Update Dependencies (if needed)
```bash
npm install
```

### 3. Build Frontend
```bash
npm run build
```

### 4. Apply Database Migration
```bash
psql drprepper_wholesale -f migrations/001_add_category_visibility.sql
```

### 5. Restart Server
```bash
pm2 restart wholesale-portal
# or
npm start
```

### 6. Verify Deployment
- Visit https://wholesale.drprepperusa.com/
- Log in as admin (admin@drprepper.com)
- Verify category visibility toggles appear in AdminPortal
- Create a test product or modify created_at to verify NEW ITEM badge
- Switch to customer view and verify:
  - NEW ITEMS tab appears
  - NEW ITEM badge shows on recent products
  - Hidden categories don't appear

## API Endpoints

### Update Category Visibility
```
PUT /api/categories/:id
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "is_hidden": true|false
}

Response:
{
  "success": true,
  "category": {
    "id": 1,
    "name": "Chips",
    "is_hidden": true,
    ...
  }
}
```

### Get Products (Enhanced)
```
GET /api/products
Authorization: Bearer {jwt_token}

Response includes:
- created_at: ISO timestamp
- category_is_hidden: boolean (from category)
- All existing fields
```

### Get Category Hierarchy (Updated)
```
GET /api/categories/hierarchy
Authorization: Bearer {jwt_token}

Filters:
- Excludes hidden categories for customers
- Shows all categories for admins
```

## Feature Details

### Category Visibility Logic
- **Admin View**: See all categories regardless of `is_hidden` status
- **Customer View**: See only categories where `is_hidden = false`
- **Product Filtering**: Products in hidden categories don't appear to customers
- **Default**: All new categories are visible (`is_hidden = false`)

### NEW ITEMS Logic
- **Time Window**: Last 7 days from current date/time
- **Calculation**: `(now - created_at) / (86400000 ms per day) <= 7`
- **Display**: Badge appears on product card if condition met
- **Grouping**: CategoryView component handles grouping by category

## Testing Checklist

- [ ] Admin can toggle category visibility
- [ ] Hidden categories don't appear in customer category list
- [ ] Products in hidden categories excluded from customer search
- [ ] NEW ITEMS tab shows products from last 7 days
- [ ] NEW ITEMS tab properly groups by category
- [ ] NEW ITEM badge displays on recent products
- [ ] NEW ITEM badge has correct styling (red, top-left)
- [ ] Products older than 7 days don't show badge
- [ ] Admins can see hidden categories in admin view
- [ ] Category visibility persists after page refresh

## Rollback Plan

If issues occur, revert to the previous version:

```bash
git revert HEAD
npm run build
pm2 restart wholesale-portal
```

Or restore from backup:
```bash
git checkout <previous_commit_hash>
npm run build
pm2 restart wholesale-portal
```

## Troubleshooting

### NEW ITEM Badge Not Showing
- Check that product has `created_at` value in database
- Verify `created_at` timestamp is within last 7 days
- Check browser console for errors

### Category Visibility Toggle Not Working
- Ensure user is logged in as admin
- Check that JWT token is valid
- Verify admin email is set in ADMIN_EMAIL env variable

### Hidden Categories Still Visible
- Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)
- Verify database migration was applied
- Check that `is_hidden` column exists: `SELECT * FROM pg_attribute WHERE attname = 'is_hidden' AND attrelid = 'categories'::regclass;`

### NEW ITEMS Tab Missing
- Rebuild frontend: `npm run build`
- Clear browser cache
- Check that build completed without errors

## Performance Considerations

- **Category Visibility**: Adds one filter condition to category queries
- **NEW ITEMS Filter**: Client-side filtering on products array (~O(n) performance)
- **Database**: Single `is_hidden` column lookup per category

## Future Enhancements

- Bulk category visibility management
- Scheduled category visibility (e.g., hide until launch date)
- Customer-specific category visibility overrides
- NEW ITEMS counter badge on tab
- NEW ITEMS sorting options (date, popularity)

## Notes

- All changes are backward compatible
- Existing data (categories, products) unaffected
- Feature rollout is safe with migrations
- Admin authentication is required for visibility changes
