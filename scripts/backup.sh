#!/bin/bash
# Hashrial Database Backup Script
# Run daily via cron: 0 2 * * * /path/to/backup.sh

set -e

BACKUP_DIR="${1:-.}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hashrial_backup_${TIMESTAMP}.sql"

echo "[$(date)] Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
pg_dump \
  -h "${POSTGRES_HOST:-localhost}" \
  -U "${POSTGRES_USER:-hashrial}" \
  -d "${POSTGRES_DB:-hashrial}" \
  --format=custom \
  > "$BACKUP_FILE"

echo "[$(date)] Backup created: $BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "[$(date)] Backup compressed: $BACKUP_FILE"

# Keep only last 30 backups (delete older ones)
find "$BACKUP_DIR" -name "hashrial_backup_*.sql.gz" -mtime +30 -delete

echo "[$(date)] Cleaned old backups (kept last 30 days)"

# Optional: Upload to S3
if command -v aws &> /dev/null && [ -n "$BACKUP_S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://${BACKUP_S3_BUCKET}/backups/" --sse AES256
  echo "[$(date)] Uploaded to S3: ${BACKUP_S3_BUCKET}/backups/"
fi

echo "[$(date)] Backup complete: $BACKUP_FILE"
