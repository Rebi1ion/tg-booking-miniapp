#!/bin/bash

# =============================================================================
# IMPORT SERVICES SCRIPT
# Импорт услуг из JSON файла в Mini App
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Usage
if [ $# -lt 2 ]; then
    echo ""
    echo "Usage: $0 <client_name> <json_file> [branch_id]"
    echo ""
    echo "Examples:"
    echo "  $0 beautysalon services.json"
    echo "  $0 beautysalon services.json 843e53df-366a-4ae3-ad4a-a0d5d40db87e"
    echo ""
    echo "JSON format:"
    echo '  {
    "services": [
      {
        "name": "Стрижка женская",
        "description": "Описание",
        "category": "Стрижки",
        "duration_minutes": 60,
        "price": 2500
      }
    ],
    "defaults": {
      "duration_minutes": 30,
      "price": 0,
      "category": "Без категории"
    }
  }'
    echo ""
    exit 1
fi

CLIENT_NAME=$1
JSON_FILE=$2
BRANCH_ID=${3:-}

# Find client directory
CLIENT_DIR="/var/www/clients/$CLIENT_NAME"
if [ ! -d "$CLIENT_DIR" ]; then
    print_error "Client directory not found: $CLIENT_DIR"
    exit 1
fi

# Check JSON file
if [ ! -f "$JSON_FILE" ]; then
    print_error "JSON file not found: $JSON_FILE"
    exit 1
fi

# Get API URL from .env
ENV_FILE="$CLIENT_DIR/server/.env"
if [ ! -f "$ENV_FILE" ]; then
    print_error ".env file not found: $ENV_FILE"
    exit 1
fi

# Extract port from .env
PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
if [ -z "$PORT" ]; then
    PORT=3000
fi

API_URL="http://localhost:$PORT/api"
print_header "Importing Services"
echo "Client: $CLIENT_NAME"
echo "API: $API_URL"
echo "File: $JSON_FILE"
if [ -n "$BRANCH_ID" ]; then
    echo "Branch ID: $BRANCH_ID"
fi

# Read JSON file
JSON_CONTENT=$(cat "$JSON_FILE")

# Add branch_id if provided
if [ -n "$BRANCH_ID" ]; then
    # Check if jq is installed
    if command -v jq &> /dev/null; then
        JSON_CONTENT=$(echo "$JSON_CONTENT" | jq --arg bid "$BRANCH_ID" '. + {branch_id: $bid}')
    else
        print_warning "jq not installed - branch_id will not be added automatically"
        print_warning "Please add branch_id to your JSON file manually"
    fi
fi

# Make API request
print_header "Sending to API..."
RESPONSE=$(curl -s -X POST "$API_URL/import/services" \
    -H "Content-Type: application/json" \
    -d "$JSON_CONTENT")

# Check result
if echo "$RESPONSE" | grep -q '"success":true'; then
    print_success "Import completed!"
    echo ""
    echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Created: {d.get('created', 0)}\nUpdated: {d.get('updated', 0)}\nSkipped: {d.get('skipped', 0)}\")" 2>/dev/null || echo "$RESPONSE"
else
    print_error "Import failed!"
    echo "$RESPONSE"
    exit 1
fi

print_success "Done!"
