# ⚡ Быстрый деплой MiniApp для нового бизнеса

Это **оперативная инструкция** для развертывания Telegram MiniApp для нового клиента за **15-30 минут**.

---

## 📋 Чек-лист до начала работы

Перед началом получите от клиента:

| Данные | Пример | Где использовать |
|--------|--------|-----------------|
| Название бизнеса | "Барбершоп TopStyle" | `shopConfig.ts` |
| Telegram ID админа | 123456789 | `shopConfig.ts` + `server/.env` |
| Часовой пояс | Europe/Moscow | `shopConfig.ts` + `server/.env` |

---

## 🚀 Этап 1: Подготовка окружения (5 мин)

### 1.1. Подключиться к серверу

```bash
ssh root@IP_СЕРВЕРА
```

### 1.2. Создать директорию для нового клиента

> **Рекомендация**: Создавайте отдельную папку для каждого клиента

```bash
cd /var/www
mkdir -p clients/НАЗВАНИЕ_КЛИЕНТА
cd clients/НАЗВАНИЕ_КЛИЕНТА
```

### 1.3. Клонировать репозиторий

```bash
git clone https://github.com/YOUR_REPO/tg-miniapp.git .
```

> **Или скопировать с мастер-копии** (если есть чистая копия на сервере):
> ```bash
> cp -r /var/www/tg-miniapp-template/* .
> ```

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
Бесплатные поддомены: https://freedns.afraid.org
- URL: `https://miniapp.topstyle.com` (ваш домен)
- Title: `📅 Записаться`

---

## ⚙️ Этап 3: Конфигурация (5 мин)

### 3.1. Frontend конфиг: `src/config/shopConfig.ts`

Откройте файл и измените значения:

```bash
nano src/config/shopConfig.ts
```

**Минимальные изменения:**

```typescript
export const shopConfig: ShopConfig = {
  // === ОСНОВНОЕ ===
  appName: "Барбershop TopStyle",              // ← Название
  description: "Стильные стрижки для мужчин",   // ← Описание
  timezone: "Europe/Moscow",                    // ← Часовой пояс

  // === АДМИНЫ ===
  adminIds: [123456789],                        // ← Telegram ID клиента

  // === ОПЛАТА ===
  payment: {
    enabled: true,                              // ← Включить/выключить
    requirePrepayment: false,                   // ← Требовать предоплату?
  },

  // === БРЕНДИНГ ===
  branding: {
    welcomeMessage: "Добро пожаловать в TopStyle!",
  },

  // === API (ВАЖНО!) ===
  apiUrl: "https://api.topstyle.com/api",       // ← Домен API

  // === РАСПИСАНИЕ ===
  bookingDefaults: {
    startHour: 10,                              // ← Начало рабочего дня
    endHour: 21,                                // ← Конец рабочего дня
    intervalMinutes: 30,
  },
};
```

### 3.2. Backend конфиг: `server/.env`

```bash
cp server/.env.example server/.env
nano server/.env
```

**Заполнить:**

```env
PORT=3000
DATABASE_URL="file:./dev.db"
TIMEZONE="Europe/Moscow"

# Telegram Bot (ОБЯЗАТЕЛЬНО)
TELEGRAM_BOT_TOKEN="7123456789:AAHxxxxxxxxxxxxxxxxx"

# Frontend URL
FRONTEND_URL="https://miniapp.topstyle.com"

# Админы (через запятую)
ADMIN_IDS="123456789"

# MiniApp URL (для кнопок в боте)
MINIAPP_URL="https://miniapp.topstyle.com"

# Платежи (опционально)
YOOKASSA_SHOP_ID=""
YOOKASSA_SECRET_KEY=""
PAYMENT_PROVIDER_TOKEN=""

# Защита
MAX_PENDING_BOOKINGS_PER_USER=3
AUTO_CANCEL_UNPAID_MINUTES=30
RATE_LIMIT_REQUESTS_PER_MINUTE=60
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
sudo nano /etc/nginx/sites-available/CLIENT_NAME
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

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 5.2. Активировать и проверить

```bash
sudo ln -s /etc/nginx/sites-available/CLIENT_NAME /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.3. SSL сертификат

```bash
sudo certbot --nginx -d miniapp.topstyle.com -d api.topstyle.com
```

---

## 🚀 Этап 6: Запуск (2 мин)

### 6.1. Обновить ecosystem.config.cjs для уникального имени

```bash
nano ecosystem.config.cjs
```

Измените `name` на уникальное:

```javascript
name: 'miniapp-topstyle',  // Уникальное имя для PM2
```

### 6.2. Запустить через PM2

```bash
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
cd server && npm install && cd ..

# Перезапустить
pm2 restart miniapp-CLIENT_NAME
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

---

## 📁 Структура файлов для нового клиента

```
/var/www/clients/
└── topstyle/                           # Директория клиента
    ├── src/config/shopConfig.ts        # ⭐ Главный конфиг
    ├── server/.env                     # ⭐ Переменные сервера
    ├── server/prisma/dev.db            # SQLite база данных
    ├── public/logo.png                 # Логотип
    ├── dist/                           # Собранный frontend
    └── ecosystem.config.cjs            # PM2 конфиг
```

---

## 🎯 Итого: Минимальное время развертывания

| Этап | Время |
|------|-------|
| Подготовка окружения | 5 мин |
| Создание бота | 3 мин |
| Конфигурация | 5 мин |
| Установка и сборка | 3 мин |
| Настройка Nginx + SSL | 5 мин |
| Запуск и проверка | 4 мин |
| **Итого** | **~25 мин** |

---

👨‍💻 **Совет**: Создайте скрипт `setup_new_client.sh` для автоматизации рутинных шагов!
