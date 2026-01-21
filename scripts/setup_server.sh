#!/bin/bash
# ============================================================================
# ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА СЕРВЕРА
# Запускать ОДИН РАЗ при первом развертывании на новом VPS
# ============================================================================
# Использование: sudo bash setup_server.sh
# ============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    print_error "Запустите скрипт с sudo: sudo bash setup_server.sh"
    exit 1
fi

print_header "НАСТРОЙКА СЕРВЕРА ДЛЯ MINI APPS"

# ============================================================================
# 1. НАСТРОЙКА ЧАСОВОГО ПОЯСА
# ============================================================================
print_header "1. Настройка часового пояса"

# Конфиг файл для хранения часового пояса (используется при деплое)
CONFIG_DIR="/etc/miniapps"
CONFIG_FILE="$CONFIG_DIR/config"

mkdir -p "$CONFIG_DIR"

echo ""
echo "Выберите часовой пояс:"
echo ""
echo "  Россия:"
echo "    1) Europe/Kaliningrad    (UTC+2)  - Калининград"
echo "    2) Europe/Moscow         (UTC+3)  - Москва, Санкт-Петербург"
echo "    3) Europe/Samara         (UTC+4)  - Самара, Ижевск"
echo "    4) Asia/Yekaterinburg    (UTC+5)  - Екатеринбург, Пермь, Челябинск"
echo "    5) Asia/Omsk             (UTC+6)  - Омск"
echo "    6) Asia/Krasnoyarsk      (UTC+7)  - Красноярск, Новосибирск"
echo "    7) Asia/Irkutsk          (UTC+8)  - Иркутск"
echo "    8) Asia/Yakutsk          (UTC+9)  - Якутск, Чита"
echo "    9) Asia/Vladivostok      (UTC+10) - Владивосток, Хабаровск"
echo "   10) Asia/Magadan          (UTC+11) - Магадан, Сахалин"
echo "   11) Asia/Kamchatka        (UTC+12) - Петропавловск-Камчатский"
echo ""
echo "  Другие:"
echo "   12) Europe/Kiev           (UTC+2)  - Киев"
echo "   13) Europe/Minsk          (UTC+3)  - Минск"
echo "   14) Asia/Almaty           (UTC+6)  - Алматы"
echo "   15) Asia/Tashkent         (UTC+5)  - Ташкент"
echo "   16) Asia/Tbilisi          (UTC+4)  - Тбилиси"
echo "   17) Asia/Baku             (UTC+4)  - Баку"
echo "   18) Asia/Yerevan          (UTC+4)  - Ереван"
echo ""
echo "   0) Ввести вручную"
echo ""

read -p "Выберите номер [2 - Moscow]: " TZ_CHOICE
TZ_CHOICE=${TZ_CHOICE:-2}

case $TZ_CHOICE in
    1)  SELECTED_TZ="Europe/Kaliningrad" ;;
    2)  SELECTED_TZ="Europe/Moscow" ;;
    3)  SELECTED_TZ="Europe/Samara" ;;
    4)  SELECTED_TZ="Asia/Yekaterinburg" ;;
    5)  SELECTED_TZ="Asia/Omsk" ;;
    6)  SELECTED_TZ="Asia/Krasnoyarsk" ;;
    7)  SELECTED_TZ="Asia/Irkutsk" ;;
    8)  SELECTED_TZ="Asia/Yakutsk" ;;
    9)  SELECTED_TZ="Asia/Vladivostok" ;;
    10) SELECTED_TZ="Asia/Magadan" ;;
    11) SELECTED_TZ="Asia/Kamchatka" ;;
    12) SELECTED_TZ="Europe/Kiev" ;;
    13) SELECTED_TZ="Europe/Minsk" ;;
    14) SELECTED_TZ="Asia/Almaty" ;;
    15) SELECTED_TZ="Asia/Tashkent" ;;
    16) SELECTED_TZ="Asia/Tbilisi" ;;
    17) SELECTED_TZ="Asia/Baku" ;;
    18) SELECTED_TZ="Asia/Yerevan" ;;
    0)  
        read -p "Введите часовой пояс (например: Europe/London): " SELECTED_TZ
        # Проверяем существование
        if ! timedatectl list-timezones | grep -qx "$SELECTED_TZ"; then
            print_error "Часовой пояс '$SELECTED_TZ' не найден!"
            print_info "Используем Europe/Moscow по умолчанию"
            SELECTED_TZ="Europe/Moscow"
        fi
        ;;
    *)  SELECTED_TZ="Europe/Moscow" ;;
esac

# Устанавливаем системный часовой пояс
timedatectl set-timezone "$SELECTED_TZ"
print_success "Системный часовой пояс установлен: $SELECTED_TZ"

# Сохраняем в конфиг для использования при деплое
cat > "$CONFIG_FILE" << EOF
# MiniApps Server Configuration
# Created: $(date)

TIMEZONE="$SELECTED_TZ"
EOF

print_success "Конфиг сохранен: $CONFIG_FILE"
echo "  Текущее время: $(date '+%Y-%m-%d %H:%M:%S %Z')"


# ============================================================================
# 2. ОБНОВЛЕНИЕ СИСТЕМЫ
# ============================================================================
print_header "2. Обновление системы"

apt update && apt upgrade -y
print_success "Система обновлена"

# ============================================================================
# 3. УСТАНОВКА НЕОБХОДИМОГО ПО
# ============================================================================
print_header "3. Установка необходимого ПО"

# Node.js 20 LTS
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js $(node -v) установлен"
else
    print_warning "Node.js уже установлен: $(node -v)"
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2 установлен"
else
    print_warning "PM2 уже установлен"
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    print_success "Nginx установлен и запущен"
else
    print_warning "Nginx уже установлен"
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    print_success "PostgreSQL установлен и запущен"
else
    print_warning "PostgreSQL уже установлен"
fi

# Certbot для SSL
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot установлен"
else
    print_warning "Certbot уже установлен"
fi

# Дополнительные утилиты
apt install -y htop git curl
print_success "Утилиты установлены (htop, git, curl)"

# ============================================================================
# 4. СОЗДАНИЕ SWAP ФАЙЛА (2GB)
# ============================================================================
print_header "4. Настройка Swap (2GB)"

if [ -f /swapfile ]; then
    print_warning "Swap файл уже существует"
    swapon --show
else
    # Создаем 2GB swap
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Добавляем в fstab для автозапуска
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    
    # Оптимизируем swappiness
    if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
        echo 'vm.swappiness=10' >> /etc/sysctl.conf
        sysctl -p
    fi
    
    print_success "Swap 2GB создан и активирован"
    swapon --show
fi

# ============================================================================
# 5. ОПТИМИЗАЦИЯ NGINX
# ============================================================================
print_header "5. Оптимизация Nginx"

# Проверяем, включен ли gzip в основном конфиге
GZIP_ENABLED=$(grep -r "^\s*gzip\s\+on" /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf 2>/dev/null | wc -l)

# Создаем оптимизированную конфигурацию
if [ "$GZIP_ENABLED" -gt 0 ]; then
    # gzip уже включен, не дублируем
    cat > /etc/nginx/conf.d/optimization.conf << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Gzip compression (уже включен глобально, настраиваем детали)
gzip_comp_level 5;
gzip_min_length 256;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Proxy buffers
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
EOF
else
    # gzip не включен, включаем
    cat > /etc/nginx/conf.d/optimization.conf << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Gzip compression
gzip on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Proxy buffers
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
EOF
fi

# Проверяем конфигурацию
nginx -t && systemctl reload nginx
print_success "Nginx оптимизирован"

# ============================================================================
# 6. СОЗДАНИЕ СТРУКТУРЫ ДИРЕКТОРИЙ
# ============================================================================
print_header "6. Создание структуры директорий"

mkdir -p /var/www/clients
chown -R www-data:www-data /var/www
chmod -R 755 /var/www

print_success "Директория /var/www/clients создана"

# ============================================================================
# 7. НАСТРОЙКА PM2 АВТОЗАПУСКА
# ============================================================================
print_header "7. Настройка PM2 автозапуска"

pm2 startup systemd -u root --hp /root
print_success "PM2 настроен на автозапуск"

# ============================================================================
# ГОТОВО
# ============================================================================
print_header "СЕРВЕР ГОТОВ К РАБОТЕ!"

echo -e "${GREEN}Установлено:${NC}"
echo "  • Node.js: $(node -v)"
echo "  • npm: $(npm -v)"
echo "  • PM2: $(pm2 -v)"
echo "  • PostgreSQL: $(psql --version | head -n1)"
echo "  • Nginx: $(nginx -v 2>&1)"
echo ""
echo -e "${GREEN}Swap:${NC}"
free -h | grep -i swap
echo ""
echo -e "${YELLOW}Следующий шаг:${NC}"
echo "  Для добавления нового Mini App используйте:"
echo "  sudo bash /path/to/deploy_miniapp.sh"
