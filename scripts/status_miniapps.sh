#!/bin/bash
# ============================================================================
# СТАТУС ВСЕХ MINI APPS
# Показывает информацию о всех развернутых Mini Apps
# ============================================================================
# Использование: bash status_miniapps.sh
# ============================================================================

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}       СТАТУС MINI APPS${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Системные ресурсы
echo -e "${CYAN}📊 СИСТЕМНЫЕ РЕСУРСЫ${NC}"
echo "──────────────────────────────────────────"
echo -e "${YELLOW}Память:${NC}"
free -h | grep -E "Mem|Swap"
echo ""
echo -e "${YELLOW}Диск:${NC}"
df -h / | tail -1
echo ""
echo -e "${YELLOW}CPU Load:${NC}"
uptime
echo ""

# PM2 процессы
echo -e "${CYAN}🔧 PM2 ПРОЦЕССЫ${NC}"
echo "──────────────────────────────────────────"
pm2 list
echo ""

# PostgreSQL базы
echo -e "${CYAN}🗄️ POSTGRESQL БАЗЫ ДАННЫХ${NC}"
echo "──────────────────────────────────────────"
sudo -u postgres psql -c "\l" 2>/dev/null | grep miniapp_ || echo "Нет баз данных miniapp_*"
echo ""

# Nginx сайты
echo -e "${CYAN}🌐 NGINX САЙТЫ${NC}"
echo "──────────────────────────────────────────"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -v default || echo "Нет активных сайтов"
echo ""

# Клиенты
echo -e "${CYAN}📁 РАЗВЕРНУТЫЕ КЛИЕНТЫ${NC}"
echo "──────────────────────────────────────────"
if [ -d "/var/www/clients" ]; then
    for client in /var/www/clients/*/; do
        if [ -d "$client" ]; then
            client_name=$(basename "$client")
            echo -e "${GREEN}• $client_name${NC}"
            echo "  Путь: $client"
            
            # Проверяем PM2
            if pm2 list 2>/dev/null | grep -q "miniapp-$client_name"; then
                echo -e "  PM2: ${GREEN}работает${NC}"
            else
                echo -e "  PM2: ${RED}не найден${NC}"
            fi
            
            # Проверяем Nginx
            if [ -f "/etc/nginx/sites-enabled/$client_name" ]; then
                echo -e "  Nginx: ${GREEN}активен${NC}"
            else
                echo -e "  Nginx: ${RED}не активен${NC}"
            fi
            
            echo ""
        fi
    done
else
    echo "Директория /var/www/clients не найдена"
fi

echo -e "${BLUE}============================================${NC}"
