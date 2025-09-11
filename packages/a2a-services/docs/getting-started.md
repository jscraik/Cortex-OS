# Getting Started

## Prerequisites
- Node.js 18+
- pnpm package manager

## Installation
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Navigate to this package:
   ```bash
   cd packages/a2a-services/schema-registry
   ```
3. Start the schema registry service:
   ```bash
   pnpm ts-node src/index.ts
   ```
   The service listens on `http://localhost:3000` by default.

## First Request
Send a POST request to create a schema:
```bash
curl -X POST http://localhost:3000/schemas \
  -H 'Content-Type: application/json' \
  -d '{"name":"Example","version":"1.0.0","schema":{}}'
```
