#!/bin/bash
# XMenu Backup Script
# This script creates backups of the XMenu database and application files

set -e # Exit on error

# Color codes for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Log function
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
  exit 1
}

# Configuration
APP_NAME="xmenu"
BACKUP_DIR="/var/backups/${APP_NAME}"
APP_DIR="/var/www/${APP_NAME}" # Application directory
DB_NAME="xmenu_db" # Database name
DB_USER="xmenu_user" # Database user
RETENTION_DAYS=7
REMOTE_BACKUP=false # Set to true to enable remote backups
REMOTE_BACKUP_PATH="s3://your-bucket/xmenu-backups" # Change to your S3 bucket or other remote storage

# Load database password from credentials file
if [ -f "/root/.${APP_NAME}_db_credentials" ]; then
  source "/root/.${APP_NAME}_db_credentials"
else
  error "Database credentials file not found"
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR" || error "Failed to create backup directory"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup database
log "Backing up database..."
DB_BACKUP_FILE="${BACKUP_DIR}/${APP_NAME}_db_${TIMESTAMP}.sql.gz"
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip > "$DB_BACKUP_FILE" || error "Failed to backup database"

# Backup application files
log "Backing up application files..."
APP_BACKUP_FILE="${BACKUP_DIR}/${APP_NAME}_app_${TIMESTAMP}.tar.gz"
tar -czf "$APP_BACKUP_FILE" -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")" || error "Failed to backup application files"

# Remove old backups
log "Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "${APP_NAME}_*" -type f -mtime +$RETENTION_DAYS -delete || warning "Failed to remove old backups"

# Print backup summary
log "Backup completed successfully!"
log "Database backup: ${DB_BACKUP_FILE}"
log "Application backup: ${APP_BACKUP_FILE}"

# Optional: Upload backups to remote storage
if [ "$REMOTE_BACKUP" = true ]; then
  log "Uploading backups to remote storage..."
  
  # Check if AWS CLI is installed
  if command -v aws &> /dev/null; then
    aws s3 cp "$DB_BACKUP_FILE" "${REMOTE_BACKUP_PATH}/database/" || warning "Failed to upload database backup"
    aws s3 cp "$APP_BACKUP_FILE" "${REMOTE_BACKUP_PATH}/application/" || warning "Failed to upload application backup"
  elif command -v rclone &> /dev/null; then
    # Alternative: use rclone if available
    rclone copy "$DB_BACKUP_FILE" "${REMOTE_BACKUP_PATH}/database/" || warning "Failed to upload database backup"
    rclone copy "$APP_BACKUP_FILE" "${REMOTE_BACKUP_PATH}/application/" || warning "Failed to upload application backup"
  else
    warning "Neither AWS CLI nor rclone found. Skipping remote backup."
  fi
fi

log "All done!"