# brAInwav Policy Quick Reference

## ❌ PROHIBITED in Production Code

| Pattern | Rule | Auto-Fix | Example |
|---------|------|----------|---------|
| `Math.random()` | `brainwav.math-random-in-prod` | ❌ | Use `crypto.randomUUID()` instead |
| `Mock adapter response` | `brainwav.mock-response-in-prod` | ❌ | Implement real adapters |
| `TODO`, `FIXME` | `brainwav.todo-in-prod-path` | ❌ | Complete implementation |
| `console.warn("not implemented")` | `brainwav.not-implemented-warn` | ✅ AST-Grep | Throws error instead |
| Console without `[brAInwav]` | `brand-in-logger` | ✅ AST-Grep | Adds prefix |
| Error without `[brAInwav]` | `brand-in-throw` | ✅ AST-Grep | Adds prefix |
| `nx run-many` | `brainwav.nx.run-many.avoid` | ❌ | Use `pnpm *:smart` |

## ✅ REQUIRED Patterns

### Logging
```typescript
// ❌ WRONG
console.log('User logged in');

// ✅ CORRECT
console.log('[brAInwav] User logged in');
```

### Error Handling
```typescript
// ❌ WRONG
throw new Error('Invalid input');

// ✅ CORRECT
throw new Error('[brAInwav] Invalid input');
```

### Task Execution
```bash
# ❌ WRONG
pnpm nx run-many --target=build --all

# ✅ CORRECT
pnpm build:smart
```

## 🔧 Commands

```bash
# Check violations
pnpm lint:ast-grep:check

# Auto-fix violations
pnpm lint:ast-grep:fix

# Scan with Semgrep (requires installation)
pnpm security:scan:brainwav

# Generate baseline
pnpm security:scan:brainwav:baseline
```

## 📍 Exclusions

Tests, docs, examples, and configuration files are automatically excluded from scanning.

## 💡 Tips

- Pre-commit hook shows warnings but doesn't block locally
- CI enforces rules strictly and fails on violations
- Use `pnpm lint:ast-grep:fix` before committing to auto-remediate
- Check `examples/policy-violations.example.ts` for demonstrations

---
**Full docs**: `docs/brainwav-policy-pack.md`
