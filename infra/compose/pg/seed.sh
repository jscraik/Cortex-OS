#!/usr/bin/env bash
set -euo pipefail

PG_HOST=${PG_HOST:-127.0.0.1}
PG_PORT=${PG_PORT:-5433}
PG_DB=${PG_DB:-rag}
PG_USER=${PG_USER:-cortex}
PG_PASSWORD=${PG_PASSWORD:-cortexpw}

export PGPASSWORD="$PG_PASSWORD"

# Wait for readiness
for i in {1..60}; do
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    break
  fi
  echo "[seed] Waiting for Postgres ($i/60) ..."
  sleep 1
done

psql "host=$PG_HOST port=$PG_PORT dbname=$PG_DB user=$PG_USER" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/seed.sql"

echo "[seed] Database initialized"
