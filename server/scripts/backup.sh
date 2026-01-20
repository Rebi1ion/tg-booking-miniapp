#!/bin/bash
# =============================================================================
# Database Backup Script (PostgreSQL)
# Runs daily at 03:00, keeps last 7 backups, restarts PM2 after backup
# =============================================================================
# Usage: 
#   Manual: bash backup.sh CLIENT_NAME
#   Cron:   0 3 * * * /var/www/clients/CLIENT_NAME/server/scripts/backup.sh CLIENT_NAME >> /var/log/miniapp-backups.log 2>&1
# =============================================================================

# Get client name from argument or detect from path
CLIENT_NAME=$1
if [ -z "$CLIENT_NAME" ]; then
    # Try to detect from script path
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    CLIENT_NAME=$(echo "$SCRIPT_DIR" | grep -oP 'clients/\K[^/]+')
fi

if [ -z "$CLIENT_NAME" ]; then
    echo "[$(date)] ERROR: Client name not provided. Usage: backup.sh CLIENT_NAME"
    exit 1
fi

# Configuration
DB_NAME="miniapp_${CLIENT_NAME}"
DB_USER="miniapp_${CLIENT_NAME}"
DEPLOY_DIR="/var/www/clients/$CLIENT_NAME"
BACKUP_DIR="$DEPLOY_DIR/backups"
MAX_BACKUPS=7
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
PM2_NAME="miniapp-$CLIENT_NAME"

echo "============================================"
echo "[$(date)] Starting backup for: $CLIENT_NAME"
echo "============================================"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Check if database exists
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "[$(date)] ERROR: Database $DB_NAME not found"
    exit 1
fi

# Create backup (compressed)
echo "[$(date)] Creating backup: $BACKUP_FILE"
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup created successfully ($BACKUP_SIZE)"
else
    echo "[$(date)] ERROR: Backup failed"
    exit 1
fi

# Remove old backups (keep only last MAX_BACKUPS)
echo "[$(date)] Cleaning old backups (keeping last $MAX_BACKUPS)"
cd "$BACKUP_DIR"
ls -t ${DB_NAME}_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm --

# Count remaining backups
BACKUP_COUNT=$(ls -1 ${DB_NAME}_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Current backup count: $BACKUP_COUNT"

# Restart PM2 process
echo "[$(date)] Restarting PM2 process: $PM2_NAME"
pm2 restart "$PM2_NAME" --update-env

if [ $? -eq 0 ]; then
    echo "[$(date)] PM2 restarted successfully"
else
    echo "[$(date)] WARNING: PM2 restart failed (process may not exist)"
fi

echo "[$(date)] Backup complete for $CLIENT_NAME"
echo "============================================"
