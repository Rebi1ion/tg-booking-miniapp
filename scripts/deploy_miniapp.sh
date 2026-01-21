#!/bin/bash
# ============================================================================
# ДЕПЛОЙ НОВОГО MINI APP
# Создает PostgreSQL БД, настраивает Nginx, запускает через PM2
# ============================================================================
# Использование: sudo bash deploy_miniapp.sh
# ============================================================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    print_error "Запустите с sudo: sudo bash deploy_miniapp.sh"
    exit 1
fi

print_header "ДЕПЛОЙ НОВОГО MINI APP"

# ============================================================================
# СБОР ИНФОРМАЦИИ
# ============================================================================

# Имя клиента (используется везде)
read -p "Введите имя клиента (латиницей, например: topstyle): " CLIENT_NAME
if [ -z "$CLIENT_NAME" ]; then
    print_error "Имя клиента обязательно!"
    exit 1
fi

# Приводим к нижнему регистру и убираем спецсимволы
CLIENT_NAME=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_')
print_info "Нормализованное имя: $CLIENT_NAME"

# Домены
read -p "Домен для фронтенда (например: miniapp.topstyle.com): " FRONTEND_DOMAIN
read -p "Домен для API (например: api.topstyle.com): " API_DOMAIN

if [ -z "$FRONTEND_DOMAIN" ] || [ -z "$API_DOMAIN" ]; then
    print_error "Домены обязательны!"
    exit 1
fi

# Порт для бекенда (автовыбор свободного)
DEFAULT_PORT=3000
while netstat -tuln | grep -q ":$DEFAULT_PORT "; do
    DEFAULT_PORT=$((DEFAULT_PORT + 1))
done
read -p "Порт для бекенда [$DEFAULT_PORT]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_PORT}

# Telegram Bot Token
read -p "Telegram Bot Token: " BOT_TOKEN
if [ -z "$BOT_TOKEN" ]; then
    print_warning "Bot Token не указан, бот не будет работать"
fi

# Admin IDs
read -p "Admin Telegram IDs (через запятую): " ADMIN_IDS

# Путь к исходникам
read -p "Путь к папке с проектом (где вы клонировали репозиторий): " SOURCE_PATH
if [ ! -d "$SOURCE_PATH" ]; then
    print_error "Папка $SOURCE_PATH не найдена!"
    exit 1
fi

# ============================================================================
# ПЕРЕМЕННЫЕ
# ============================================================================

DEPLOY_DIR="/var/www/clients/$CLIENT_NAME"
DB_NAME="miniapp_${CLIENT_NAME}"
DB_USER="miniapp_${CLIENT_NAME}"
DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)

# Читаем часовой пояс из серверного конфига или используем по умолчанию
SERVER_CONFIG="/etc/miniapps/config"
if [ -f "$SERVER_CONFIG" ]; then
    source "$SERVER_CONFIG"
    print_info "Часовой пояс из конфига: $TIMEZONE"
else
    TIMEZONE="Europe/Moscow"
    print_warning "Конфиг $SERVER_CONFIG не найден, используем: $TIMEZONE"
fi

echo ""
print_header "ПОДТВЕРЖДЕНИЕ"
echo "Клиент:           $CLIENT_NAME"
echo "Директория:       $DEPLOY_DIR"
echo "Фронтенд:         https://$FRONTEND_DOMAIN"
echo "API:              https://$API_DOMAIN"
echo "Порт бекенда:     $BACKEND_PORT"
echo "БД PostgreSQL:    $DB_NAME"
echo "Пользователь БД:  $DB_USER"
echo "Часовой пояс:     $TIMEZONE"
echo ""

read -p "Продолжить? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    print_warning "Отменено"
    exit 0
fi

# ============================================================================
# 1. СОЗДАНИЕ POSTGRESQL БД
# ============================================================================
print_header "1. Создание PostgreSQL базы данных"

# Создаем пользователя и БД
sudo -u postgres psql << EOF
-- Удаляем если существует (для повторного деплоя)
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- Создаем пользователя
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Создаем базу данных
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Права
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

print_success "База данных $DB_NAME создана"
print_info "Пользователь: $DB_USER"
print_info "Пароль: $DB_PASSWORD"

# ============================================================================
# 2. КОПИРОВАНИЕ ПРОЕКТА
# ============================================================================
print_header "2. Копирование проекта"

# Создаем директорию
mkdir -p "$DEPLOY_DIR"

# Копируем исходники
cp -r "$SOURCE_PATH"/* "$DEPLOY_DIR/"

# Удаляем лишнее
rm -rf "$DEPLOY_DIR/node_modules" "$DEPLOY_DIR/server/node_modules" "$DEPLOY_DIR/.git"

print_success "Проект скопирован в $DEPLOY_DIR"

# ============================================================================
# 3. НАСТРОЙКА BACKEND
# ============================================================================
print_header "3. Настройка Backend"

cd "$DEPLOY_DIR/server"

# Создаем .env файл
cat > .env << EOF
# ===== DATABASE =====
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# ===== SERVER =====
PORT=$BACKEND_PORT
NODE_ENV=production
TIMEZONE=$TIMEZONE

# ===== TELEGRAM BOT =====
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
MINIAPP_URL=https://$FRONTEND_DOMAIN
ADMIN_IDS=$ADMIN_IDS

# ===== RATE LIMITING =====
RATE_LIMIT_REQUESTS_PER_MINUTE=60
EOF

print_success "Файл .env создан"

# Обновляем schema.prisma на PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# Устанавливаем зависимости
npm install

# Генерируем Prisma клиент и применяем миграции
npx prisma generate
npx prisma db push

print_success "База данных инициализирована"

# ============================================================================
# 4. НАСТРОЙКА FRONTEND
# ============================================================================
print_header "4. Сборка Frontend"

cd "$DEPLOY_DIR"

# Создаем .env для фронтенда
cat > .env << EOF
VITE_API_URL=https://$API_DOMAIN
EOF

# Устанавливаем зависимости и собираем
npm install
npm run build

print_success "Frontend собран (dist/)"

# ============================================================================
# 5. НАСТРОЙКА PM2
# ============================================================================
print_header "5. Настройка PM2"

cd "$DEPLOY_DIR"

# Создаем оптимизированный ecosystem.config.cjs
cat > ecosystem.config.cjs << EOF
module.exports = {
    apps: [
        {
            name: 'miniapp-$CLIENT_NAME',
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
            
            // Автоперезапуск
            autorestart: true,
            max_restarts: 10,
            restart_delay: 4000,
            
            // Graceful shutdown
            kill_timeout: 5000,
            
            // Логи
            log_file: './logs/backend.log',
            out_file: './logs/backend-out.log',
            error_file: './logs/backend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
        },
    ],
};
EOF

# Создаем папку для логов
mkdir -p logs

# Запускаем через PM2
pm2 start ecosystem.config.cjs
pm2 save

print_success "PM2 запущен: miniapp-$CLIENT_NAME"

# ============================================================================
# 6. НАСТРОЙКА NGINX
# ============================================================================
print_header "6. Настройка Nginx"

# Создаем конфиг
cat > "/etc/nginx/sites-available/$CLIENT_NAME" << EOF
# ============================================
# Mini App: $CLIENT_NAME
# Created: $(date)
# ============================================

# Frontend
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;

    root $DEPLOY_DIR/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static cache
    location ~* \.(js|css|png|jpg|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}

# Backend API
server {
    listen 80;
    server_name $API_DOMAIN;

    # Rate limiting
    limit_req zone=api_limit burst=20 nodelay;
    limit_conn conn_limit 10;

    location / {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check (no rate limit)
    location /health {
        limit_req off;
        limit_conn off;
        proxy_pass http://127.0.0.1:$BACKEND_PORT/health;
    }
}
EOF

# Активируем конфиг
ln -sf "/etc/nginx/sites-available/$CLIENT_NAME" "/etc/nginx/sites-enabled/"

# Проверяем и перезагружаем
nginx -t && systemctl reload nginx

print_success "Nginx настроен для $CLIENT_NAME"

# ============================================================================
# 7. SSL СЕРТИФИКАТ
# ============================================================================
print_header "7. SSL сертификат"

echo "Получаем SSL сертификат через Let's Encrypt..."
certbot --nginx -d "$FRONTEND_DOMAIN" -d "$API_DOMAIN" --non-interactive --agree-tos --email "admin@$FRONTEND_DOMAIN" || {
    print_warning "SSL не удалось получить автоматически"
    print_info "Попробуйте вручную: sudo certbot --nginx -d $FRONTEND_DOMAIN -d $API_DOMAIN"
}

# ============================================================================
# 8. ПРАВА НА ФАЙЛЫ
# ============================================================================
print_header "8. Настройка прав доступа"

chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"
chmod +x "$DEPLOY_DIR/server/scripts/backup.sh"

print_success "Права установлены"

# ============================================================================
# 9. НАСТРОЙКА CRON (БЕКАП + ПЕРЕЗАПУСК PM2)
# ============================================================================
print_header "9. Настройка автоматического бекапа"

# Создаем папку для бекапов
mkdir -p "$DEPLOY_DIR/backups"

# Добавляем cron задачу (ежедневно в 3:00)
CRON_JOB="0 3 * * * $DEPLOY_DIR/server/scripts/backup.sh $CLIENT_NAME >> /var/log/miniapp-backups.log 2>&1"

# Проверяем, есть ли уже такая задача для этого клиента
if crontab -l 2>/dev/null | grep -F "$DEPLOY_DIR/server/scripts/backup.sh $CLIENT_NAME" >/dev/null; then
    print_warning "Cron задача для $CLIENT_NAME уже существует"
else
    # Добавляем задачу
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    if [ $? -eq 0 ]; then
        print_success "Cron задача добавлена: ежедневный бекап в 03:00"
    else
        print_error "Ошибка при добавлении cron задачи"
    fi
fi

# Показываем текущие cron задачи
print_info "Текущие cron задачи:"
crontab -l 2>/dev/null | grep "backup.sh" || echo "  (нет задач backup)"

# ============================================================================
# ГОТОВО!
# ============================================================================
print_header "ДЕПЛОЙ ЗАВЕРШЕН!"

echo -e "${GREEN}Mini App успешно развернут!${NC}"
echo ""
echo "📱 Frontend: https://$FRONTEND_DOMAIN"
echo "🔧 API:      https://$API_DOMAIN"
echo "📂 Путь:     $DEPLOY_DIR"
echo ""
echo "📊 PostgreSQL:"
echo "   База:     $DB_NAME"
echo "   Логин:    $DB_USER"
echo "   Пароль:   $DB_PASSWORD"
echo ""
echo "🔧 Команды PM2:"
echo "   pm2 status"
echo "   pm2 logs miniapp-$CLIENT_NAME"
echo "   pm2 restart miniapp-$CLIENT_NAME"
echo ""
echo "💾 Бекапы:"
echo "   Расписание: ежедневно в 03:00"
echo "   Папка:      $DEPLOY_DIR/backups/"
echo "   Ручной:     bash $DEPLOY_DIR/server/scripts/backup.sh $CLIENT_NAME"
echo ""
echo -e "${YELLOW}⚠ ВАЖНО: Сохраните пароль от базы данных!${NC}"

# Сохраняем креды в файл
cat > "$DEPLOY_DIR/CREDENTIALS.txt" << EOF
============================================
CREDENTIALS FOR: $CLIENT_NAME
Created: $(date)
============================================

Frontend URL: https://$FRONTEND_DOMAIN
API URL:      https://$API_DOMAIN

PostgreSQL Database:
  Host:     localhost
  Port:     5432
  Database: $DB_NAME
  User:     $DB_USER
  Password: $DB_PASSWORD
  
Connection URL:
  postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

PM2 Process:
  Name: miniapp-$CLIENT_NAME
  Port: $BACKEND_PORT

Timezone: $TIMEZONE

Backup:
  Schedule: Daily at 03:00 ($TIMEZONE)
  Script:   $DEPLOY_DIR/server/scripts/backup.sh
  Folder:   $DEPLOY_DIR/backups/

Bot Token: $BOT_TOKEN
Admin IDs: $ADMIN_IDS
============================================
EOF

chmod 600 "$DEPLOY_DIR/CREDENTIALS.txt"
print_info "Креды сохранены в $DEPLOY_DIR/CREDENTIALS.txt"
