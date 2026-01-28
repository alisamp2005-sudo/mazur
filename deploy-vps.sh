#!/bin/bash
set -e

echo "=== ElevenLabs Call Admin - VPS Deployment ==="

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js 22.x
echo "Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pnpm
echo "Installing pnpm..."
npm install -g pnpm

# Install MySQL
echo "Installing MySQL..."
apt-get install -y mysql-server

# Install Nginx
echo "Installing Nginx..."
apt-get install -y nginx

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Install certbot for SSL
echo "Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

echo "=== Installation complete! ==="
