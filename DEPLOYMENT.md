# Deployment Guide — Mac Mini

This guide deploys the wholesale portal to the existing Mac mini running on Tailscale with Cloudflare Tunnel.

## Infrastructure

- **Host**: djmac@100.103.254.11 (Mac mini, Tailscale)
- **Process Manager**: PM2
- **HTTP Tunnel**: Cloudflare Tunnel
- **Domain**: wholesale.drprepperusa.com
- **Port**: 5001 (to avoid conflict with existing port 5000)

## Prerequisites

1. SSH access to Mac mini (Tailscale IP 100.103.254.11)
2. PostgreSQL running on Mac mini (default: localhost:5432)
3. Node.js 16+ installed on Mac mini
4. PM2 installed globally on Mac mini
5. Cloudflare Tunnel configured for wholesale.drprepperusa.com

## Step-by-Step Deployment

### 1. Clone/Transfer Project to Mac Mini

```bash
# On your Mac
scp -r /Users/djmac/.openclaw/workspace/wholesale-portal djmac@100.103.254.11:~/wholesale-portal

# Or if already cloned:
ssh djmac@100.103.254.11 'cd ~/wholesale-portal && git pull'
```

### 2. SSH into Mac Mini

```bash
ssh djmac@100.103.254.11
```

### 3. Create PostgreSQL Database

```bash
createdb drprepper_wholesale
```

### 4. Install Dependencies

```bash
cd ~/wholesale-portal
npm install
```

### 5. Create .env File

```bash
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drprepper_wholesale
DB_USER=postgres
DB_PASSWORD=
PORT=5001
ADMIN_EMAIL=admin@drprepper.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ORDERS_EMAIL=dj@drprepperusa.com
EOF
```

### 6. Run Migrations

```bash
npm run migrate
```

### 7. Seed Database

```bash
npm run seed
```

This creates demo customers and imports products from products.json (if available).

### 8. Start with PM2

```bash
# Start the process
pm2 start server.js --name wholesale-portal --port 5001

# Save PM2 config so it restarts on reboot
pm2 save
```

### 9. Verify PM2 Process

```bash
pm2 status
pm2 logs wholesale-portal
```

### 10. Test API

```bash
curl http://localhost:5001/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### 11. Test Login (Demo Customer)

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@happysnacks.com","password":"demo1234"}'
```

Expected response:
```json
{
  "success": true,
  "vendor": {
    "id": "c1",
    "email": "buyer@happysnacks.com",
    "name": "John Buyer",
    "companyName": "Happy Snacks Co."
  },
  "token": "YnV5ZXJAaGFwcHlzbmFja3MuY29tOmMx"
}
```

### 12. Configure Cloudflare Tunnel

If not already configured, add ingress rule to `~/.cloudflared/config.yml`:

```yaml
ingress:
  - hostname: wholesale.drprepperusa.com
    service: http://localhost:5001
  - service: http_status:404
```

Then reload:
```bash
cloudflared tunnel reload
```

### 13. Access Portal

**Customer Login**: https://wholesale.drprepperusa.com/01_login.html
**Admin Login**: Same URL, toggle to "Admin Portal" tab

Demo Credentials:
- Email: buyer@happysnacks.com
- Password: demo1234

## Troubleshooting

### PM2 process won't start

```bash
pm2 delete wholesale-portal
npm start  # Run in foreground to see errors
```

Check for:
- PostgreSQL connection errors (is DB running?)
- Port 5001 already in use
- Missing .env variables

### Database connection fails

```bash
# Test PostgreSQL connection
psql -U postgres -d drprepper_wholesale -c "SELECT 1"
```

If DB doesn't exist:
```bash
createdb drprepper_wholesale
npm run migrate
```

### SSL certificate errors with email

For Gmail:
1. Enable 2FA on Google account
2. Generate "App Password" at https://myaccount.google.com/apppasswords
3. Put app password in EMAIL_PASS in .env (not your actual Gmail password)

## Logs & Monitoring

```bash
# View logs
pm2 logs wholesale-portal

# Monitor in real-time
pm2 monit

# Save logs
pm2 save
pm2 startup
```

## Updates & Maintenance

### Pull latest code

```bash
cd ~/wholesale-portal
git pull
npm install
pm2 restart wholesale-portal
```

### Backup database

```bash
pg_dump drprepper_wholesale > ~/backups/wholesale-$(date +%Y%m%d).sql
```

### Restore database

```bash
psql drprepper_wholesale < ~/backups/wholesale-20240305.sql
```

## Port Reference

- **5000**: Existing vendor-portal (old)
- **5001**: Wholesale portal (new)
- **5432**: PostgreSQL
- **HTTPS**: Cloudflare Tunnel (transparent)

## Production Checklist

- [ ] Create admin account (not buyer@happysnacks.com)
- [ ] Change demo customer passwords
- [ ] Set up email notifications (ORDERS_EMAIL)
- [ ] Configure CORS origins if needed
- [ ] Enable HTTPS redirects
- [ ] Set up database backups
- [ ] Monitor PM2 logs regularly
- [ ] Test order placement end-to-end
- [ ] Test admin visibility overrides
- [ ] Document custom admin credentials
