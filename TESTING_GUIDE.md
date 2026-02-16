# Руководство по тестированию Voximplant интеграции

## Подготовка к тестированию

### 1. Установка зависимостей
```bash
cd /home/ubuntu/mazur
pnpm install
```

### 2. Настройка переменных окружения
Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/elevenlabs_calls

# ElevenLabs API (опционально, для тестов)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# 3CX Integration (если используется)
TCX_API_URL=https://your-3cx-instance.com/
TCX_API_EMAIL=your_email@example.com
TCX_API_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your_random_jwt_secret

# App settings
NODE_ENV=development
PORT=3000
```

### 3. Запуск базы данных
Убедитесь, что MySQL запущен и база данных создана:

```bash
# Создание базы данных
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS elevenlabs_calls;"

# Запуск миграций
pnpm db:push
```

---

## Тестирование функционала

### 1. Проверка TypeScript
```bash
pnpm check
```

**Ожидаемый результат:** Нет ошибок компиляции

---

### 2. Запуск unit тестов
```bash
pnpm test
```

**Ожидаемый результат:**
- ✅ All tests pass
- Некоторые тесты могут быть пропущены без `ELEVENLABS_API_KEY`

---

### 3. Запуск dev сервера
```bash
pnpm dev
```

**Ожидаемый результат:**
```
Server running on http://localhost:3000/
[QueueProcessor] Initialized and started
```

---

## Ручное тестирование UI

### Тест 1: Настройка Voximplant аккаунта

1. Откройте браузер: `http://localhost:3000`
2. Войдите в систему
3. Перейдите в **Voximplant → Setup**
4. Заполните форму:
   - **Account ID**: ваш Voximplant Account ID
   - **API Key**: ваш Voximplant API Key
   - **Account Name**: любое имя (опционально)
5. Нажмите **Test Connection**
   - ✅ Должно появиться сообщение "Connection successful"
6. Нажмите **Add Account**
   - ✅ Аккаунт должен появиться в списке

---

### Тест 2: Создание приложения

1. Перейдите в **Voximplant → Applications**
2. Выберите созданный аккаунт из выпадающего списка
3. Нажмите **Create Application**
4. Заполните форму:
   - **Application Name**: Test Application
   - **ElevenLabs API Key**: ваш ElevenLabs API ключ
   - **ElevenLabs Agent ID**: ID вашего агента
   - **Phone Number**: +1234567890 (опционально)
5. Нажмите **Create**
   - ✅ Приложение должно появиться в списке
6. Нажмите **View Code**
   - ✅ Должен отобразиться сгенерированный JavaScript код
7. Скопируйте код и вставьте в Voximplant Platform

---

### Тест 3: Синхронизация звонков

1. Перейдите в **Voximplant → Call History**
2. Выберите аккаунт и приложение
3. Нажмите **Sync Calls**
   - ✅ Должно появиться сообщение "Sync complete: Synced X calls"
4. Проверьте таблицу звонков:
   - ✅ Звонки должны отображаться с датой, номерами, длительностью, стоимостью

---

### Тест 4: Фильтрация звонков

1. В Call History используйте **Status Filter**:
   - Выберите "Answered"
   - ✅ Должны отображаться только успешные звонки
2. Используйте **Search**:
   - Введите номер телефона
   - ✅ Должны отображаться только звонки с этим номером

---

### Тест 5: Синхронизация транскриптов и аудио

1. Нажмите **Sync Transcripts & Audio**
   - ✅ Должно появиться сообщение "Synced X transcripts and Y audio files"
2. Проверьте таблицу:
   - ✅ В колонке "Audio" должны появиться audio players
   - ✅ Кнопка "View Transcript" должна быть доступна для звонков с транскриптом

---

### Тест 6: Проигрывание аудио

1. Найдите звонок с аудиозаписью
2. Нажмите **Play** на audio player
   - ✅ Аудио должно начать проигрываться
3. Проверьте элементы управления:
   - ✅ Pause/Play
   - ✅ Volume control
   - ✅ Progress bar

---

### Тест 7: Просмотр транскрипта

1. Найдите звонок с транскриптом
2. Нажмите **View Transcript**
   - ✅ Должно открыться модальное окно
3. Проверьте содержимое:
   - ✅ Сообщения от агента и пользователя
   - ✅ Временные метки
   - ✅ Правильное форматирование

---

### Тест 8: Получение данных по требованию

1. Найдите звонок без транскрипта (с `conversationId`)
2. Нажмите **Fetch Transcript**
   - ✅ Должно появиться сообщение "Transcript synced"
   - ✅ Кнопка должна измениться на "View Transcript"

3. Найдите звонок без аудио (с `conversationId`)
4. Нажмите **Fetch Audio**
   - ✅ Должно появиться сообщение "Audio synced"
   - ✅ Должен появиться audio player

---

### Тест 9: Статистика

1. Перейдите в **Voximplant → Statistics**
2. Выберите аккаунт и приложение
3. Проверьте отображение:
   - ✅ Total Calls
   - ✅ Answered Calls
   - ✅ Failed Calls
   - ✅ Success Rate
   - ✅ Total Duration
   - ✅ Average Duration
   - ✅ Total Cost

---

## Тестирование API endpoints

### С помощью curl:

#### 1. Тест подключения к Voximplant
```bash
curl -X POST http://localhost:3000/api/trpc/voximplant.testConnection \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "accountId": "12345678",
    "apiKey": "your_api_key"
  }'
```

#### 2. Синхронизация звонков
```bash
curl -X POST http://localhost:3000/api/trpc/voximplant.syncCalls \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "applicationId": 1
  }'
```

#### 3. Синхронизация транскрипта
```bash
curl -X POST http://localhost:3000/api/trpc/voximplant.syncTranscript \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "callId": 1
  }'
```

---

## Проверка файловой системы

### 1. Проверка директории recordings
```bash
ls -la /home/ubuntu/mazur/recordings/
```

**Ожидаемый результат:**
```
drwxr-xr-x 2 user user 4096 Feb 15 12:00 .
-rw-r--r-- 1 user user 1234567 Feb 15 12:00 call_1_conv_abc123.mp3
-rw-r--r-- 1 user user 2345678 Feb 15 12:01 call_2_conv_def456.mp3
```

### 2. Проверка доступа к аудиофайлам
```bash
curl -I http://localhost:3000/recordings/call_1_conv_abc123.mp3
```

**Ожидаемый результат:**
```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 1234567
```

---

## Тестирование с реальными данными

### Сценарий: Полный цикл звонка

1. **Настройка:**
   - Создайте аккаунт Voximplant
   - Создайте приложение с ElevenLabs агентом
   - Скопируйте сгенерированный код в Voximplant Platform

2. **Совершите тестовый звонок:**
   - Позвоните на номер, привязанный к приложению
   - Проведите разговор с AI агентом
   - Завершите звонок

3. **Синхронизация:**
   - Подождите 1-2 минуты
   - Нажмите "Sync Calls" в Call History
   - Проверьте, что звонок появился в таблице

4. **Получение данных:**
   - Нажмите "Sync Transcripts & Audio"
   - Проверьте, что транскрипт и аудио доступны

5. **Проверка:**
   - Проиграйте аудиозапись
   - Прочитайте транскрипт
   - Проверьте статистику

---

## Troubleshooting

### Проблема: "Database not available"
**Решение:**
```bash
# Проверьте подключение к MySQL
mysql -u root -p -e "SHOW DATABASES;"

# Проверьте DATABASE_URL в .env
cat .env | grep DATABASE_URL
```

### Проблема: "ELEVENLABS_API_KEY is not set"
**Решение:**
```bash
# Добавьте в .env
echo "ELEVENLABS_API_KEY=your_key_here" >> .env

# Перезапустите сервер
pnpm dev
```

### Проблема: "Failed to sync audio"
**Решение:**
- Проверьте, что у звонка есть `conversationId`
- Проверьте, что ElevenLabs API ключ правильный
- Проверьте права на запись в директорию `recordings/`

### Проблема: Audio player не работает
**Решение:**
```bash
# Проверьте, что файл существует
ls -la recordings/

# Проверьте права доступа
chmod 644 recordings/*.mp3

# Проверьте, что статический сервер настроен
curl -I http://localhost:3000/recordings/your_file.mp3
```

---

## Чеклист тестирования

- [ ] TypeScript компилируется без ошибок
- [ ] Unit тесты проходят
- [ ] Dev сервер запускается
- [ ] Можно создать Voximplant аккаунт
- [ ] Можно создать приложение
- [ ] Синхронизация звонков работает
- [ ] Фильтры работают корректно
- [ ] Поиск работает
- [ ] Синхронизация транскриптов работает
- [ ] Синхронизация аудио работает
- [ ] Audio player проигрывает записи
- [ ] Транскрипты отображаются правильно
- [ ] Статистика рассчитывается корректно
- [ ] Файлы сохраняются в `/recordings`
- [ ] Статический сервер отдает аудиофайлы

---

**Статус:** Готово к тестированию ✅

При обнаружении проблем создайте issue в репозитории с подробным описанием ошибки.
