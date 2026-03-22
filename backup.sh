#!/usr/bin/env bash
# =============================================================================
# DR Prepper Wholesale Portal — Database Backup Script
# Runs daily via cron: 0 2 * * * /Users/djmac/drprepper-wholesale-portal/backup.sh
# Backs up drprepper_wholesale PostgreSQL database to local storage (+ optional S3/Backblaze)
# Retains backups for 30 days
# =============================================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
DB_NAME="${DB_NAME:-drprepper_wholesale}"
DB_USER="${DB_USER:-djmac}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y-%m-%dT%H%M%S)
BACKUP_FILENAME="drprepper_wholesale_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
LOG_FILE="${BACKUP_DIR}/backup.log"
PG_DUMP_PATH="/opt/homebrew/Cellar/postgresql@15/15.17/bin/pg_dump"

# Optional S3/Backblaze B2 upload (set these env vars to enable)
# S3_BUCKET="your-bucket-name"
# S3_PREFIX="drprepper-backups/"
# AWS_ACCESS_KEY_ID="..."
# AWS_SECRET_ACCESS_KEY="..."
# AWS_DEFAULT_REGION="us-west-2"
# Or for Backblaze B2: use rclone with b2: remote
# RCLONE_REMOTE="b2:drprepper-backups"

# ─── Helpers ──────────────────────────────────────────────────────────────────
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

error_exit() {
  log "ERROR: $1"
  exit 1
}

# ─── Pre-flight ───────────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# Check pg_dump exists
if [[ ! -x "${PG_DUMP_PATH}" ]]; then
  # Try to find it
  PG_DUMP_PATH=$(command -v pg_dump 2>/dev/null || echo "")
  if [[ -z "${PG_DUMP_PATH}" ]]; then
    error_exit "pg_dump not found. Install PostgreSQL or set PG_DUMP_PATH."
  fi
fi

log "Starting backup of ${DB_NAME}…"

# ─── Dump ─────────────────────────────────────────────────────────────────────
PGPASSWORD="${DB_PASSWORD:-}" "${PG_DUMP_PATH}" \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  --format=plain \
  --no-password \
  "${DB_NAME}" | gzip > "${BACKUP_PATH}"

BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
log "Backup created: ${BACKUP_FILENAME} (${BACKUP_SIZE})"

# ─── Upload to S3/Backblaze (REQUIRED - offsite backup enforcement) ───────────
BACKUP_METHOD="${BACKUP_METHOD:-}"

if [[ "${BACKUP_METHOD}" == "s3" || -n "${S3_BUCKET:-}" ]]; then
  if [[ -z "${S3_BUCKET:-}" ]]; then
    error_exit "S3_BUCKET not set but BACKUP_METHOD=s3"
  fi
  
  log "Uploading to S3: s3://${S3_BUCKET}/${S3_PREFIX:-}${BACKUP_FILENAME}"
  
  # Retry logic: 3 attempts with exponential backoff
  RETRY_COUNT=0
  MAX_RETRIES=3
  while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if aws s3 cp "${BACKUP_PATH}" "s3://${S3_BUCKET}/${S3_PREFIX:-}${BACKUP_FILENAME}" \
      --storage-class STANDARD_IA 2>&1; then
      log "✅ S3 upload successful"
      break
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      if [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; then
        WAIT_TIME=$((2 ** RETRY_COUNT))
        log "S3 upload attempt $((RETRY_COUNT)) failed, retrying in ${WAIT_TIME}s…"
        sleep "$WAIT_TIME"
      else
        error_exit "S3 upload failed after $MAX_RETRIES attempts"
      fi
    fi
  done
  
elif [[ "${BACKUP_METHOD}" == "b2" || -n "${RCLONE_REMOTE:-}" ]]; then
  if [[ -z "${RCLONE_REMOTE:-}" ]]; then
    error_exit "RCLONE_REMOTE not set but BACKUP_METHOD=b2"
  fi
  
  log "Uploading to Backblaze B2: ${RCLONE_REMOTE}/${BACKUP_FILENAME}"
  
  # Retry logic: 3 attempts with exponential backoff
  RETRY_COUNT=0
  MAX_RETRIES=3
  while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if rclone copy "${BACKUP_PATH}" "${RCLONE_REMOTE}/" 2>&1; then
      log "✅ B2 upload successful"
      break
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      if [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; then
        WAIT_TIME=$((2 ** RETRY_COUNT))
        log "B2 upload attempt $((RETRY_COUNT)) failed, retrying in ${WAIT_TIME}s…"
        sleep "$WAIT_TIME"
      else
        error_exit "B2 upload failed after $MAX_RETRIES attempts"
      fi
    fi
  done
  
else
  error_exit "BACKUP_METHOD not set. Must be 's3' or 'b2' for offsite backup (required for production)"
fi

# ─── Rotate old backups (30-day retention) ─────────────────────────────────────
log "Rotating backups older than ${RETENTION_DAYS} days…"
DELETED=$(find "${BACKUP_DIR}" -name "drprepper_wholesale_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | xargs)
if [[ "$DELETED" -gt 0 ]]; then
  log "Deleted ${DELETED} old backup(s)"
fi

# ─── Verify backup integrity ──────────────────────────────────────────────────
log "Verifying backup integrity…"
if gunzip -t "${BACKUP_PATH}" 2>/dev/null; then
  log "✅ Backup integrity check passed"
else
  error_exit "Backup integrity check FAILED for ${BACKUP_PATH}"
fi

# ─── Count total backups ──────────────────────────────────────────────────────
TOTAL=$(find "${BACKUP_DIR}" -name "drprepper_wholesale_*.sql.gz" | wc -l | xargs)
log "Total backups on disk: ${TOTAL}"
log "Backup completed successfully: ${BACKUP_FILENAME}"

# ─── Print restore instructions ───────────────────────────────────────────────
cat >> "${LOG_FILE}" <<EOF
# To restore this backup:
#   gunzip -c "${BACKUP_PATH}" | psql -U ${DB_USER} -h ${DB_HOST} -d ${DB_NAME}
# Or to a new database:
#   createdb -U ${DB_USER} drprepper_wholesale_restore
#   gunzip -c "${BACKUP_PATH}" | psql -U ${DB_USER} -h ${DB_HOST} -d drprepper_wholesale_restore
EOF
