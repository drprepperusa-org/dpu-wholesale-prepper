# DR Prepper Wholesale Portal — Production Runbook

> **For:** DJ / admin operators  
> **URL:** https://wholesale.drprepperusa.com  
> **Backend Port:** 5001  
> **Database:** PostgreSQL 15 — `drprepper_wholesale` (local)  
> **Last Updated:** 2026-03-07

---

## 🚦 Quick Status Check

```bash
# Is the server running?
curl -s https://wholesale.drprepperusa.com/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Server process
ps aux | grep "node server.js" | grep -v grep

# Server logs (last 50 lines)
tail -50 /Users/djmac/drprepper-wholesale-portal/server.log
```

---

## 🔐 Admin Login

- URL: https://wholesale.drprepperusa.com → click **🔧 Admin** toggle
- Admin email: `admin@drprepper.com` (set in `.env` as `ADMIN_EMAIL`)
- All product mutations require the admin token

---

## 📦 How to Hide/Show Products

### Via Admin Portal (preferred)
1. Log in at https://wholesale.drprepperusa.com
2. Click **🔧 Admin** button (top right)
3. Navigate to **📦 Catalog** tab
4. Find the product
5. Click **🚫** to hide or **👁** to unhide

### Via API (direct)
```bash
# Get admin token (login first)
TOKEN=$(curl -s -X POST https://wholesale.drprepperusa.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@drprepper.com","password":"YOUR_PASSWORD"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Hide a product
curl -X PUT https://wholesale.drprepperusa.com/api/products/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"is_hidden": true}'

# Show a product
curl -X PUT https://wholesale.drprepperusa.com/api/products/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"is_hidden": false}'
```

### Hide entire category
```bash
curl -X PUT https://wholesale.drprepperusa.com/api/categories/CATEGORY_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"is_hidden": true}'
```

---

## 👥 Managing Users

### View all customers
Admin Portal → **👥 Customer Views** tab → see full list

### Add a customer
1. Admin Portal → Customer Views tab
2. Click **+ Add Customer** (top right)
3. Fill: Company Name (required), Email (required), View Preset, Contact Name, Phone

### Disable/enable a customer account
```bash
# Get customer ID from customer list, then:
export PATH="/opt/homebrew/Cellar/postgresql@15/15.17/bin:$PATH"
psql -U djmac -d drprepper_wholesale -c \
  "UPDATE customers SET active = FALSE WHERE email = 'customer@email.com';"
```

### Approve pending registrations
```bash
psql -U djmac -d drprepper_wholesale -c "SELECT id, company_name, email, status, created_at FROM pending_registrations ORDER BY created_at DESC;"

# Approve one:
# 1. Create customer from pending:
#    (Copy values from pending_registrations, insert into customers)
# 2. Delete from pending:
#    DELETE FROM pending_registrations WHERE id = 'REG_ID';
```

### Per-customer product visibility
Admin Portal → Customer Views tab → select customer → toggle products/categories → **Save View**

---

## 📋 Activity Log

### View in Admin Portal
Admin Portal → ⚙ Settings tab → Activity Log section

### Via API
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://wholesale.drprepperusa.com/api/admin/activity-log?limit=50"

# Filter by type (login, order, favorite, admin_product_edit, admin_product_delete, admin_product_create)
curl -H "Authorization: Bearer $TOKEN" \
  "https://wholesale.drprepperusa.com/api/admin/activity-log?type=admin_product_edit&limit=50"

# Filter by customer
curl -H "Authorization: Bearer $TOKEN" \
  "https://wholesale.drprepperusa.com/api/admin/activity-log?customer_id=CUSTOMER_ID"
```

### Activity log types
| Type | Meaning |
|------|---------|
| `login` | Customer signed in |
| `order` | Customer placed an order |
| `favorite` | Customer favorited a product |
| `admin_product_create` | Admin added a product |
| `admin_product_edit` | Admin edited/hid/unhid a product |
| `admin_product_delete` | Admin deleted a product |

---

## 🔧 Troubleshooting

### Server won't start
```bash
cd /Users/djmac/drprepper-wholesale-portal
node server.js
# Check for errors in output
```

Common causes:
- Port 5001 already in use → `lsof -i :5001` then kill the PID
- PostgreSQL not running → `brew services start postgresql@15`
- Missing .env values → check `DB_NAME`, `DB_USER`, `JWT_SECRET`

### "Cannot connect to database"
```bash
export PATH="/opt/homebrew/Cellar/postgresql@15/15.17/bin:$PATH"
psql -U djmac -d drprepper_wholesale -c "SELECT 1;"
# If fails: brew services start postgresql@15
```

### Products not appearing for customers
1. Check `is_hidden` flag: `SELECT id, name, is_hidden FROM products WHERE is_hidden = TRUE;`
2. Check category visibility: `SELECT id, name, is_hidden FROM categories WHERE is_hidden = TRUE;`
3. Check customer-specific overrides in `customer_overrides` table

### 401/403 errors in logs
- Customer token expired — they need to log in again
- Admin token used for non-admin account → check `ADMIN_EMAIL` in `.env`

### High response times (>2s)
- Check active DB connections: `SELECT count(*) FROM pg_stat_activity;`
- Check for missing indexes: `EXPLAIN ANALYZE <slow query>;`
- Restart server if memory leak suspected

### 500 errors
- Always logged in `server.log`
- Check: `grep "500\|error\|Error" server.log | tail -20`

---

## 💾 Backups

### Automatic backups
Cron runs at **2 AM daily** → `/Users/djmac/drprepper-wholesale-portal/backup.sh`
Backups stored in: `/Users/djmac/drprepper-wholesale-portal/backups/`
Retention: **30 days**

### Manual backup
```bash
cd /Users/djmac/drprepper-wholesale-portal
./backup.sh
```

### Verify latest backup
```bash
ls -lh /Users/djmac/drprepper-wholesale-portal/backups/*.sql.gz | tail -5
# Verify readable:
gunzip -t /Users/djmac/drprepper-wholesale-portal/backups/LATEST_BACKUP.sql.gz && echo "OK"
```

### Restore from backup
```bash
export PATH="/opt/homebrew/Cellar/postgresql@15/15.17/bin:$PATH"
# Restore to existing database (destructive — drops existing data):
gunzip -c /path/to/backup.sql.gz | psql -U djmac -d drprepper_wholesale

# Safer: restore to new database first, verify, then swap:
createdb -U djmac drprepper_wholesale_restore
gunzip -c /path/to/backup.sql.gz | psql -U djmac -d drprepper_wholesale_restore
# Verify data, then rename if needed
```

---

## 🔄 Server Management

### Restart server (production)
```bash
# If running via nohup:
pkill -f "node server.js"
cd /Users/djmac/drprepper-wholesale-portal
nohup node server.js > server.log 2>&1 &
echo $! > server.pid

# If running via PM2:
pm2 restart drprepper-wholesale
```

### Check server logs live
```bash
tail -f /Users/djmac/drprepper-wholesale-portal/server.log
```

---

## 📊 Uptime Monitoring Rules

Configure your monitoring tool (UptimeRobot, Better Uptime, etc.) with these rules:

| Check | Endpoint | Alert When |
|-------|----------|-----------|
| Health | GET /api/health | Response != 200 |
| Health | GET /api/health | Response time > 2s |
| 500 errors | Server logs | Any 5xx response |
| High 404 rate | Access logs | >5% of requests return 404 |

### UptimeRobot setup (free tier)
1. Add monitor → HTTPS monitor
2. URL: `https://wholesale.drprepperusa.com/api/health`
3. Check interval: 5 minutes
4. Alert: email/SMS on downtime
5. Expected keyword: `"status":"ok"`

---

## 🌐 Nginx Config Location

If using Nginx reverse proxy:
```nginx
# /etc/nginx/sites-available/wholesale.drprepperusa.com
server {
    listen 443 ssl;
    server_name wholesale.drprepperusa.com;
    
    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 30s;
    }
}
```

---

## 📞 Emergency Contacts

- **Developer:** DJ  
- **Database:** PostgreSQL 15 on local server  
- **Hosting:** (your host — VPS/dedicated)  
