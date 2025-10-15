# Command Reference: Memory Performance Optimization

**Quick reference for all commands used during implementation**

---

## 🔧 Setup & Preparation

```bash
# Navigate to task directory
cd ~/tasks/memory-ecosystem-performance-optimization

# Create feature branch
cd /Users/jamiecraik/.Cortex-OS
git checkout -b feat/memory-performance-optimization

# Set up watch mode
pnpm --filter memory-core test -- --watch
pnpm tdd-coach:watch
```

---

## 📦 Task 1: Dependencies

```bash
# Install dependencies
pnpm --filter memories add undici@^6.0.0
pnpm --filter memory-core add p-limit@^5.0.0 lru-cache@^10.0.0

# Verify installation
pnpm --filter memories list --depth=0 | grep undici
pnpm --filter memory-core list --depth=0 | grep p-limit

# Typecheck
pnpm typecheck:smart
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run specific test file
pnpm --filter memories test http-pooling
pnpm --filter memory-core test parallel-ingest

# Run with coverage
pnpm --filter memories test -- --coverage
pnpm --filter memory-core test -- --coverage

# Watch mode (TDD)
pnpm --filter memory-core test -- --watch

# All tests
pnpm test:smart -- --coverage
```

### Mutation Testing

```bash
# Mutate specific file
pnpm --filter memory-core test:mutate -- --mutate=src/lib/concurrency.ts

# Full mutation suite
pnpm --filter memory-core test:mutate
```

### Integration Tests

```bash
# E2E flow
pnpm test:e2e -- packages/memories packages/memory-core
```

---

## 🏗️ Build & Validation

```bash
# Lint
pnpm lint:smart
pnpm --filter memories lint
pnpm --filter memory-core lint

# Typecheck
pnpm typecheck:smart
pnpm --filter memories typecheck
pnpm --filter memory-core typecheck

# Build
pnpm build:smart
pnpm --filter memories build
pnpm --filter memory-core build

# Dry run (see what would build)
pnpm build:smart --dry-run
```

---

## 🔒 Security & Structure

```bash
# Security scan
pnpm security:scan --scope=memories --scope=memory-core

# Structure validation
pnpm structure:validate

# Check for leaked secrets
pnpm gitleaks:check

# SBOM generation
pnpm sbom:generate
```

---

## 📊 Performance Testing (Task 7)

### Baseline Metrics

```bash
# Start services
pnpm --filter memory-rest-api dev

# Run k6 baseline (separate terminal)
cd ~/tasks/memory-ecosystem-performance-optimization/validation
k6 run k6-load-test.js --out json=baseline-metrics.json
```

### Post-Optimization Metrics

```bash
# Enable feature flags
export MEMORY_HTTP_POOL_ENABLED=true
export MEMORY_PARALLEL_INGEST_CONCURRENCY=4
export MEMORY_CACHE_MAX_SIZE=100

# Restart services
pnpm --filter memory-rest-api dev

# Run k6 test
k6 run k6-load-test.js --out json=post-optimization-metrics.json
```

### Compare Results

```bash
cd /Users/jamiecraik/.Cortex-OS
pnpm tsx scripts/compare-k6-metrics.ts \
  ~/tasks/memory-ecosystem-performance-optimization/validation/baseline-metrics.json \
  ~/tasks/memory-ecosystem-performance-optimization/validation/post-optimization-metrics.json
```

---

## 🔍 Debugging

### Watch for Timer Leaks

```bash
node --trace-warnings \
  packages/memory-core/dist/index.js
```

### Memory Profiling

```bash
pnpm sample-memory -- pnpm --filter memory-core test
```

### Connection Monitoring

```bash
# Check active connections (macOS)
netstat -an | grep :3000 | grep ESTABLISHED

# Check active connections (Linux)
ss -tan | grep :3000 | grep ESTAB
```

### Log Tailing

```bash
# Real-time logs
tail -f logs/memory-core.log | grep "brAInwav"

# Filter for specific component
tail -f logs/memory-core.log | jq 'select(.component == "memory-core")'
```

---

## 📝 Documentation

### Markdown Linting

```bash
pnpm lint:markdown packages/*/README.md docs/adr/*.md

# Check links
pnpm check:links

# Spell check
pnpm spellcheck docs/
```

---

## 🚀 Deployment

### Local Development

```bash
# Start with pooling enabled
MEMORY_HTTP_POOL_ENABLED=true pnpm --filter memory-rest-api dev

# Start with parallel ingest
MEMORY_PARALLEL_INGEST_CONCURRENCY=4 pnpm --filter memory-rest-api dev

# All optimizations
MEMORY_HTTP_POOL_ENABLED=true \
MEMORY_PARALLEL_INGEST_CONCURRENCY=4 \
MEMORY_CACHE_MAX_SIZE=500 \
pnpm --filter memory-rest-api dev
```

### Health Checks

```bash
# Check service health
curl http://localhost:3000/health

# Check pool stats
curl http://localhost:3000/metrics | grep pool

# Check cache stats
curl http://localhost:3000/cache/stats
```

---

## 🔄 Git Operations

### Commits (Conventional)

```bash
# Stage changes
git add packages/memories/src/adapters/rest-api/http-client.ts

# Commit (signed)
git commit -S -m "feat(memories): add undici HTTP pooling for REST adapter"

# Verify signature
git log --show-signature -1
```

### PR Creation

```bash
# Create PR with GitHub CLI
gh pr create \
  --title "feat: memory ecosystem performance optimization" \
  --body-file ~/tasks/memory-ecosystem-performance-optimization/PR_BODY.md \
  --assignee @me \
  --reviewer @brAInwav-devs

# Attach artifacts
gh pr comment --body-file SUMMARY.md
```

---

## 📋 Quality Gate Checklist

```bash
# Run full quality suite (before PR)
pnpm test:smart -- --coverage && \
pnpm lint:smart && \
pnpm typecheck:smart && \
pnpm build:smart && \
pnpm security:scan --scope=memories --scope=memory-core && \
pnpm structure:validate && \
echo "✅ All quality gates passed!"
```

---

## 🎯 Coverage Reports

### Generate HTML Reports

```bash
# Unit coverage
pnpm --filter memory-core test -- --coverage
open packages/memory-core/coverage/index.html

# Mutation report
pnpm --filter memory-core test:mutate
open packages/memory-core/reports/mutation/html/index.html
```

### Export JUnit XML (for CI)

```bash
pnpm test:smart -- --coverage --reporter=junit --outputFile=test-results.xml
```

---

## 🧰 Utility Scripts

### Codemap

```bash
# Generate code map
pnpm codemap --scope=package:memory-core
open out/codemap.md
```

### Structure Validation

```bash
# Validate package structure
pnpm structure:validate --package packages/memory-core

# Dry run
pnpm structure:validate --dry-run
```

---

## 🔁 Rollback

### Environment Variable Rollback (Instant)

```bash
# Disable optimizations
export MEMORY_HTTP_POOL_ENABLED=false
export MEMORY_PARALLEL_INGEST_CONCURRENCY=0

# Restart services
pm2 restart memory-services
```

### Code Rollback

```bash
# Revert merge commit
git revert <merge-commit-sha>

# Rebuild
pnpm --filter memories build
pnpm --filter memory-core build

# Restart
pm2 restart memory-services
```

---

## 📊 Monitoring

### Grafana Dashboard Setup

```bash
# Import dashboard JSON
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @~/tasks/.../monitoring/grafana-dashboard.json
```

### Prometheus Metrics

```bash
# Scrape metrics
curl http://localhost:3000/metrics

# Filter specific metrics
curl http://localhost:3000/metrics | grep memory_pool
curl http://localhost:3000/metrics | grep cache_hit_rate
```

---

## 🔐 Secrets Management

### 1Password CLI

```bash
# Fetch Redis credentials
op read "op://dev/redis/password"

# Inject into environment
export REDIS_PASSWORD=$(op read "op://dev/redis/password")

# Never commit credentials!
```

---

## 📦 Artifacts

### Copy Test Results to Task Directory

```bash
# Unit test JUnit XML
cp packages/memory-core/test-results.xml \
   ~/tasks/memory-ecosystem-performance-optimization/test-logs/

# Coverage HTML
cp -r packages/memory-core/coverage/ \
   ~/tasks/memory-ecosystem-performance-optimization/verification/

# k6 metrics
cp validation/post-optimization-metrics.json \
   ~/tasks/memory-ecosystem-performance-optimization/validation/
```

---

## 💡 Tips

### Parallel Safe Commands

```bash
# Safe (read-only, can parallelize)
pnpm typecheck:smart &
pnpm lint:smart &
wait

# NOT SAFE (must be sequential)
pnpm build:smart  # Never parallelize builds
pnpm test:smart   # Tests can conflict
```

### Focused Test Execution

```bash
# Run single test
pnpm --filter memory-core test -- --testNamePattern="should batch embed"

# Run single file
pnpm --filter memory-core test parallel-ingest

# Update snapshots
pnpm --filter memory-core test -- -u
```

---

**Command Reference Version**: 1.0  
**Last Updated**: 2025-10-15
