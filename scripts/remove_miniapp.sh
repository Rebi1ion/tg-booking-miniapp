#!/bin/bash
# ============================================================================
# УДАЛЕНИЕ MINI APP
# Удаляет БД, конфиг Nginx, PM2 процесс и файлы
# ============================================================================
# Использование: sudo bash remove_miniapp.sh CLIENT_NAME
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

if [ "$EUID" -ne 0 ]; then
    print_error "Запустите с sudo: sudo bash remove_miniapp.sh CLIENT_NAME"
    exit 1
fi

CLIENT_NAME=$1
if [ -z "$CLIENT_NAME" ]; then
    print_error "Укажите имя клиента: sudo bash remove_miniapp.sh CLIENT_NAME"
    echo ""
    echo "Доступные клиенты:"
    ls /var/www/clients/ 2>/dev/null || echo "  (нет)"
    exit 1
fi

DEPLOY_DIR="/var/www/clients/$CLIENT_NAME"
DB_NAME="miniapp_${CLIENT_NAME}"
DB_USER="miniapp_${CLIENT_NAME}"
PM2_NAME="miniapp-$CLIENT_NAME"

print_header "УДАЛЕНИЕ MINI APP: $CLIENT_NAME"

echo -e "${RED}ВНИМАНИЕ! Будут удалены:${NC}"
echo "  • PM2 процесс: $PM2_NAME"
echo "  • PostgreSQL БД: $DB_NAME"
echo "  • Nginx конфиг: /etc/nginx/sites-available/$CLIENT_NAME"
echo "  • Директория: $DEPLOY_DIR"
echo ""

read -p "Вы уверены? Введите имя клиента для подтверждения: " CONFIRM
if [ "$CONFIRM" != "$CLIENT_NAME" ]; then
    print_warning "Отменено"
    exit 0
fi

# 1. Остановка PM2
print_header "1. Остановка PM2"
pm2 delete "$PM2_NAME" 2>/dev/null && print_success "PM2 процесс остановлен" || print_warning "PM2 процесс не найден"
pm2 save

# 2. Удаление PostgreSQL
print_header "2. Удаление PostgreSQL базы"
sudo -u postgres psql << EOF 2>/dev/null
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
EOF
print_success "База данных удалена"

# 3. Удаление Nginx
print_header "3. Удаление Nginx конфига"
rm -f "/etc/nginx/sites-enabled/$CLIENT_NAME"
rm -f "/etc/nginx/sites-available/$CLIENT_NAME"
nginx -t && systemctl reload nginx
print_success "Nginx конфиг удален"

# 4. Удаление Cron задачи
print_header "4. Удаление Cron задачи бекапа"
if crontab -l 2>/dev/null | grep -q "$CLIENT_NAME"; then
    crontab -l 2>/dev/null | grep -v "$CLIENT_NAME" | crontab -
    print_success "Cron задача удалена"
else
    print_warning "Cron задача не найдена"
fi

# 5. Удаление файлов
print_header "5. Удаление файлов"
rm -rf "$DEPLOY_DIR"
print_success "Директория удалена"

print_header "УДАЛЕНИЕ ЗАВЕРШЕНО!"
echo -e "${GREEN}Mini App $CLIENT_NAME полностью удален${NC}"
