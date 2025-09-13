# Memory Optimization Guide for Cortex-OS

## Root Cause Analysis

The memory issues on your Mac Studio during builds/tests are caused by:

1. **TypeScript Language Server**: 2 instances × 2GB each = 4GB
2. **Java/VS Code Extensions**: 2GB
3. **MLX Model Loading**: ~2GB (Node process for AI models)
4. **Multiple Test Runners**: 12+ Vitest processes × 400MB each = ~5GB
5. **Nx Build Parallelism**: Multiple concurrent build processes

**Total Peak Usage**: ~15GB+ during builds/tests on top of base system usage

## Immediate Solutions Applied

### 1. VS Code Memory Optimization

Created `.vscode/settings.memory-optimized.json` with:

- **TypeScript Server Memory Limit**: 2GB max per instance
- **Reduced Caching**: Limited to 1000 entries, disk caching enabled
- **Disabled Auto-imports**: Reduces indexing overhead
- **File Watcher Exclusions**: Prevents monitoring of build/cache directories
- **Disabled Heavy Editor Features**: Semantic highlighting, hover, suggestions

**Usage**: Copy `settings.memory-optimized.json` to `settings.json` when experiencing memory issues.

### 2. Test Runner Configuration (Current: vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    // Single worker prevents parallel memory multiplication
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,  // ✅ Already configured
        maxThreads: 1,       // ✅ Already configured
        minThreads: 1        // ✅ Already configured
      }
    }
  }
});
```

### 3. Build Optimization Recommendations

#### Package.json Scripts - Reduce Parallelism
```json
{
  "scripts": {
    "build": "nx run-many -t build --parallel=2",    // Reduce from default
    "test": "nx run-many -t test --parallel=1",      // Sequential testing
    "test:affected": "nx affected -t test --parallel=1"
  }
}
```

#### Nx Configuration Enhancement
```json
{
  "tasksRunnerOptions": {
    "default": {
      "options": {
        "parallel": 2,           // Limit concurrent tasks
        "maxParallel": 2,        // Hard limit
        "cacheDirectory": ".nx/cache"
      }
    }
  }
}
```

### 4. Node.js Memory Optimization

#### Environment Variables
```bash
# Add to .env or shell profile
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
export UV_THREADPOOL_SIZE=4  # Reduce libuv thread pool
```

#### Process Management (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'cortex-orchestrator',
    max_memory_restart: '1536M',  // Reduce from 2GB
    instances: 1,                 // Prevent multiple instances
    exec_mode: 'fork'            // Use fork mode instead of cluster
  }]
};
```

## Monitoring and Prevention

### 1. Memory Monitoring Commands
```bash
# Check system memory usage
top -l 1 -o mem | head -10

# Monitor Node.js processes
ps aux | grep -E "(node|pnpm)" | sort -k6 -nr

# Check TypeScript server memory
ps aux | grep tsserver
```

### 2. Development Workflow Best Practices

#### Before Starting Development Session
```bash
# Stop running processes
pkill -f "nx.js"
pkill -f "vitest" 
pm2 restart all

# Clean caches
pnpm store prune
rm -rf .nx/cache
```

#### During Development
- **Sequential Testing**: Run `pnpm test:single-package` instead of full test suite
- **Targeted Builds**: Use `nx build <specific-package>` instead of `build:all`
- **Monitor Memory**: Use Activity Monitor or `htop` to watch memory usage

#### MLX Model Management
```bash
# Stop MLX server when not needed
mlx-stop

# Use smaller models during development
export MLX_MODEL="Qwen2-0.5B-Instruct-4bit"  # Instead of larger models
```

### 3. VS Code Settings Toggle

Create aliases for quick memory mode switching:

```bash
# Add to ~/.zshrc
alias vscode-memory-mode="cp .vscode/settings.memory-optimized.json .vscode/settings.json"
alias vscode-normal-mode="git checkout .vscode/settings.json"
```

### 4. Emergency Memory Recovery

When memory usage becomes critical:

```bash
#!/bin/bash
# save as scripts/emergency-memory-cleanup.sh

echo "🚨 Emergency Memory Cleanup"

# Stop all development processes
pkill -f "nx.js"
pkill -f "vitest"
pkill -f "tsserver"
pm2 stop all

# Clean caches
pnpm store prune
rm -rf .nx/cache
rm -rf node_modules/.cache
rm -rf logs/

# Restart essential services only
pm2 start ecosystem.config.js --only cortex-orchestrator

echo "✅ Memory cleanup complete"
```

## Long-term Optimizations

### 1. TypeScript Project Splitting
Consider splitting large TypeScript projects into smaller, independent projects to reduce language server memory usage.

### 2. Selective Testing Strategy
```bash
# Test only changed packages
pnpm test:affected

# Test specific domains
pnpm test packages/memories packages/a2a

# Skip integration tests during development
pnpm test:unit
```

### 3. Build Caching Strategy
```json
{
  "tasksRunnerOptions": {
    "default": {
      "options": {
        "cacheableOperations": ["build", "typecheck"],
        "useDependencyGraph": true,
        "runtimeCacheInputs": ["node -v"]
      }
    }
  }
}
```

### 4. Hardware-Specific Tuning

For Mac Studio with 64GB RAM:
- Reserve 20GB for system and applications
- Allocate max 40GB for development processes
- Monitor with Activity Monitor's Memory Pressure graph

## Troubleshooting Guide

### High Memory Symptoms
- VS Code becomes unresponsive
- Build processes fail with "out of memory"
- System swapping increases
- Fans running at high speed

### Quick Diagnosis
```bash
# Check memory pressure
memory_pressure

# Identify heavy processes
ps aux | sort -k6 -nr | head -10

# Check swap usage
vm_stat | grep "Swapouts"
```

### Recovery Steps
1. **Immediate**: Run emergency cleanup script
2. **Short-term**: Enable memory-optimized VS Code settings
3. **Medium-term**: Adjust parallelism in builds/tests
4. **Long-term**: Consider project restructuring or hardware upgrade

---

**Created**: $(date)
**Author**: GitHub Copilot
**Status**: Active - Monitor and adjust as needed
