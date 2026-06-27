#!/bin/bash
# Hashrial Database Backup Script
# Run daily via cron: 0 2 * * * /opt/hashrial/scripts/backup.sh /opt/hashrial

set -euo pipefail

BACKUP_DIR="${1:-.}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hashrial_backup_${TIMESTAMP}.sql"

# Load database credentials from .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

export PGPASSWORD="${POSTGRES_PASSWORD:-}"

echo "[$(date)] Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
pg_dump \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-hashrial}" \
  -d "${POSTGRES_DB:-hashrial}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  > "$BACKUP_FILE"

# Verify backup integrity
BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
if [ "$BACKUP_SIZE" -lt 100 ]; then
  echo "[$(date)] ERROR: Backup file too small ($BACKUP_SIZE bytes) — possible corruption"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "[$(date)] Backup created: $BACKUP_FILE ($(( BACKUP_SIZE / 1024 ))KB)"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "[$(date)] Backup compressed: $BACKUP_FILE"

# Keep only last 30 backups (delete older ones)
find "$BACKUP_DIR" -name "hashrial_backup_*.sql.gz" -mtime +30 -delete
REMAINING=$(find "$BACKUP_DIR" -name "hashrial_backup_*.sql.gz" | wc -l)
echo "[$(date)] Cleaned old backups — ${REMAINING} backups remaining"

# Optional: Upload to S3
if command -v aws &> /dev/null && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://${BACKUP_S3_BUCKET}/backups/" --sse aws:kms
  echo "[$(date)] Uploaded to S3: ${BACKUP_S3_BUCKET}/backups/"
fi

echo "[$(date)] Backup complete: $BACKUP_FILE"

unset PGPASSWORD
