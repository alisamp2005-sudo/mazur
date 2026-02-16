# Production Deployment Guide - Mazur Admin Panel

## 🚀 Быстрый запуск на production сервере

Это руководство поможет вам развернуть Mazur Admin Panel на production сервере (VPS).

---

## 📋 Требования к серверу

### Минимальные требования:
- **OS:** Ubuntu 20.04+ / Debian 11+
- **RAM:** 2 GB минимум, 4 GB рекомендуется
- **CPU:** 1 core минимум, 2+ cores рекомендуется
- **Disk:** 10 GB свободного места
- **Network:** Публичный IP адрес

### Необходимое ПО:
- Node.js 18+
- MySQL 8.0+
- Git
- pnpm (или npm)

---

## 🔧 Установка на сервер

### Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
# или
ssh ubuntu@your-server-ip
```

### Шаг 2: Установка зависимостей

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установить MySQL
sudo apt install -y mysql-server

# Установить pnpm
npm install -g pnpm

# Установить Git (если не установлен)
sudo apt install -y git
```

### Шаг 3: Настройка MySQL

```bash
# Запустить MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Создать базу данных
sudo mysql -e "CREATE DATABASE mazur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'mazur'@'localhost' IDENTIFIED BY 'your_secure_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON mazur.* TO 'mazur'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### Шаг 4: Клонирование репозитория

```bash
# Перейти в домашнюю директорию
cd ~

# Клонировать репозиторий
git clone https://github.com/alisamp2005-sudo/mazur.git
cd mazur
```

### Шаг 5: Настройка переменных окружения

```bash
# Создать .env файл
cat > .env << 'EOF'
# Database
DATABASE_HOST=localhost
DATABASE_USER=mazur
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=mazur

# VoximPlant
VOXIMPLANT_ACCOUNT_ID=10266354
VOXIMPLANT_API_KEY=96760ec5-b82e-4e4f-95fa-ab4b56e25cfd

# ElevenLabs
ELEVENLABS_API_KEY=sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14
ELEVENLABS_AGENT_ID=agent_8301kfgw54f5eekabw8htz6ekgnw

# Server
NODE_ENV=production
PORT=3000
EOF

# Замените your_secure_password на реальный пароль!
nano .env
```

### Шаг 6: Установка зависимостей проекта

```bash
# Установить пакеты
pnpm install
```

### Шаг 7: Применение миграций базы данных

```bash
# Применить все миграции
mysql -u mazur -p mazur < migrations/001_initial.sql
mysql -u mazur -p mazur < migrations/002_voximplant.sql
mysql -u mazur -p mazur < migrations/003_add_campaigns.sql
```

### Шаг 8: Сборка production версии

```bash
# Собрать frontend и backend
pnpm run build
```

---

## 🎯 Запуск приложения

### Вариант 1: Простой запуск (для тестирования)

```bash
# Запустить сервер
pnpm start
```

Приложение будет доступно на `http://your-server-ip:3000`

### Вариант 2: Запуск с PM2 (рекомендуется)

PM2 - это production process manager для Node.js приложений.

```bash
# Установить PM2 глобально
npm install -g pm2

# Запустить приложение с PM2
pm2 start dist/index.js --name mazur

# Настроить автозапуск при перезагрузке сервера
pm2 startup
pm2 save

# Полезные команды PM2:
pm2 status          # Статус приложения
pm2 logs mazur      # Логи приложения
pm2 restart mazur   # Перезапуск
pm2 stop mazur      # Остановка
pm2 delete mazur    # Удаление из PM2
```

---

## 🌐 Настройка Nginx (обратный прокси)

Для production рекомендуется использовать Nginx как обратный прокси.

### Установка Nginx

```bash
sudo apt install -y nginx
```

### Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/mazur
```

Вставьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Замените на ваш домен или IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Активация конфигурации

```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/mazur /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

Теперь приложение доступно на `http://your-domain.com`

---

## 🔒 Настройка SSL (HTTPS)

Для безопасности рекомендуется использовать HTTPS.

### Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Получение SSL сертификата

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot автоматически настроит Nginx для HTTPS.

### Автоматическое обновление сертификата

```bash
# Проверить автообновление
sudo certbot renew --dry-run
```

Теперь приложение доступно на `https://your-domain.com` 🔒

---

## 📊 Мониторинг и логи

### PM2 логи

```bash
# Просмотр логов в реальном времени
pm2 logs mazur

# Последние 100 строк
pm2 logs mazur --lines 100

# Очистить логи
pm2 flush
```

### Nginx логи

```bash
# Access логи
sudo tail -f /var/log/nginx/access.log

# Error логи
sudo tail -f /var/log/nginx/error.log
```

### MySQL логи

```bash
# Error логи
sudo tail -f /var/log/mysql/error.log
```

---

## 🔄 Обновление приложения

Когда вы делаете изменения в коде:

```bash
# 1. Перейти в директорию проекта
cd ~/mazur

# 2. Получить последние изменения
git pull origin main

# 3. Установить новые зависимости (если есть)
pnpm install

# 4. Применить новые миграции (если есть)
mysql -u mazur -p mazur < migrations/004_new_migration.sql

# 5. Пересобрать проект
pnpm run build

# 6. Перезапустить приложение
pm2 restart mazur
```

---

## 🛡️ Безопасность

### Firewall (UFW)

```bash
# Установить UFW
sudo apt install -y ufw

# Разрешить SSH
sudo ufw allow 22/tcp

# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить firewall
sudo ufw enable

# Проверить статус
sudo ufw status
```

### Ограничение доступа к MySQL

```bash
# Убедитесь, что MySQL слушает только localhost
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Найдите и убедитесь, что есть:
# bind-address = 127.0.0.1

# Перезапустить MySQL
sudo systemctl restart mysql
```

### Регулярные бэкапы базы данных

```bash
# Создать скрипт бэкапа
cat > ~/backup-mazur.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u mazur -p'your_secure_password' mazur > ~/backups/mazur_$DATE.sql
# Удалить бэкапы старше 7 дней
find ~/backups -name "mazur_*.sql" -mtime +7 -delete
EOF

# Сделать исполняемым
chmod +x ~/backup-mazur.sh

# Создать директорию для бэкапов
mkdir -p ~/backups

# Добавить в cron (ежедневно в 2 ночи)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-mazur.sh") | crontab -
```

---

## 🐳 Docker Deployment (альтернатива)

Если вы предпочитаете Docker:

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=db
      - DATABASE_USER=mazur
      - DATABASE_PASSWORD=your_secure_password
      - DATABASE_NAME=mazur
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=mazur
      - MYSQL_USER=mazur
      - MYSQL_PASSWORD=your_secure_password
      - MYSQL_ROOT_PASSWORD=root_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./migrations:/docker-entrypoint-initdb.d
    restart: unless-stopped

volumes:
  mysql_data:
```

### Запуск с Docker

```bash
# Собрать и запустить
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

---

## ✅ Проверка работоспособности

После развертывания проверьте:

1. **Приложение доступно:**
   - Откройте `http://your-domain.com` в браузере
   - Вы должны увидеть страницу входа

2. **База данных работает:**
   ```bash
   mysql -u mazur -p mazur -e "SHOW TABLES;"
   ```

3. **PM2 работает:**
   ```bash
   pm2 status
   ```

4. **Nginx работает:**
   ```bash
   sudo systemctl status nginx
   ```

---

## 🆘 Troubleshooting

### Приложение не запускается

```bash
# Проверить логи PM2
pm2 logs mazur --lines 50

# Проверить переменные окружения
cat .env

# Проверить подключение к БД
mysql -u mazur -p mazur -e "SELECT 1;"
```

### Nginx ошибка 502 Bad Gateway

```bash
# Проверить, что приложение запущено
pm2 status

# Проверить логи Nginx
sudo tail -f /var/log/nginx/error.log

# Перезапустить приложение
pm2 restart mazur
```

### MySQL ошибки подключения

```bash
# Проверить статус MySQL
sudo systemctl status mysql

# Проверить пользователя
mysql -u root -p -e "SELECT User, Host FROM mysql.user WHERE User='mazur';"

# Пересоздать пользователя
mysql -u root -p -e "DROP USER 'mazur'@'localhost';"
mysql -u root -p -e "CREATE USER 'mazur'@'localhost' IDENTIFIED BY 'your_password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON mazur.* TO 'mazur'@'localhost';"
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи (PM2, Nginx, MySQL)
2. Убедитесь, что все переменные окружения правильные
3. Проверьте firewall правила
4. Убедитесь, что все сервисы запущены

---

## 🎉 Готово!

Ваше приложение Mazur Admin Panel теперь работает на production сервере!

**Доступ:** `https://your-domain.com`

**Основные функции:**
- ✅ Единичные звонки (`/calls/make`)
- ✅ Массовые кампании (`/campaigns`)
- ✅ Отчеты и статистика (`/reports`)
- ✅ История звонков (`/voximplant/call-history`)

**Безопасность:**
- ✅ HTTPS (SSL)
- ✅ Firewall настроен
- ✅ MySQL защищен
- ✅ Регулярные бэкапы

**Мониторинг:**
- ✅ PM2 process manager
- ✅ Логирование
- ✅ Автозапуск при перезагрузке

---

**Приятной работы!** 🚀
