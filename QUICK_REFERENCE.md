# Mazur Admin Panel - Quick Reference

## 🚀 Быстрые команды

### Локальная разработка

```bash
# Быстрый старт
./quick-start.sh

# Или вручную
pnpm install
pnpm dev
```

Приложение: `http://localhost:3000`

---

### Production на VPS

```bash
# Автоматическое развертывание
./deploy-production.sh

# Или вручную
pnpm install
pnpm run build
pm2 start dist/index.js --name mazur
pm2 save
```

---

### Docker развертывание

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Логи
docker-compose logs -f

# Обновление
git pull && docker-compose up -d --build
```

---

## 📁 Структура проекта

```
mazur/
├── client/                  # Frontend (React + TypeScript)
│   └── src/
│       ├── pages/
│       │   ├── calls/       # Единичные звонки
│       │   ├── campaigns/   # Массовые кампании
│       │   └── reports/     # Отчеты
│       └── App.tsx
│
├── server/                  # Backend (Node.js + tRPC)
│   ├── routers/
│   │   ├── voximplant.ts   # VoximPlant API
│   │   └── campaigns.ts    # Кампании и звонки
│   ├── voximplant-api.ts   # VoximPlant клиент
│   └── voximplant-db.ts    # Database операции
│
├── migrations/              # SQL миграции
│   ├── 001_initial.sql
│   ├── 002_voximplant.sql
│   └── 003_add_campaigns.sql
│
└── .env                     # Переменные окружения
```

---

## 🔑 Переменные окружения (.env)

```env
# Database
DATABASE_HOST=localhost
DATABASE_USER=mazur
DATABASE_PASSWORD=your_password
DATABASE_NAME=mazur

# VoximPlant
VOXIMPLANT_ACCOUNT_ID=10266354
VOXIMPLANT_API_KEY=your_api_key

# ElevenLabs
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id

# Server
NODE_ENV=production
PORT=3000
```

---

## 📊 Основные страницы

| URL | Описание |
|-----|----------|
| `/calls/make` | Сделать единичный звонок |
| `/campaigns` | Список кампаний |
| `/campaigns/new` | Создать кампанию |
| `/reports` | Отчеты и статистика |
| `/voximplant/call-history` | История звонков |
| `/voximplant/applications` | Приложения VoximPlant |

---

## 🔧 Полезные команды

### NPM Scripts

```bash
pnpm dev          # Запуск dev сервера
pnpm build        # Сборка production
pnpm start        # Запуск production
pnpm check        # TypeScript проверка
pnpm format       # Форматирование кода
```

### PM2 (Production)

```bash
pm2 start dist/index.js --name mazur   # Запуск
pm2 restart mazur                      # Перезапуск
pm2 stop mazur                         # Остановка
pm2 logs mazur                         # Логи
pm2 status                             # Статус
pm2 save                               # Сохранить
```

### MySQL

```bash
# Подключение
mysql -u mazur -p mazur

# Применить миграцию
mysql -u mazur -p mazur < migrations/003_add_campaigns.sql

# Бэкап
mysqldump -u mazur -p mazur > backup.sql

# Восстановление
mysql -u mazur -p mazur < backup.sql
```

### Git

```bash
git pull origin main                   # Получить изменения
git add -A                             # Добавить все
git commit -m "message"                # Коммит
git push origin main                   # Отправить
```

---

## 🐛 Troubleshooting

### Приложение не запускается

```bash
# Проверить логи
pm2 logs mazur --lines 50

# Проверить порт
netstat -tlnp | grep 3000

# Проверить переменные окружения
cat .env
```

### Ошибки базы данных

```bash
# Проверить подключение
mysql -u mazur -p mazur -e "SELECT 1;"

# Проверить таблицы
mysql -u mazur -p mazur -e "SHOW TABLES;"

# Пересоздать таблицы
mysql -u mazur -p mazur < migrations/001_initial.sql
```

### Ошибки сборки

```bash
# Очистить node_modules
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Очистить кэш
pnpm store prune
```

---

## 📞 API Endpoints (tRPC)

### Campaigns

```typescript
// Единичный звонок
campaigns.makeSingleCall({
  applicationId: number,
  phoneNumber: string,
  callerId: string
})

// Создать кампанию
campaigns.createCampaign({
  applicationId: number,
  campaignName: string,
  phoneNumbers: string[]
})

// Запустить кампанию
campaigns.startCampaign({
  campaignId: number,
  phoneNumbers: string[],
  callerId: string,
  delayBetweenCalls: number
})

// Получить кампании
campaigns.getCampaigns({
  applicationId: number
})
```

### VoximPlant

```typescript
// Получить статистику
voximplant.getStats({
  applicationId: number,
  startDate?: number,
  endDate?: number
})

// Получить звонки
voximplant.getCalls({
  applicationId: number,
  limit?: number,
  startDate?: number,
  endDate?: number
})
```

---

## 🔐 Безопасность

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

### Бэкапы

```bash
# Создать бэкап
mysqldump -u mazur -p mazur > backup_$(date +%Y%m%d).sql

# Автоматический бэкап (cron)
0 2 * * * ~/backup-mazur.sh
```

---

## 📚 Документация

- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - Полный гайд по VPS deployment
- **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** - Docker deployment
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Настройка и использование
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Техническая документация

---

## 🎯 Основные функции

### Единичный звонок
1. Перейти на `/calls/make`
2. Выбрать приложение
3. Ввести номер и Caller ID
4. Нажать "Позвонить"

### Массовая кампания
1. Перейти на `/campaigns/new`
2. Создать кампанию с названием
3. Вставить список номеров
4. Запустить кампанию

### Просмотр отчетов
1. Перейти на `/reports`
2. Выбрать период
3. Анализировать метрики

---

## ✅ Checklist развертывания

- [ ] Node.js 18+ установлен
- [ ] MySQL 8.0+ установлен
- [ ] pnpm установлен
- [ ] Репозиторий клонирован
- [ ] .env файл настроен
- [ ] База данных создана
- [ ] Миграции применены
- [ ] Зависимости установлены
- [ ] Проект собран
- [ ] PM2 настроен
- [ ] Nginx настроен (опционально)
- [ ] SSL настроен (опционально)
- [ ] Firewall настроен
- [ ] Бэкапы настроены

---

**Готово к работе!** 🚀
