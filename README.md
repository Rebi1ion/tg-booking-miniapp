# 💇‍♀️ TMA Booking System — White Label

**Telegram Mini App для онлайн-бронирования в сфере красоты**

Готовое решение для барбершопов, салонов красоты, СПА и nail-студий. Клиенты записываются через Telegram, администраторы управляют записями.

---

## 🚀 Особенности

- 📱 Адаптивный дизайн для мобильных
- 📅 Мастер бронирования: Филиал → Услуга → Мастер → Дата/Время
- 👨‍💼 Админ-панель: расписание, записи, услуги, мастера
- 💳 Интеграция с Telegram Payments (YooKassa)
- 🔔 Автоматические напоминания клиентам
- 🏢 Поддержка нескольких филиалов
- 🎨 **White-Label**: настройка через один файл

---

## 📋 Требования

| Компонент | Требование |
|-----------|------------|
| Node.js | **20+** (обязательно) |
| ОС сервера | Ubuntu 20.04+ / Debian 11+ |
| Telegram Бот | Создать через [@BotFather](https://t.me/BotFather) |

---

## ⚡ Быстрый старт (5 минут)

### 1. Клонировать проект

```bash
cd /var/www
git clone https://github.com/YOUR_REPO/tg-miniapp.git
cd tg-miniapp
```

### 2. Установить зависимости

```bash
# Frontend
npm install

# Backend
cd server
npm install
npx prisma generate
npx prisma db push
cd ..
```

### 3. Настроить переменные окружения

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Отредактируйте `server/.env`:
```env
TELEGRAM_BOT_TOKEN="ваш_токен_бота"
ADMIN_IDS="ваш_telegram_id"
MINIAPP_URL="https://miniapp.yourdomain.com:9443"
```

### 4. Настроить бизнес

Отредактируйте `src/config/shopConfig.ts` (см. раздел White-Label ниже).

### 5. Собрать и запустить

```bash
npm run build
cd server
pm2 start ecosystem.config.cjs --only miniapp-backend
pm2 save
```

---

## 🖥 Деплой на VPS

### Установка зависимостей на сервере

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2, Nginx, Certbot
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Настройка Nginx

Создайте `/etc/nginx/sites-available/miniapp`:

```nginx
# Frontend (порт 9443 — если 443 занят VPN)
server {
    listen 9443 ssl;
    server_name miniapp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/miniapp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/miniapp.yourdomain.com/privkey.pem;

    root /var/www/tg-miniapp/dist;
    index index.html;

    location / {
        try_files $uri /index.html =404;
    }
}

# Backend API (порт 9444)
server {
    listen 9444 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/miniapp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/miniapp.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/miniapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL сертификат

```bash
sudo certbot --nginx -d miniapp.yourdomain.com -d api.yourdomain.com
```

> **Примечание**: Если порты 80/443 заняты (например, VPN панелью), используйте альтернативные порты 9443/9444.

---

## ⚙️ White-Label: Настройка для бизнеса

Для настройки под новый бизнес нужно отредактировать **2 файла**:

### 1. Frontend: `src/config/shopConfig.ts`

```typescript
export const shopConfig: ShopConfig = {
  // === ОСНОВНЫЕ ДАННЫЕ ===
  appName: "Студия красоты Элита",        // Название
  businessType: "beauty_salon",            // barbershop | beauty_salon | spa | nail_studio
  description: "Премиальные услуги",       // Описание
  currency: "RUB",                         // Валюта

  // === АДМИНИСТРАТОРЫ ===
  // Telegram ID (узнать через @userinfobot)
  adminIds: [123456789, 987654321],

  // === КОНТАКТЫ ===
  contacts: {
    phone: "+7 (999) 123-45-67",
    address: "г. Москва, ул. Примерная, 1",
    telegramChannel: "@yoursalon",
  },

  // === ОПЛАТА ===
  payment: {
    enabled: true,
    providerToken: "381764678:TEST:...",   // Токен из BotFather
    requirePrepayment: false,
  },

  // === БРЕНДИНГ ===
  branding: {
    primaryColor: "#007AFF",               // Основной цвет
    logoUrl: "/logo.png",                  // Логотип
    welcomeMessage: "Добро пожаловать!",
  },

  // === API URL (ВАЖНО!) ===
  apiUrl: "https://api.yourdomain.com:9444/api",

  // === РАСПИСАНИЕ ПО УМОЛЧАНИЮ ===
  bookingDefaults: {
    startHour: 10,
    endHour: 20,
    intervalMinutes: 30,
  },
};
```

### 2. Backend: `server/.env`

```env
# Telegram бот
TELEGRAM_BOT_TOKEN="токен_от_botfather"

# Администраторы (через запятую)
ADMIN_IDS="123456789,987654321"

# URL MiniApp (для кнопок в боте)
MINIAPP_URL="https://miniapp.yourdomain.com:9443"

# Платежи YooKassa (опционально)
YOOKASSA_SHOP_ID="your_shop_id"
YOOKASSA_SECRET_KEY="your_secret_key"
PAYMENT_PROVIDER_TOKEN="your_payment_token"
```

### 3. Применить изменения

```bash
npm run build
pm2 restart all
```

---

## 🔄 Обновление на сервере

```bash
cd /var/www/tg-miniapp
git pull
npm install
npm run build
cd server && npm install && cd ..
pm2 restart all
```

---

## 📊 Мониторинг

```bash
pm2 status           # Статус процессов
pm2 logs             # Логи в реальном времени
pm2 logs --lines 100 # Последние 100 строк
pm2 monit            # Мониторинг CPU/RAM
```

---

## 🆘 Решение проблем

| Проблема | Решение |
|----------|---------|
| Белый экран | Проверьте консоль браузера (F12), возможно неправильный `apiUrl` |
| Нет доступа к админке | Добавьте свой Telegram ID в `adminIds` и `ADMIN_IDS` |
| Услуги не отображаются | Проверьте что услуги привязаны к филиалам в админке |
| 500 ошибка на сервере | Проверьте `pm2 logs` и путь в nginx (`root`) |
| Конфликт с VPN (3x-ui) | Используйте порты 9443/9444 вместо 80/443 |
| `EBADENGINE` при npm install | Обновите Node.js до версии 20+ |

---

## 📁 Структура проекта

```
tg-miniapp/
├── src/
│   ├── config/
│   │   └── shopConfig.ts      # ⭐ Главный конфиг
│   ├── components/
│   └── store/
├── server/
│   ├── .env                   # ⭐ Переменные сервера
│   ├── prisma/
│   │   └── dev.db             # SQLite база данных
│   └── src/
├── dist/                      # Собранный frontend
├── ecosystem.config.cjs       # PM2 конфигурация
└── nginx.conf.example         # Пример Nginx конфига
```

---

## 🛡️ Защита от спама и DDoS

### Встроенные механизмы защиты:

| Защита | Описание | Настройка |
|--------|----------|-----------|
| **Лимит записей** | Макс. pending записей на пользователя | `MAX_PENDING_BOOKINGS_PER_USER` |
| **Авто-отмена** | Отмена неоплаченных через N минут | `AUTO_CANCEL_UNPAID_MINUTES` |
| **Rate Limiting API** | Лимит запросов/мин на IP | `RATE_LIMIT_REQUESTS_PER_MINUTE` |
| **Обязательная оплата** | Нельзя забронировать без оплаты | `requirePrepayment: true` |

### Настройка в `server/.env`:

```env
MAX_PENDING_BOOKINGS_PER_USER=3
AUTO_CANCEL_UNPAID_MINUTES=30
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

### Nginx Rate Limiting (опционально):

Добавьте в `/etc/nginx/nginx.conf` внутри `http {}`:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
```

---

## 🚀 Чеклист для нового бизнеса

- [ ] Создать Telegram бота через [@BotFather](https://t.me/BotFather)
- [ ] Получить токен бота
- [ ] Узнать свой Telegram ID через [@userinfobot](https://t.me/userinfobot)
- [ ] Настроить домен/поддомен
- [ ] Отредактировать `src/config/shopConfig.ts`
- [ ] Отредактировать `server/.env`
- [ ] Собрать и запустить (`npm run build`, `pm2 restart all`)
- [ ] Настроить Menu Button в BotFather
- [ ] Добавить услуги и мастеров через админку
- [ ] Протестировать запись

---

👨‍💻 **Разработано для бизнеса в сфере красоты**

