# Changelog

All notable changes to brAInwav Cortex-OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Phase 6: Reality Filter Integration

- **NEW**: Added comprehensive Reality Filter checklist to all AI agent documentation
- Enhanced truthfulness and accuracy verification requirements for all AI agents
- Integrated Reality Filter as Phase 6 in structured agentic coding workflows
- Standardized unverified content labeling across all AI systems

**Files Updated:**

- `AGENTS.md` - Added Reality Filter as Phase 6 after Archive section
- `CLAUDE.md` - Added Reality Filter as Phase 5 after Verification section  
- `QWEN.md` - Added Reality Filter as Phase 6 after Archive section
- `GEMINI.md` - Added Reality Filter as Phase 6 after Archive section
- `.github/copilot-instructions.md` - Added Reality Filter as Phase 6 after Emergency Procedures
- `.cortex/rules/RULES_OF_AI.md` - Added Reality Filter as Phase 6 after AI Development Requirements

**Reality Filter Features:**

- ✅ Never present unverified content as fact
- ✅ Clear labeling of inferences, speculation, and unverified claims
- ✅ Mandatory verification statements for uncertain information
- ✅ Standardized correction protocol for verification failures
- ✅ Protection against content modification without user request
- ✅ Enhanced accuracy for LLM behavior claims and system descriptions

**brAInwav Standards Maintained:**

- All Reality Filter documentation includes brAInwav branding requirements
- Consistent integration across all agent instruction files
- Maintains logical workflow structure in each document
- Preserves existing phase numbering and organizational patterns

### Changed

- Updated all AI agent instruction files to include Phase 6: Reality Filter
- Enhanced documentation consistency across agent-specific guidelines
- Improved truthfulness verification requirements for AI outputs
- **ENHANCED**: All AI workflow documents now mandate documentation updates in Phase 5/Archive
  - Added explicit CHANGELOG.md update requirements
  - Added README.md update requirements for significant changes
  - Added website documentation update requirements for user-facing changes
  - Ensures complete audit trail for all AI agent work
- Documented the brAInwav OrbStack verification workflow and recorded the 2025-09-27 health check results in `docs/orbstack-setup.md` and `docs/dev-tools-reference.md`
- Hardened the `apps/api` Prisma bootstrap so `pnpm --filter @cortex-os/api build` passes
  with brAInwav-branded logging and resilient fallback delegates
- Tuned global coverage enforcement to default to 95% line coverage and added reusable
  threshold resolver for Vitest configuration and scripts

### Technical Details

- **Integration Method**: Added as new phase after existing workflows in each file
- **Consistency**: All files use identical Reality Filter checklist format
- **Placement**: Strategically positioned to maintain logical flow in each document
- **Branding**: Maintains brAInwav standards throughout Reality Filter implementation

**Co-authored-by:** brAInwav Development Team
