#!/bin/bash
cd "$(dirname "$0")"
echo "Working directory: $(pwd)"

# Load environment variables
export GITHUB_TOKEN=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
export WEBHOOK_SECRET="JNPfjPkmyBLwmG38Um7bDVptyBigzH83m+dNqdXxmVE="
export PORT=3001

echo "Environment variables set:"
echo "GITHUB_TOKEN: ${GITHUB_TOKEN:0:20}..."
echo "WEBHOOK_SECRET: ${WEBHOOK_SECRET:0:10}..."
echo "PORT: $PORT"

echo "Starting server..."
npx tsx src/server/start.ts
