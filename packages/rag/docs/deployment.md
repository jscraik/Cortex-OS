# Deployment Guide

## Build
```bash
pnpm build
```
Outputs compiled JavaScript to `dist/`.

## Publish
```bash
npm publish --access public
```
Requires an npm token with publish rights.

## Containerization
Include the package in your service's `package.json` and build the container normally. Ensure the embedding service and vector store endpoints are reachable from the container.
