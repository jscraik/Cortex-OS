#!/usr/bin/env bash
set -euo pipefail

PG_USER="${PG_USER:-cortex}"
PG_PASSWORD="${PG_PASSWORD:-cortexpw}"
PG_DB="${PG_DB:-rag}"
PG_PORT="${PG_PORT:-5433}"
PG_HOST="${PG_HOST:-127.0.0.1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$ROOT_DIR/infra/db/pgvector-init.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "Seed SQL not found: $SQL_FILE" >&2
  exit 1
fi

export PGPASSWORD="$PG_PASSWORD"
psql "host=$PG_HOST port=$PG_PORT user=$PG_USER dbname=$PG_DB sslmode=disable" -f "$SQL_FILE"
echo "Seed applied successfully."
