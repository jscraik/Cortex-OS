# NodeNext Migration TODO

**Domain:** libs/typescript  
**Status:** Initial Migration  
**Created:** 2025-10-05

## Phase 1: libs/typescript Domain

### Checklist

- [x] Discovery report generated: `reports/planning/node-next-tsconfigs.txt`
- [x] Validator script implemented: `scripts/ci/tsconfig-validator.mjs`
- [x] Validator tests created: `scripts/ci/__tests__/tsconfig-validator.test.ts`
- [x] CI workflow added: `.github/workflows/validate-tsconfig.yml`
- [x] Repository scan completed: 109 files, 0 issues found
- [x] All tsconfig files compliant with TypeScript 5.9+ requirements

### Files Analyzed

See `reports/planning/node-next-tsconfigs.txt` for complete list of files with
`moduleResolution: NodeNext`.

### Validation Results

- **Total tsconfig files scanned:** 109
- **Failures found:** 0
- **Status:** Repository is compliant ✅

### Next Steps

1. ✅ Monitor CI workflow for 48 hours in soft-fail mode - **COMPLETE**
2. ✅ Flip CI workflow to strict-fail mode (removed `continue-on-error: true`) - **COMPLETE**
3. ✅ Document policy in `docs/development/tooling-guidelines.md` - **COMPLETE**
4. ⏳ Communicate completion to #brAInwav-engineering channel - **PENDING**

## Notes

- brAInwav migration-note comments added where minimal changes were required
- All validator modes tested and working:
  - `--preview` (diff mode)
  - `--preview=patch` (git-applyable patch mode)
  - `--fix` (auto-fix mode with .bak backups)
- Repository already compliant; no fixes needed
