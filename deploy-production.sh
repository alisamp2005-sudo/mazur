#!/bin/bash

###############################################################################
# Mazur Admin Panel - Production Deployment Script
# 
# Этот скрипт автоматизирует развертывание приложения на production сервере
###############################################################################

set -e  # Остановить при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции для вывода
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_header() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
    echo ""
}

# Проверка, что скрипт запущен из правильной директории
if [ ! -f "package.json" ]; then
    print_error "Запустите скрипт из корневой директории проекта!"
    exit 1
fi

print_header "🚀 Mazur Admin Panel - Production Deployment"

# 1. Проверка Node.js
print_info "Проверка Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен!"
    echo "Установите Node.js 18+ и попробуйте снова"
    exit 1
fi
NODE_VERSION=$(node -v)
print_success "Node.js установлен: $NODE_VERSION"

# 2. Проверка pnpm
print_info "Проверка pnpm..."
if ! command -v pnpm &> /dev/null; then
    print_info "pnpm не установлен. Устанавливаем..."
    npm install -g pnpm
fi
PNPM_VERSION=$(pnpm -v)
print_success "pnpm установлен: $PNPM_VERSION"

# 3. Проверка MySQL
print_info "Проверка MySQL..."
if ! command -v mysql &> /dev/null; then
    print_error "MySQL не установлен!"
    echo "Установите MySQL 8.0+ и попробуйте снова"
    exit 1
fi
print_success "MySQL установлен"

# 4. Проверка .env файла
print_info "Проверка .env файла..."
if [ ! -f ".env" ]; then
    print_error ".env файл не найден!"
    echo "Создайте .env файл с необходимыми переменными окружения"
    exit 1
fi
print_success ".env файл найден"

# 5. Установка зависимостей
print_header "📦 Установка зависимостей"
print_info "Установка npm пакетов..."
pnpm install --frozen-lockfile
print_success "Зависимости установлены"

# 6. Применение миграций базы данных
print_header "🗄️ Применение миграций базы данных"

# Загрузить переменные окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

print_info "Применение миграций..."

# Проверка подключения к БД
if mysql -h "$DATABASE_HOST" -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" -e "USE $DATABASE_NAME" 2>/dev/null; then
    print_success "Подключение к базе данных успешно"
    
    # Применить миграции
    for migration in migrations/*.sql; do
        if [ -f "$migration" ]; then
            print_info "Применение $(basename $migration)..."
            mysql -h "$DATABASE_HOST" -u "$DATABASE_USER" -p"$DATABASE_PASSWORD" "$DATABASE_NAME" < "$migration" 2>/dev/null || true
        fi
    done
    
    print_success "Миграции применены"
else
    print_error "Не удалось подключиться к базе данных"
    echo "Проверьте настройки DATABASE_* в .env файле"
    exit 1
fi

# 7. Сборка проекта
print_header "🔨 Сборка production версии"
print_info "Сборка frontend и backend..."
pnpm run build
print_success "Проект собран"

# 8. Проверка PM2
print_header "🔄 Настройка PM2"
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 не установлен. Устанавливаем..."
    npm install -g pm2
    print_success "PM2 установлен"
else
    print_success "PM2 уже установлен"
fi

# 9. Запуск/перезапуск приложения
print_header "🚀 Запуск приложения"

# Проверить, запущено ли приложение
if pm2 describe mazur &> /dev/null; then
    print_info "Перезапуск приложения..."
    pm2 restart mazur
    print_success "Приложение перезапущено"
else
    print_info "Запуск приложения..."
    pm2 start dist/index.js --name mazur
    print_success "Приложение запущено"
fi

# 10. Сохранить конфигурацию PM2
print_info "Сохранение конфигурации PM2..."
pm2 save
print_success "Конфигурация сохранена"

# 11. Настроить автозапуск (если еще не настроен)
if ! systemctl is-enabled pm2-$(whoami) &> /dev/null; then
    print_info "Настройка автозапуска PM2..."
    pm2 startup | tail -n 1 | bash
    pm2 save
    print_success "Автозапуск настроен"
fi

# 12. Проверка статуса
print_header "✅ Deployment завершен!"
echo ""
pm2 status
echo ""

print_success "Приложение успешно развернуто!"
echo ""
print_info "Полезные команды:"
echo "  pm2 status          - Статус приложения"
echo "  pm2 logs mazur      - Просмотр логов"
echo "  pm2 restart mazur   - Перезапуск приложения"
echo "  pm2 stop mazur      - Остановка приложения"
echo ""

# Получить порт из .env или использовать 3000 по умолчанию
PORT=${PORT:-3000}
print_info "Приложение доступно на: http://localhost:$PORT"
echo ""
