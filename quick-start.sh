#!/bin/bash

###############################################################################
# Mazur Admin Panel - Quick Start Script
# 
# Быстрый запуск для локальной разработки или тестирования
###############################################################################

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "========================================="
echo "  Mazur Admin Panel - Quick Start"
echo "========================================="
echo -e "${NC}"

# Проверка .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env файл не найден. Создаем из примера...${NC}"
    cat > .env << 'EOF'
# Database
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=mazur

# VoximPlant
VOXIMPLANT_ACCOUNT_ID=10266354
VOXIMPLANT_API_KEY=96760ec5-b82e-4e4f-95fa-ab4b56e25cfd

# ElevenLabs
ELEVENLABS_API_KEY=sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14
ELEVENLABS_AGENT_ID=agent_8301kfgw54f5eekabw8htz6ekgnw

# Server
NODE_ENV=development
PORT=3000
EOF
    echo -e "${GREEN}✓ .env файл создан${NC}"
fi

# Установка зависимостей
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
    pnpm install
    echo -e "${GREEN}✓ Зависимости установлены${NC}"
fi

# Запуск dev сервера
echo -e "${GREEN}"
echo "🚀 Запуск dev сервера..."
echo ""
echo "Приложение будет доступно на: http://localhost:3000"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo -e "${NC}"

pnpm dev
