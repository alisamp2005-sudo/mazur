#!/bin/bash
set -e

echo "=== ElevenLabs Call Admin - Complete VPS Deployment ==="

# Variables
MYSQL_ROOT_PASSWORD="Jfdhh3929hhhsaa@"
DB_NAME="elevenlabs_calls"
DB_USER="elevenlabs"
DB_PASSWORD="Jfdhh3929hhhsaa@"
APP_DIR="/var/www/elevenlabs-admin"

# Update system
echo "Step 1: Updating system..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install Node.js 22.x
echo "Step 2: Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pnpm
echo "Step 3: Installing pnpm..."
npm install -g pnpm

# Install MySQL
echo "Step 4: Installing MySQL..."
DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

# Configure MySQL
echo "Step 5: Configuring MySQL..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;"

# Install Nginx
echo "Step 6: Installing Nginx..."
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Install PM2
echo "Step 7: Installing PM2..."
npm install -g pm2

# Create app directory
echo "Step 8: Creating application directory..."
mkdir -p ${APP_DIR}

# Configure Nginx
echo "Step 9: Configuring Nginx..."
cat > /etc/nginx/sites-available/elevenlabs-admin << 'NGINX_CONFIG'
server {
    listen 80;
    server_name 150.241.230.244;

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
    }
}
NGINX_CONFIG

ln -sf /etc/nginx/sites-available/elevenlabs-admin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "=== Installation complete! ==="
echo "Next: Upload application code to ${APP_DIR}"
echo "Database: ${DB_NAME}"
echo "Database User: ${DB_USER}"
