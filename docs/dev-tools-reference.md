# 🚀 Cortex-OS Development Tools Quick Reference

## Updated: September 1, 2025

### 🎯 **Consolidated Toolchain**

| Language | Tool | Purpose | Replaced |
|----------|------|---------|----------|
| **JS/TS** | Biome | Fast formatting + basic linting | Prettier |
| **JS/TS** | ESLint + SonarJS | Advanced code quality | - |
| **Python** | Ruff | Formatting + linting + imports | Black + isort |
| **Containers** | Docker Desktop / CLI | Standard container runtime | OrbStack |

---

## 📋 **Development Commands**

### **JavaScript/TypeScript**

```bash
# Fast development cycle (Biome)
pnpm run format              # Format all JS/TS code
pnpm run lint                # Basic linting
pnpm run format:check        # Check formatting + lint

# Advanced analysis
pnpm run lint:quality        # ESLint + SonarJS rules
pnpm run lint:security       # Security-focused linting
```

### **Python**

```bash
# All-in-one with Ruff
pnpm run python:format       # Format Python code
pnpm run python:format:check # Check Python formatting
pnpm run python:lint         # Lint Python code
pnpm run python:lint:fix     # Auto-fix Python issues
```

### **Security & Quality**

```bash
# Security scanning
pnpm run security:scan       # Semgrep security scan
pnpm run security:scan:all   # Comprehensive security scan

# Type checking
pnpm run typecheck           # TypeScript type checking
```

### **Container Development (Docker)**

```bash
# Development environments
pnpm run dev:docker           # Full dev environment
pnpm run dev:docker:min       # Minimal environment
pnpm run dev:docker:web       # Web-only environment
pnpm run dev:docker:down      # Stop all containers
pnpm run dev:docker:logs      # View container logs

# Health checks
./scripts/docker-dev.sh status         # brAInwav Docker stack status
```

---

## ⚡ **Performance Benefits**

- **Biome**: ~10x faster than Prettier
- **Ruff**: ~100x faster than Black + isort
- **Docker Desktop**: Officially supported by brAInwav with scripted helpers
- **Reduced dependencies**: Fewer packages to maintain

---

## 🔧 **VS Code Integration**

Your VS Code is configured to:

- ✅ Use Biome as default formatter
- ✅ Format on save enabled
- ✅ Auto-organize imports with Biome
- ✅ Quick fixes on save

---

## 🚀 **Pre-commit Hooks**

Automatically runs on commit:

- ✅ Biome check (format + lint)
- ✅ TypeScript type checking
- ✅ Ruff check and format
- ✅ Security audit
- ✅ License compliance

---

## 🎯 **Next Steps Completed**

- [x] Removed Prettier dependency
- [x] Updated VS Code settings for Biome
- [x] Pre-commit hooks already optimized
- [x] Created development workflow documentation
- [x] Verified all tools working

## 🔍 **Node Version Note**

- Root project: Node 20.11.1 (current)
- Some packages require Node >=22
- Consider upgrading Node.js when convenient
- Use `--config.ignoreEngineVersion=true` for pnpm if needed

---

## 📞 **Support**

All tools are configured and ready to use. The consolidated workflow provides:

- Faster development experience
- Consistent code quality
- Fewer dependencies to maintain
- Better developer experience
