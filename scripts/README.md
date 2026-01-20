# Скрипты автоматизации деплоя Mini Apps

Этот набор скриптов автоматизирует развертывание Telegram Mini Apps на VPS сервере.

## 📁 Структура

```
scripts/
├── setup_server.sh     # Первоначальная настройка сервера (1 раз)
├── deploy_miniapp.sh   # Деплой нового Mini App
├── remove_miniapp.sh   # Удаление Mini App
└── status_miniapps.sh  # Статус всех Mini Apps
```

---

## 🚀 Быстрый старт

### 1. Первоначальная настройка сервера

Запустите **один раз** на новом VPS:

```bash
# Скачайте проект на сервер
git clone https://github.com/your-repo/miniapps-business.git
cd miniapps-business/scripts

# Запустите настройку сервера
sudo bash setup_server.sh
```

Скрипт спросит у вас часовой пояс и установит:
- ✅ Системный часовой пояс (для cron)
- ✅ Node.js 20 LTS
- ✅ PM2
- ✅ PostgreSQL
- ✅ Nginx
- ✅ Certbot (SSL)
- ✅ Swap 2GB
- ✅ Оптимизации Nginx

> **Важно:** Выбранный часовой пояс сохраняется в `/etc/miniapps/config` и автоматически применяется ко всем Mini Apps при деплое.

### 2. Деплой нового Mini App

```bash
sudo bash deploy_miniapp.sh
```

Скрипт запросит:
- Имя клиента (например: `topstyle`)
- Домен фронтенда (например: `miniapp.topstyle.com`)
- Домен API (например: `api.topstyle.com`)
- Telegram Bot Token
- Admin IDs

И автоматически:
- Создаст PostgreSQL базу данных
- Скопирует и настроит проект
- Настроит PM2 с лимитами памяти
- Создаст Nginx конфиг
- Получит SSL сертификат

### 3. Проверка статуса

```bash
bash status_miniapps.sh
```

Покажет:
- Использование памяти и диска
- Все PM2 процессы
- PostgreSQL базы данных
- Nginx сайты

### 4. Удаление Mini App

```bash
sudo bash remove_miniapp.sh CLIENT_NAME
```

---

## 📊 Ответы на вопросы

### Можно ли использовать PostgreSQL локально?

**Да!** Скрипт `deploy_miniapp.sh` создает отдельную PostgreSQL базу данных для каждого Mini App:

```
miniapp_topstyle     ← БД для клиента topstyle
miniapp_hairsalon    ← БД для клиента hairsalon
miniapp_beautycenter ← БД для клиента beautycenter
```

Все базы хранятся в PostgreSQL на том же сервере. Это **намного эффективнее** чем SQLite:
- Поддержка одновременных записей
- Лучшая производительность при нагрузке
- Встроенные бекапы

### Как создать 2GB swap файл?

Скрипт `setup_server.sh` делает это автоматически. Вручную:

```bash
# Создание swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Автозапуск при перезагрузке
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Оптимизация (реже использовать swap)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Проверка
free -h
```

### Как настроить PM2 с лимитами памяти?

Скрипт `deploy_miniapp.sh` создает оптимизированный `ecosystem.config.cjs`:

```javascript
module.exports = {
    apps: [{
        name: 'miniapp-clientname',
        cwd: './server',
        script: 'npx',
        args: 'ts-node src/index.ts',
        interpreter: 'none',
        
        // ⚡ ЛИМИТЫ ПАМЯТИ
        max_memory_restart: '300M',  // Перезапуск при превышении 300MB
        
        env: {
            NODE_ENV: 'production',
            NODE_OPTIONS: '--max-old-space-size=256',  // Лимит Node.js heap
        },
        
        // Автоперезапуск при крашах
        autorestart: true,
        max_restarts: 10,
        restart_delay: 4000,
        
        // Логи
        log_file: './logs/backend.log',
        error_file: './logs/backend-error.log',
    }],
};
```

---

## 🔧 Полезные команды

### PM2

```bash
# Статус всех процессов
pm2 status

# Логи конкретного процесса
pm2 logs miniapp-topstyle

# Перезапуск
pm2 restart miniapp-topstyle

# Мониторинг в реальном времени
pm2 monit

# Остановка
pm2 stop miniapp-topstyle

# Удаление
pm2 delete miniapp-topstyle
pm2 save
```

### PostgreSQL

```bash
# Подключение к базе
sudo -u postgres psql -d miniapp_topstyle

# Список баз
sudo -u postgres psql -c "\l"

# Бекап базы
pg_dump -U postgres miniapp_topstyle > backup.sql

# Восстановление
psql -U postgres miniapp_topstyle < backup.sql
```

### Nginx

```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка
sudo systemctl reload nginx

# Логи
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### SSL

```bash
# Обновление сертификатов
sudo certbot renew

# Добавление домена
sudo certbot --nginx -d newdomain.com
```

---

## 📈 Рекомендации по масштабированию

| RAM | Max Mini Apps | Примечание |
|-----|---------------|------------|
| 2 GB | 5-7 | Обязательно swap |
| 4 GB | 12-15 | Комфортный режим |
| 8 GB | 25-30 | Можно без swap |

При достижении 80% RAM:
1. Проверьте `pm2 monit` на утечки памяти
2. Увеличьте RAM сервера или
3. Разнесите Mini Apps на несколько серверов
