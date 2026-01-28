# ElevenLabs Call Admin - VPS Deployment Guide

## Server Information
- **IP Address:** 150.241.230.244
- **User:** root
- **Password:** 7IBUkk7IPSd2dKGpTuzI

## Prerequisites
All files are ready in `/home/ubuntu/elevenlabs_call_admin/` and `/home/ubuntu/elevenlabs-deploy.tar.gz`

---

## Step 1: Connect to VPS

```bash
ssh root@150.241.230.244
# Password: 7IBUkk7IPSd2dKGpTuzI
```

---

## Step 2: Install Required Software

```bash
# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install MySQL
apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

# Install Nginx
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Install PM2
npm install -g pm2
```

---

## Step 3: Configure MySQL Database

```bash
# Set root password and create database
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Jfdhh3929hhhsaa@';"
mysql -u root -p'Jfdhh3929hhhsaa@' -e "CREATE DATABASE elevenlabs_calls;"
mysql -u root -p'Jfdhh3929hhhsaa@' -e "CREATE USER 'elevenlabs'@'localhost' IDENTIFIED BY 'Jfdhh3929hhhsaa@';"
mysql -u root -p'Jfdhh3929hhhsaa@' -e "GRANT ALL PRIVILEGES ON elevenlabs_calls.* TO 'elevenlabs'@'localhost';"
mysql -u root -p'Jfdhh3929hhhsaa@' -e "FLUSH PRIVILEGES;"
```

---

## Step 4: Upload and Extract Application

On your local machine:
```bash
scp /home/ubuntu/elevenlabs-deploy.tar.gz root@150.241.230.244:/root/
```

On VPS:
```bash
# Create application directory
mkdir -p /var/www/elevenlabs-admin
cd /var/www/elevenlabs-admin

# Extract application
tar -xzf /root/elevenlabs-deploy.tar.gz

# Install dependencies
pnpm install
```

---

## Step 5: Configure Environment Variables

```bash
cd /var/www/elevenlabs-admin

# Create .env file
cat > .env << 'ENV_FILE'
# Database
DATABASE_URL=mysql://elevenlabs:Jfdhh3929hhhsaa@@localhost:3306/elevenlabs_calls

# ElevenLabs
ELEVENLABS_API_KEY=sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14

# 3CX Integration
TCX_API_URL=https://clientservicesltd.3cx.agency/
TCX_API_EMAIL=siobodanstarn@gmail.com
TCX_API_PASSWORD=TimeTrial@123

# JWT Secret (generate random)
JWT_SECRET=$(openssl rand -hex 32)

# OAuth (use Manus defaults or create your own)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
VITE_APP_ID=your_app_id_here

# Owner info
OWNER_OPEN_ID=admin
OWNER_NAME=Admin

# App settings
VITE_APP_TITLE=ElevenLabs Call Admin
VITE_APP_LOGO=/logo.png
NODE_ENV=production
ENV_FILE

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

---

## Step 6: Run Database Migrations

```bash
cd /var/www/elevenlabs-admin
pnpm db:push
```

---

## Step 7: Build Application

```bash
cd /var/www/elevenlabs-admin
pnpm run build
```

---

## Step 8: Configure Nginx

```bash
cat > /etc/nginx/sites-available/elevenlabs-admin << 'NGINX_CONFIG'
server {
    listen 80;
    server_name 150.241.230.244;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_CONFIG

# Enable site
ln -sf /etc/nginx/sites-available/elevenlabs-admin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

---

## Step 9: Start Application with PM2

```bash
cd /var/www/elevenlabs-admin

# Start with PM2
pm2 start server/index.ts --name elevenlabs-admin --interpreter tsx
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs elevenlabs-admin
```

---

## Step 10: Configure Firewall

```bash
# Allow HTTP and SSH
ufw allow 80/tcp
ufw allow 22/tcp
ufw enable
```

---

## Step 11: Create Admin User

```bash
cd /var/www/elevenlabs-admin

# Create admin user in database
mysql -u root -p'Jfdhh3929hhhsaa@' elevenlabs_calls << 'SQL'
INSERT INTO users (open_id, email, name, role, created_at, updated_at)
VALUES ('admin', 'admin@odmen.adm', 'Admin', 'admin', NOW(), NOW());
SQL
```

---

## Step 12: Test Deployment

1. Open browser: `http://150.241.230.244`
2. Login with: `admin@odmen.adm` / `AHShbdb3434HShs36!@`
3. Test making a call
4. Test batch calls upload
5. Test queue controls (Start/Pause/Resume/Stop)

---

## Useful Commands

```bash
# View logs
pm2 logs elevenlabs-admin

# Restart application
pm2 restart elevenlabs-admin

# Stop application
pm2 stop elevenlabs-admin

# Check Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Check MySQL
mysql -u root -p'Jfdhh3929hhhsaa@' elevenlabs_calls

# Update application
cd /var/www/elevenlabs-admin
git pull  # if using git
pnpm install
pnpm run build
pm2 restart elevenlabs-admin
```

---

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs elevenlabs-admin --lines 100

# Check if port 3000 is in use
netstat -tuln | grep 3000

# Restart PM2
pm2 delete elevenlabs-admin
pm2 start server/index.ts --name elevenlabs-admin --interpreter tsx
```

### Database connection errors
```bash
# Check MySQL status
systemctl status mysql

# Test connection
mysql -u elevenlabs -p'Jfdhh3929hhhsaa@' elevenlabs_calls
```

### Nginx errors
```bash
# Test configuration
nginx -t

# Check logs
tail -f /var/log/nginx/error.log
```

---

## Security Recommendations

1. **Change default passwords** after deployment
2. **Setup SSL certificate** (optional, since using IP):
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```
3. **Configure firewall** properly
4. **Regular backups** of database:
   ```bash
   mysqldump -u root -p'Jfdhh3929hhhsaa@' elevenlabs_calls > backup.sql
   ```
5. **Monitor logs** regularly

---

## Next Steps After Deployment

1. Test call distribution to Ring Group 801
2. Test Queue Manager automatic pause when operators busy
3. Configure ElevenLabs agent Custom Tool to point to: `http://150.241.230.244/api/webhook/check-operator-availability`
4. Test full workflow: AI call → operator check → transfer → queue management

---

**Deployment completed!** 🎉

Access your admin panel at: `http://150.241.230.244`
