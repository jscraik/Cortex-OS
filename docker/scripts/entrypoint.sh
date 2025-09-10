#!/bin/sh
# Entrypoint script for Cortex OS Documentation container
# Handles initialization, migration, and service startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Environment setup
setup_environment() {
    log "Setting up environment..."

    # Set default values if not provided
    export DATABASE_URL=${DATABASE_URL:-"sqlite:///tmp/docs.db"}
    export REDIS_URL=${REDIS_URL:-"redis://localhost:6379/0"}
    export ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-"http://localhost:9200"}
    export LOG_LEVEL=${LOG_LEVEL:-"INFO"}
    export DOCS_API_PORT=${DOCS_API_PORT:-8001}
    export NGINX_PORT=${NGINX_PORT:-80}

    log_success "Environment configured"
}

# Database initialization
init_database() {
    log "Initializing database..."

    cd /opt/docs-api

    # Wait for database to be available
    if echo "$DATABASE_URL" | grep -q "postgresql"; then
        log "Waiting for PostgreSQL to be ready..."
        python -c "
import time
import psycopg2
import os
from urllib.parse import urlparse

db_url = os.environ['DATABASE_URL']
parsed = urlparse(db_url)

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path[1:]
        )
        conn.close()
        print('Database is ready!')
        break
    except psycopg2.OperationalError:
        retry_count += 1
        print(f'Database not ready, retrying ({retry_count}/{max_retries})...')
        time.sleep(2)
else:
    print('Failed to connect to database after 30 attempts')
    exit(1)
        "
    fi

    # Run database migrations
    log "Running database migrations..."
    python -m alembic upgrade head || {
        log_error "Database migration failed"
        exit 1
    }

    log_success "Database initialized"
    cd -
}

# Service dependencies check
check_dependencies() {
    log "Checking service dependencies..."

    # Check Redis connection
    if echo "$REDIS_URL" | grep -q "redis://"; then
        log "Checking Redis connection..."
        python -c "
import redis
import os
from urllib.parse import urlparse

redis_url = os.environ['REDIS_URL']
parsed = urlparse(redis_url)

try:
    r = redis.Redis(
        host=parsed.hostname,
        port=parsed.port or 6379,
        db=int(parsed.path[1:]) if parsed.path else 0,
        password=parsed.password
    )
    r.ping()
    print('Redis is ready!')
except Exception as e:
    print(f'Redis connection failed: {e}')
    print('Continuing without Redis...')
        "
    fi

    # Check Elasticsearch connection
    if echo "$ELASTICSEARCH_URL" | grep -q "http"; then
        log "Checking Elasticsearch connection..."
        python -c "
import requests
import os

es_url = os.environ['ELASTICSEARCH_URL']

try:
    response = requests.get(f'{es_url}/_cluster/health', timeout=5)
    if response.status_code == 200:
        print('Elasticsearch is ready!')
    else:
        print('Elasticsearch not available, continuing...')
except Exception as e:
    print(f'Elasticsearch connection failed: {e}')
    print('Continuing without Elasticsearch...')
        "
    fi

    log_success "Dependencies checked"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."

    # Ensure log directories exist
    mkdir -p /var/log/nginx /var/log/supervisor /var/log/docs-api

    # Ensure nginx cache directories exist
    mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp \
             /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp

    # Set proper permissions
    chown -R appuser:appgroup /var/log/docs-api

    log_success "Directories configured"
}

# Pre-warm application
prewarm_application() {
    log "Pre-warming application..."

    # Start API service in background to pre-warm
    cd /opt/docs-api
    python -c "
from src.main import app
print('Application pre-warmed successfully')
    " || log_warning "Application pre-warming failed"

    cd -
    log_success "Application pre-warmed"
}

# Handle graceful shutdown
cleanup() {
    log "Received shutdown signal, cleaning up..."

    # Stop supervisor and all child processes
    if [ -f /var/run/supervisord.pid ]; then
        supervisorctl shutdown
    fi

    log_success "Cleanup completed"
    exit 0
}

# Setup signal handlers
trap cleanup SIGTERM SIGINT

# Main initialization
main() {
    log "Starting Cortex OS Documentation container..."

    # Run initialization steps
    setup_environment
    setup_directories
    init_database
    check_dependencies
    prewarm_application

    log_success "Initialization completed successfully"
    log "Starting services..."

    # Execute the main command (supervisor)
    exec "$@"
}

# Run main function with all arguments
main "$@"
