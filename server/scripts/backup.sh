#!/bin/bash
# =============================================================================
# Database Backup Script
# Runs daily at 03:00 MSK, keeps last 7 backups, restarts PM2 after backup
# =============================================================================

# Configuration
DB_PATH="/var/www/tg-miniapp/server/prisma/dev.db"
BACKUP_DIR="/var/www/tg-miniapp/backups"
MAX_BACKUPS=7
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/dev.db.$DATE"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "[$(date)] ERROR: Database not found at $DB_PATH"
    exit 1
fi

# Create backup
echo "[$(date)] Creating backup: $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup created successfully"
else
    echo "[$(date)] ERROR: Backup failed"
    exit 1
fi

# Remove old backups (keep only last MAX_BACKUPS)
echo "[$(date)] Cleaning old backups (keeping last $MAX_BACKUPS)"
cd $BACKUP_DIR
ls -t dev.db.* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm --

# Count remaining backups
BACKUP_COUNT=$(ls -1 dev.db.* 2>/dev/null | wc -l)
echo "[$(date)] Current backup count: $BACKUP_COUNT"

# Restart PM2
echo "[$(date)] Restarting PM2..."
pm2 restart all --update-env

if [ $? -eq 0 ]; then
    echo "[$(date)] PM2 restarted successfully"
else
    echo "[$(date)] ERROR: PM2 restart failed"
fi

echo "[$(date)] Backup complete"
