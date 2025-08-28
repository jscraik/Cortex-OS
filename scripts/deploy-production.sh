#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker/docker-compose.prod.yml"
PROJECT_NAME="cortex"

echo "Deploying Cortex OS production stack"
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" pull
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d

echo "Deployment complete"
