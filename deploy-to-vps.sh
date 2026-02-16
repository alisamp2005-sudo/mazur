#!/bin/bash
set -e

echo "=== ElevenLabs Call Admin Panel - VPS Deployment ==="
echo ""

# Install Node.js 22.x if not installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 22.x..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Install MySQL if not installed
if ! command -v mysql &> /dev/null; then
    echo "Installing MySQL..."
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

echo ""
echo "=== Environment setup complete! ==="
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "PM2: $(pm2 --version)"
echo "MySQL: $(mysql --version)"
echo "Nginx: $(nginx -v 2>&1)"
