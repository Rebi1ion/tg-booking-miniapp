# ⚡ Быстрый деплой MiniApp для нового бизнеса

Это **оперативная инструкция** для развертывания Telegram MiniApp для нового клиента за **15-30 минут**.

---

## 🤖 АВТОМАТИЧЕСКИЙ ДЕПЛОЙ (рекомендуется)

Для автоматизации всего процесса используйте скрипты из папки `scripts/`:

```bash
# 1. Первоначальная настройка сервера (один раз)
sudo bash scripts/setup_server.sh

# 2. Деплой нового Mini App
sudo bash scripts/deploy_miniapp.sh
```

Скрипты автоматически:
- ✅ Создадут PostgreSQL базу данных
- ✅ Настроят PM2 с лимитами памяти
- ✅ Создадут конфиг Nginx
- ✅ Получат SSL сертификат
- ✅ Запустят приложение

> **Подробнее:** См. [scripts/README.md](scripts/README.md)

---

## 📋 Чек-лист до начала работы

Перед началом получите от клиента:

| Данные | Пример | Где использовать |
|--------|--------|-----------------|
| Название бизнеса | "Барбершоп TopStyle" | `shopConfig.ts` |
| Telegram ID админа | 123456789 | `shopConfig.ts` + `server/.env` |
| Часовой пояс | Europe/Moscow | `shopConfig.ts` + `server/.env` |
| Домен | miniapp.topstyle.com | DNS + Nginx |

---

## 🚀 Этап 1: Подготовка сервера (10 мин)

### 1.1. Подключиться к серверу

```bash
ssh root@IP_СЕРВЕРА
```

### 1.2. Первоначальная настройка (ОДИН РАЗ)

> **Если сервер новый**, выполните настройку:

```bash
# Скачать проект
git clone https://github.com/YOUR_REPO/tg-miniapp.git /opt/miniapps-template
cd /opt/miniapps-template/scripts

# Запустить настройку сервера
sudo bash setup_server.sh
```

Скрипт установит:
- Node.js 20 LTS
- PM2
- PostgreSQL
- Nginx
- Certbot
- Swap 2GB

---

## 🤖 Этап 2: Создание Telegram бота (3 мин)

1. Написать [@BotFather](https://t.me/BotFather) в Telegram
2. Отправить `/newbot`
3. Ввести имя бота (отображаемое): `Барбершоп TopStyle`
4. Ввести username бота: `topstyle_booking_bot`
5. **Сохранить токен**: `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Настроить Menu Button (после деплоя)

```
/mybots → @topstyle_booking_bot → Bot Settings → Menu Button → Configure
```
- URL: `https://miniapp.topstyle.com` (ваш домен)
- Title: `📅 Записаться`

> **Бесплатные поддомены:** https://freedns.afraid.org

---

## ⚙️ Этап 3: Деплой нового клиента (5 мин)

### Вариант A: Автоматический (рекомендуется)

```bash
cd /opt/miniapps-template/scripts
sudo bash deploy_miniapp.sh
```

Следуйте интерактивным подсказкам. Скрипт всё сделает автоматически!

### Вариант B: Ручной

#### 3.1. Создать директорию и скопировать проект

```bash
mkdir -p /var/www/clients/topstyle
cp -r /opt/miniapps-template/* /var/www/clients/topstyle/
cd /var/www/clients/topstyle
rm -rf .git node_modules server/node_modules
```

#### 3.2. Создать PostgreSQL базу данных

```bash
# Генерируем пароль
DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
echo "Password: $DB_PASSWORD"

# Создаем БД
sudo -u postgres psql << EOF
CREATE USER miniapp_topstyle WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE miniapp_topstyle OWNER miniapp_topstyle;
GRANT ALL PRIVILEGES ON DATABASE miniapp_topstyle TO miniapp_topstyle;
EOF
```

#### 3.3. Настроить Backend

```bash
cd server
cp .env.example .env
nano .env
```

**Заполнить:**

```env
PORT=3000

# DATABASE (PostgreSQL)
DATABASE_URL="postgresql://miniapp_topstyle:ПАРОЛЬ@localhost:5432/miniapp_topstyle"

TIMEZONE="Europe/Moscow"

# Telegram Bot
TELEGRAM_BOT_TOKEN="7123456789:AAHxxxxxxxxxxxxxxxxx"

# URLs
FRONTEND_URL="https://miniapp.topstyle.com"
MINIAPP_URL="https://miniapp.topstyle.com"

# Админы
ADMIN_IDS="123456789"

# Платежи (опционально)
YOOKASSA_SHOP_ID=""
YOOKASSA_SECRET_KEY=""
PAYMENT_PROVIDER_TOKEN=""

# Защита
MAX_PENDING_BOOKINGS_PER_USER=3
AUTO_CANCEL_UNPAID_MINUTES=30
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

#### 3.4. Frontend конфиг

```bash
cd ..
nano src/config/shopConfig.ts
```

**Изменить:**

```typescript
export const shopConfig: ShopConfig = {
  appName: "Барбершоп TopStyle",
  description: "Стильные стрижки для мужчин",
  timezone: "Europe/Moscow",
  adminIds: [123456789],
  apiUrl: "https://api.topstyle.com/api",
  // ...
};
```

---

## 📦 Этап 4: Установка и сборка (3 мин)

```bash
# Frontend
npm install

# Backend
cd server
npm install
npx prisma generate
npx prisma db push
cd ..

# Сборка
npm run build
```

---

## 🌐 Этап 5: Настройка Nginx (5 мин)

### 5.1. Создать конфиг

```bash
sudo nano /etc/nginx/sites-available/topstyle
```

**Вставить (заменить домены):**

```nginx
# Frontend
server {
    listen 80;
    server_name miniapp.topstyle.com;

    root /var/www/clients/topstyle/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 80;
    server_name api.topstyle.com;

    # Rate limiting (защита от DDoS)
    limit_req zone=api_limit burst=20 nodelay;
    limit_conn conn_limit 10;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        limit_req off;
        proxy_pass http://127.0.0.1:3000/health;
    }
}
```

### 5.2. Активировать и проверить

```bash
sudo ln -s /etc/nginx/sites-available/topstyle /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.3. SSL сертификат

```bash
sudo certbot --nginx -d miniapp.topstyle.com -d api.topstyle.com
```

---

## 🚀 Этап 6: Запуск (2 мин)

### 6.1. Обновить ecosystem.config.cjs

```bash
nano ecosystem.config.cjs
```

**Изменить на:**

```javascript
module.exports = {
    apps: [{
        name: 'miniapp-topstyle',  // Уникальное имя!
        cwd: './server',
        script: 'npx',
        args: 'ts-node src/index.ts',
        interpreter: 'none',
        
        // Лимиты памяти
        max_memory_restart: '300M',
        
        env: {
            NODE_ENV: 'production',
            NODE_OPTIONS: '--max-old-space-size=256',
        },
        
        autorestart: true,
        max_restarts: 10,
        restart_delay: 4000,
        
        log_file: './logs/backend.log',
        error_file: './logs/backend-error.log',
    }],
};
```

### 6.2. Создать папку логов и запустить

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
```

### 6.3. Проверить статус

```bash
pm2 status
pm2 logs miniapp-topstyle
```

---

## ✅ Этап 7: Финальная проверка (2 мин)

### Чек-лист проверки

- [ ] **Frontend**: Открыть `https://miniapp.topstyle.com` — должна загрузиться страница
- [ ] **API**: Открыть `https://api.topstyle.com/api/branches` — должен вернуться JSON
- [ ] **Бот**: Написать боту `/start` — должно прийти приветствие
- [ ] **Админка**: Открыть MiniApp от имени админа — должна появиться вкладка "Админ"
- [ ] **Menu Button**: Проверить кнопку "📅 Записаться" в боте

---

## 📊 После запуска: Первичная настройка админом

Клиенту нужно через админ-панель:

1. **Добавить филиалы** (Админ → Филиалы → Добавить)
2. **Добавить услуги** (Админ → Услуги → Добавить)
3. **Добавить мастеров** (Админ → Мастера → Добавить)
4. **Привязать услуги к филиалам**
5. **Привязать мастеров к услугам**

---

## 🔄 Быстрые команды обновления

```bash
# Обновить код
cd /var/www/clients/CLIENT_NAME
git pull

# Пересобрать
npm install
npm run build
cd server && npm install && npx prisma generate && cd ..

# Перезапустить
pm2 restart miniapp-CLIENT_NAME
```

---

## 🗄️ Команды PostgreSQL

```bash
# Подключиться к БД
sudo -u postgres psql -d miniapp_topstyle

# Список всех баз
sudo -u postgres psql -c "\l" | grep miniapp

# Бекап
pg_dump -U postgres miniapp_topstyle > backup_$(date +%Y%m%d).sql

# Восстановление
psql -U postgres miniapp_topstyle < backup.sql
```

---

## 🆘 Типичные проблемы

| Проблема | Решение |
|----------|---------|
| Белый экран | Проверить `apiUrl` в `shopConfig.ts` |
| 502 Bad Gateway | Проверить `pm2 status`, перезапустить если нужно |
| Нет доступа к админке | Проверить `adminIds` в обоих файлах конфига |
| Бот не отвечает | Проверить `TELEGRAM_BOT_TOKEN` в `server/.env` |
| CORS ошибка | Проверить `FRONTEND_URL` в `server/.env` |
| Database error | Проверить `DATABASE_URL` и подключение к PostgreSQL |

---

## 📁 Структура файлов для нового клиента

```
/var/www/clients/
└── topstyle/                           # Директория клиента
    ├── src/config/shopConfig.ts        # ⭐ Главный конфиг
    ├── server/.env                     # ⭐ Переменные сервера
    ├── server/prisma/schema.prisma     # Схема БД (PostgreSQL)
    ├── public/logo.png                 # Логотип
    ├── dist/                           # Собранный frontend
    ├── logs/                           # Логи PM2
    └── ecosystem.config.cjs            # PM2 конфиг
```

PostgreSQL базы данных хранятся централизованно:
```
PostgreSQL Server (localhost:5432)
├── miniapp_topstyle        # БД клиента 1
├── miniapp_hairsalon       # БД клиента 2
└── miniapp_beautycenter    # БД клиента 3
```

---

## 🎯 Итого: Минимальное время развертывания

| Этап | Ручной | Автоматический |
|------|--------|----------------|
| Настройка сервера | 15 мин | **5 мин** |
| Создание бота | 3 мин | 3 мин |
| Деплой клиента | 15 мин | **5 мин** |
| Проверка | 2 мин | 2 мин |
| **Итого** | **~35 мин** | **~15 мин** |

---

## 📈 Масштабирование

| RAM | Max Mini Apps | PostgreSQL БД |
|-----|---------------|---------------|
| 2 GB | 5-7 | 5-7 |
| 4 GB | 12-15 | 12-15 |
| 8 GB | 25-30 | 25-30 |

> **Мониторинг:** `pm2 monit` и `bash scripts/status_miniapps.sh`

---

👨‍💻 **Совет**: Используйте автоматические скрипты из папки `scripts/` для ускорения деплоя!
