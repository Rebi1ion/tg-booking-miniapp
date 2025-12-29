# 💇‍♀️ TMA Booking System - White Label

**Готовая система онлайн-бронирования для Telegram Mini Apps (TMA) в сфере красоты**

Это "White-Label" решение для барбершопов, салонов красоты и СПА. Оно включает в себя удобный мастер бронирования для клиентов и административную панель для управления записями.

---

## 🚀 Особенности

- **Дизайн:** Современный UI (Shadcn/UI + Tailwind), адаптирован под мобильные устройства
- **Бронирование:** Выбор услуги → Мастера → Даты/Времени → Оплата
- **Админка:** Просмотр расписания, календарь записей, управление услугами и мастерами
- **Филиалы:** Поддержка нескольких филиалов
- **Оплата:** Интеграция с Telegram Payments (YooKassa)
- **Уведомления:** Автоматические напоминания о записи
- **White-Label:** Все настройки в одном файле

---

## 📋 Требования

- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)
- Telegram Бот ([@BotFather](https://t.me/BotFather))
- Для production: VPS/сервер с Ubuntu 20.04+

---

## 🛠 Локальная Установка

### 1. Клонирование и установка

```bash
git clone <URL_РЕПОЗИТОРИЯ>
cd miniapps-business

# Frontend
npm install

# Backend
cd server
npm install
npx prisma generate
npx prisma db push
cd ..
```

### 2. Настройка переменных окружения

```bash
# Frontend
cp .env.example .env
# Отредактируйте .env

# Backend
cp server/.env.example server/.env
# Отредактируйте server/.env
```

### 3. Запуск

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173)

---

## ⚙️ White-Label Настройка

Отредактируйте **один файл** для настройки под ваш бизнес:

📁 `src/config/shopConfig.ts`

```typescript
export const shopConfig: ShopConfig = {
  // === ОСНОВНЫЕ ===
  appName: "Мой Салон Красоты",      // Название
  businessType: "beauty_salon",       // barbershop | beauty_salon | spa | nail_studio
  description: "Премиальные услуги",  // Описание
  currency: "RUB",                    // Валюта

  // === АДМИНИСТРАТОРЫ ===
  adminIds: [123456789],              // Telegram ID (узнать: @userinfobot)

  // === КОНТАКТЫ ===
  contacts: {
    phone: "+7 (999) 123-45-67",
    address: "г. Москва, ул. Примерная, д. 1",
    telegramChannel: "@yoursalon",
  },

  // === ОПЛАТА ===
  payment: {
    enabled: true,
    providerToken: "381764678:TEST:...", // От BotFather
    requirePrepayment: false,
  },

  // === БРЕНДИНГ ===
  branding: {
    primaryColor: "#007AFF",
    logoUrl: "/logo.png",
    welcomeMessage: "Добро пожаловать!",
  },

  // === API URL ===
  apiUrl: "https://api.yourdomain.com/api",  // Ваш сервер

  // === РАСПИСАНИЕ ПО УМОЛЧАНИЮ ===
  bookingDefaults: {
    startHour: 10,
    endHour: 20,
    intervalMinutes: 30,
  },
};
```

После изменений Backend (`server/.env`):
- `TELEGRAM_BOT_TOKEN` — токен бота
- `ADMIN_IDS` — ID администраторов
- `MINIAPP_URL` — URL MiniApp
- `PAYMENT_PROVIDER_TOKEN` — токен платежей

---

## 🖥 Деплой на VPS (Ubuntu + Nginx)

> **Совместимость с 3x-ui:** Этот MiniApp будет работать на отдельных портах через Nginx, не конфликтуя с VPN панелью.

### 1. Установка зависимостей на сервере

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 и Nginx
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Клонирование проекта

```bash
cd /var/www
git clone <URL_РЕПОЗИТОРИЯ> miniapps-business
cd miniapps-business
```

### 3. Настройка переменных окружения

```bash
cp .env.example .env
nano .env

cd server
cp .env.example .env
nano .env
```

**Важно:** Обновите `apiUrl` в `src/config/shopConfig.ts`:
```typescript
apiUrl: "https://api.yourdomain.com/api"
```

### 4. Сборка

```bash
# Frontend
cd /var/www/miniapps-business
npm install
npm run build

# Backend
cd server
npm install
npx prisma generate
npx prisma db push
```

### 5. Настройка Nginx

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/miniapp
sudo nano /etc/nginx/sites-available/miniapp
# Замените YOUR_DOMAIN на ваш домен

sudo ln -s /etc/nginx/sites-available/miniapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL сертификаты

```bash
sudo certbot --nginx -d miniapp.yourdomain.com -d api.yourdomain.com
```

### 7. Запуск через PM2

```bash
cd /var/www/miniapps-business
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 8. Подключение к Telegram

1. Откройте [@BotFather](https://t.me/BotFather)
2. `/mybots` → выберите бота → **Bot Settings** → **Menu Button** → **Configure Menu Button**
3. Отправьте URL: `https://miniapp.yourdomain.com`

---

## 🔄 Обновление на сервере

```bash
cd /var/www/miniapps-business
git pull
npm install
npm run build
cd server && npm install && cd ..
pm2 restart all
```

---

## ❓ FAQ

**В: Белый экран при открытии**
О: Проверьте переменные окружения и консоль браузера (F12).

**В: Нет доступа к админке**
О: Добавьте ваш Telegram ID в `adminIds` в `shopConfig.ts` и `ADMIN_IDS` в `server/.env`.

**В: Конфликт с 3x-ui**
О: Конфликта не будет — 3x-ui работает на своём порту (2053), MiniApp через Nginx на 80/443.

---

## 📁 Структура проекта

```
miniapps-business/
├── src/                  # Frontend (React + Vite)
│   ├── config/
│   │   └── shopConfig.ts # ⭐ Главный файл настроек
│   ├── components/
│   └── ...
├── server/               # Backend (Express + Prisma)
│   ├── .env              # Переменные окружения сервера
│   ├── prisma/
│   │   └── schema.prisma # Схема БД
│   └── src/
├── .env                  # Переменные окружения frontend
├── ecosystem.config.cjs  # PM2 конфигурация
└── nginx.conf.example    # Пример Nginx конфига
```

---

👨‍💻 **Разработано с любовью для бизнеса.**
