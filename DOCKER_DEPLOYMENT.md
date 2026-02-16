# Docker Deployment Guide - Mazur Admin Panel

## 🐳 Развертывание с помощью Docker

Этот гайд описывает, как развернуть Mazur Admin Panel используя Docker и Docker Compose.

---

## 📋 Требования

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git**

---

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/alisamp2005-sudo/mazur.git
cd mazur
```

### 2. Настройка переменных окружения

Создайте `.env` файл:

```bash
cat > .env << 'EOF'
# Database
DATABASE_USER=mazur
DATABASE_PASSWORD=secure_password_here
DATABASE_NAME=mazur
MYSQL_ROOT_PASSWORD=root_password_here

# VoximPlant
VOXIMPLANT_ACCOUNT_ID=10266354
VOXIMPLANT_API_KEY=96760ec5-b82e-4e4f-95fa-ab4b56e25cfd

# ElevenLabs
ELEVENLABS_API_KEY=sk_d6055dbf82bc1fadc0d8ff2ae39598a51209e2d2c79b3c14
ELEVENLABS_AGENT_ID=agent_8301kfgw54f5eekabw8htz6ekgnw
EOF
```

**⚠️ Важно:** Замените пароли на безопасные!

### 3. Запуск приложения

```bash
# Запустить все сервисы
docker-compose up -d

# Проверить статус
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

Приложение будет доступно на `http://localhost:3000`

---

## 🔧 Конфигурация

### Структура сервисов

Docker Compose запускает 2 основных сервиса:

1. **app** - Mazur Admin Panel (Node.js приложение)
2. **db** - MySQL 8.0 база данных
3. **nginx** - Nginx reverse proxy (опционально)

### Порты

- **3000** - Приложение (app)
- **3306** - MySQL (db)
- **80** - HTTP (nginx, если включен)
- **443** - HTTPS (nginx, если включен)

### Volumes

- `mysql_data` - Данные MySQL (персистентные)
- `./recordings` - Аудиозаписи звонков

---

## 📊 Управление

### Основные команды

```bash
# Запустить все сервисы
docker-compose up -d

# Остановить все сервисы
docker-compose down

# Перезапустить сервис
docker-compose restart app

# Просмотр логов
docker-compose logs -f app
docker-compose logs -f db

# Просмотр статуса
docker-compose ps

# Выполнить команду в контейнере
docker-compose exec app sh
docker-compose exec db mysql -u mazur -p mazur
```

### Обновление приложения

```bash
# 1. Получить последние изменения
git pull origin main

# 2. Пересобрать и перезапустить
docker-compose up -d --build

# 3. Проверить логи
docker-compose logs -f app
```

### Применение новых миграций

```bash
# Выполнить миграцию вручную
docker-compose exec db mysql -u mazur -p mazur < migrations/004_new_migration.sql

# Или войти в контейнер
docker-compose exec app sh
cd migrations
mysql -h db -u mazur -p mazur < 004_new_migration.sql
```

---

## 🌐 Nginx Reverse Proxy

### Включение Nginx

```bash
# Запустить с Nginx
docker-compose --profile with-nginx up -d
```

### Настройка SSL

1. Получите SSL сертификаты (Let's Encrypt, Cloudflare, и т.д.)

2. Создайте директорию для сертификатов:

```bash
mkdir -p ssl
```

3. Поместите сертификаты в `ssl/`:

```
ssl/
├── cert.pem
└── key.pem
```

4. Раскомментируйте HTTPS блок в `nginx.conf`

5. Перезапустите Nginx:

```bash
docker-compose restart nginx
```

---

## 🔐 Безопасность

### Рекомендации

1. **Смените пароли** в `.env` файле
2. **Используйте HTTPS** в production
3. **Ограничьте доступ** к портам через firewall
4. **Регулярно обновляйте** Docker образы

### Firewall (UFW)

```bash
# Разрешить только необходимые порты
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Ограничение доступа к MySQL

MySQL доступен только внутри Docker сети. Если нужен внешний доступ:

```yaml
# В docker-compose.yml закомментируйте:
# ports:
#   - "3306:3306"
```

---

## 💾 Бэкапы

### Бэкап базы данных

```bash
# Создать бэкап
docker-compose exec db mysqldump -u mazur -p mazur > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
docker-compose exec -T db mysql -u mazur -p mazur < backup_20260216_120000.sql
```

### Автоматические бэкапы

Создайте cron job:

```bash
# Создать скрипт бэкапа
cat > ~/backup-mazur-docker.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cd ~/mazur
docker-compose exec -T db mysqldump -u mazur -pmazur_password mazur > ~/backups/mazur_$DATE.sql
find ~/backups -name "mazur_*.sql" -mtime +7 -delete
EOF

chmod +x ~/backup-mazur-docker.sh

# Добавить в cron (ежедневно в 2 ночи)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-mazur-docker.sh") | crontab -
```

---

## 📈 Мониторинг

### Health Checks

Docker автоматически проверяет здоровье контейнеров:

```bash
# Проверить здоровье
docker-compose ps

# Детали health check
docker inspect mazur-app | grep -A 10 Health
```

### Логи

```bash
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs app
docker-compose logs db

# Следить за логами в реальном времени
docker-compose logs -f app

# Последние 100 строк
docker-compose logs --tail=100 app
```

### Использование ресурсов

```bash
# Статистика контейнеров
docker stats

# Использование дискового пространства
docker system df
```

---

## 🐛 Troubleshooting

### Контейнер не запускается

```bash
# Проверить логи
docker-compose logs app

# Проверить конфигурацию
docker-compose config

# Пересоздать контейнеры
docker-compose down
docker-compose up -d --force-recreate
```

### Проблемы с базой данных

```bash
# Проверить подключение к БД
docker-compose exec app sh
ping db

# Проверить MySQL
docker-compose exec db mysql -u root -p -e "SHOW DATABASES;"

# Пересоздать базу данных
docker-compose down -v  # ВНИМАНИЕ: Удалит все данные!
docker-compose up -d
```

### Приложение недоступно

```bash
# Проверить порты
docker-compose ps
netstat -tlnp | grep 3000

# Проверить логи Nginx (если используется)
docker-compose logs nginx

# Перезапустить все
docker-compose restart
```

---

## 🔄 Production Deployment

### Рекомендуемая конфигурация

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    restart: always
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  db:
    image: mysql:8.0
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

Запуск:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📊 Масштабирование

### Горизонтальное масштабирование

```bash
# Запустить несколько экземпляров приложения
docker-compose up -d --scale app=3

# Nginx автоматически распределит нагрузку
```

### Вертикальное масштабирование

Увеличьте ресурсы в `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
```

---

## ✅ Проверка развертывания

После развертывания проверьте:

1. **Контейнеры запущены:**
   ```bash
   docker-compose ps
   ```

2. **Приложение отвечает:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **База данных работает:**
   ```bash
   docker-compose exec db mysql -u mazur -p -e "SHOW TABLES;" mazur
   ```

4. **Логи без ошибок:**
   ```bash
   docker-compose logs --tail=50
   ```

---

## 🎉 Готово!

Ваше приложение Mazur Admin Panel развернуто с помощью Docker!

**Доступ:** `http://localhost:3000` (или ваш домен)

**Управление:**
- `docker-compose up -d` - Запустить
- `docker-compose down` - Остановить
- `docker-compose logs -f` - Логи
- `docker-compose restart` - Перезапустить

**Безопасность:**
- ✅ Изолированная сеть Docker
- ✅ Health checks
- ✅ Автоматический перезапуск
- ✅ Персистентные данные

---

**Приятной работы!** 🚀
