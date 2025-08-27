# PR checklist

- [ ] Policies validated (`pnpm test -w contracts`)
- [ ] Any new tool has a policy file in `.cortex/policy/tools/`
- [ ] If dataClass = sensitive, HITL is wired and screenshot attached
- [ ] Added simlab scenario if behavior changes

## Policy diff (required)

```diff
--- a/.cortex/policy/tools/git.json
+++ b/.cortex/policy/tools/git.json
@@ -3,7 +3,7 @@
   "actions": ["tree","snippet","search"],
-  "rate": { "perMinute": 60 },
+  "rate": { "perMinute": 30 },
   "fsScope": ["apps/cortex-os","packages","docs"]
```

## Summary

- What changed
- Why
- Risk

## Checks

- [ ] Structure guard passes
- [ ] Typecheck passes
- [ ] Tests >= 80% coverage
- [ ] SBOM generated
