# DR Prepper Wholesale Portal — Deployment Guide

> This guide covers deploying the portal to a new server, migrating to a new host, and updating the application.

---

## Architecture Overview

```
Internet
    │
    ▼
Nginx (443/80) ← SSL/TLS (Let's Encrypt)
    │
    ▼
Node.js Express (port 5001)
    │
    ▼
PostgreSQL 15 (local, port 5432)
    │
Static files: /public (built by Vite)
```

---

## Prerequisites

- Ubuntu 22.04 LTS (or macOS for local dev)
- Node.js 18+
- PostgreSQL 15
- Nginx
- Git

---

## Fresh Server Setup

### 1. Install Dependencies

```bash
# System packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Node.js 18 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2. Create Database & User

```bash
sudo -u postgres psql <<EOF
CREATE USER drprepper WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE drprepper_wholesale OWNER drprepper;
GRANT ALL PRIVILEGES ON DATABASE drprepper_wholesale TO drprepper;
EOF
```

### 3. Clone & Configure

```bash
cd /var/www
git clone https://github.com/YOUR_REPO/drprepper-wholesale-portal.git
cd drprepper-wholesale-portal

# Install dependencies
npm install

# Create .env
cat > .env <<EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drprepper_wholesale
DB_USER=drprepper
DB_PASSWORD=STRONG_PASSWORD_HERE
PORT=5001
JWT_SECRET=$(openssl rand -hex 64)
ADMIN_EMAIL=admin@drprepper.com
NODE_ENV=production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
EOF
chmod 600 .env
```

### 4. Initialize Database

```bash
# Run schema
psql -U drprepper -d drprepper_wholesale -f schema.sql

# Seed data (if fresh install)
node scripts/seed.js
```

### 5. Build Frontend

```bash
npm run build
# Outputs to /public
```

### 6. Set Up PM2 (Process Manager)

```bash
npm install -g pm2

# Start the server
pm2 start server.js --name drprepper-wholesale --env production

# Auto-start on reboot
pm2 startup
pm2 save
```

### 7. Configure Nginx

```bash
sudo cat > /etc/nginx/sites-available/wholesale.drprepperusa.com <<'EOF'
server {
    listen 80;
    server_name wholesale.drprepperusa.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wholesale.drprepperusa.com;

    # SSL (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/wholesale.drprepperusa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wholesale.drprepperusa.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }

    # Static assets with caching
    location /assets/ {
        proxy_pass http://localhost:5001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Product images with caching
    location /images/ {
        proxy_pass http://localhost:5001;
        expires 7d;
        add_header Cache-Control "public";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/wholesale.drprepperusa.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL Certificate

```bash
sudo certbot --nginx -d wholesale.drprepperusa.com
# Auto-renews via systemd timer
```

### 9. Set Up Backups

```bash
# Make backup script executable
chmod +x /var/www/drprepper-wholesale-portal/backup.sh

# Edit backup.sh to set correct paths (update SCRIPT_DIR and PG_DUMP_PATH)
nano /var/www/drprepper-wholesale-portal/backup.sh

# Add cron (runs at 2 AM daily)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/drprepper-wholesale-portal/backup.sh >> /var/www/drprepper-wholesale-portal/backups/cron.log 2>&1") | crontab -

# Test backup
./backup.sh
```

### 10. Create Admin Account

```bash
# The admin account must have email matching ADMIN_EMAIL in .env
# Option 1: Register through the portal, then manually activate
# Option 2: Insert directly:
psql -U drprepper -d drprepper_wholesale <<EOF
INSERT INTO customers (id, company_name, contact_name, email, password_hash, active)
VALUES (
  'admin',
  'DR Prepper Admin',
  'DJ',
  'admin@drprepper.com',
  '$(node -e "const bcrypt=require('bcrypt'); bcrypt.hash('YOUR_ADMIN_PASSWORD', 10).then(h => process.stdout.write(h))")',
  true
);
EOF
```

---

## Updating the Application

### Code Update (no schema changes)

```bash
cd /var/www/drprepper-wholesale-portal
git pull origin main

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Restart server (zero-downtime with PM2)
pm2 reload drprepper-wholesale
```

### Schema Migration

If schema changes are needed:
```bash
# Always backup first!
./backup.sh

# Apply migration
psql -U drprepper -d drprepper_wholesale -f migrations/MIGRATION_NAME.sql

# Verify
psql -U drprepper -d drprepper_wholesale -c "\d products"

# Restart server
pm2 reload drprepper-wholesale
```

---

## Monitoring Setup

### UptimeRobot (free tier)
1. Create account at https://uptimerobot.com
2. Add HTTP(S) monitor:
   - URL: `https://wholesale.drprepperusa.com/api/health`
   - Interval: 5 minutes
   - Keyword: `"status":"ok"`
3. Add alert contacts (email/SMS)

### PM2 Monitoring
```bash
pm2 monit          # Live dashboard
pm2 logs           # Stream logs
pm2 status         # Process status
```

### Log Rotation (PM2)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## Rollback Procedure

```bash
# 1. Identify last good commit
git log --oneline -10

# 2. Backup current state
./backup.sh

# 3. Roll back code
git checkout <COMMIT_HASH>
npm run build
pm2 reload drprepper-wholesale

# 4. If schema changed, restore database from backup
# See PRODUCTION_RUNBOOK.md → Restore from backup
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | localhost | PostgreSQL host |
| `DB_PORT` | No | 5432 | PostgreSQL port |
| `DB_NAME` | Yes | drprepper_wholesale | Database name |
| `DB_USER` | Yes | — | DB user |
| `DB_PASSWORD` | Yes | — | DB password |
| `PORT` | No | 5001 | Node.js port |
| `JWT_SECRET` | Yes | — | JWT signing secret (min 32 chars) |
| `ADMIN_EMAIL` | Yes | admin@drprepper.com | Admin account email |
| `NODE_ENV` | No | — | Set to `production` |
| `EMAIL_HOST` | No | smtp.gmail.com | SMTP host |
| `EMAIL_PORT` | No | 587 | SMTP port |
| `EMAIL_USER` | No | — | SMTP user |
| `EMAIL_PASS` | No | — | SMTP app password |

---

## Security Checklist

Before going live:

- [ ] `JWT_SECRET` is at least 32 random characters
- [ ] `DB_PASSWORD` is strong and unique
- [ ] `.env` file has `chmod 600` permissions
- [ ] Admin account password is strong
- [ ] SSL certificate is valid
- [ ] Nginx security headers are set
- [ ] Firewall allows only 80/443 (Nginx) and 22 (SSH)
- [ ] `DB_HOST` is localhost (not exposed to internet)
- [ ] Backups are running and tested
- [ ] `NODE_ENV=production` is NOT in .env (Vite limitation — set it elsewhere)

---

## Firewall Setup

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP → redirects to HTTPS
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5001       # Node.js — internal only
sudo ufw deny 5432       # PostgreSQL — internal only
sudo ufw enable
```

---

## Backup to Backblaze B2 (optional)

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure B2
rclone config
# Name: b2
# Type: b2
# Account ID: your_account_id
# Application key: your_key

# Test
rclone ls b2:your-bucket-name

# Enable in backup.sh:
# RCLONE_REMOTE="b2:drprepper-backups"
```
