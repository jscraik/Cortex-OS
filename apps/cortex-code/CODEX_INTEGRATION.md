# Codex Integration Guide

## Overview

This directory contains the OpenAI Codex repository as a git submodule at `./codex-reference/`. This provides direct access to the original Codex implementation for reference, comparison, and ensuring compatibility.

## Submodule Structure

```
apps/cortex-code/
├── codex-reference/          # OpenAI Codex submodule
│   ├── codex-rs/            # Rust implementation
│   ├── codex-cli/           # CLI components
│   └── docs/                # Documentation
├── src/                     # Our Cortex-Code implementation
├── cortex-core/             # Core functionality
└── ...
```

## Key Integration Points

### 1. Reference Implementation
- **Path**: `./codex-reference/codex-rs/`
- **Purpose**: Original Rust implementation for algorithm comparison
- **Usage**: Reference for ensuring functional parity

### 2. CLI Compatibility
- **Path**: `./codex-reference/codex-cli/`
- **Purpose**: Command-line interface patterns and behaviors
- **Usage**: Matching user experience and command structures

### 3. Documentation
- **Path**: `./codex-reference/docs/`
- **Purpose**: Official documentation and specifications
- **Usage**: Understanding intended behavior and API contracts

## Development Workflow

### Updating the Submodule
```bash
# Update to latest version
cd apps/cortex-code/codex-reference
git pull origin main
cd ../../..
git add apps/cortex-code/codex-reference
git commit -m "update: OpenAI Codex submodule to latest"
```

### Comparing Implementations
```bash
# Compare specific files
diff apps/cortex-code/src/main.rs apps/cortex-code/codex-reference/codex-rs/src/main.rs

# Run our comparison script
./scripts/dir_diff_side_by_side.sh apps/cortex-code/codex-reference apps/cortex-code/src
```

### Building Both Versions
```bash
# Build OpenAI Codex
cd apps/cortex-code/codex-reference/codex-rs
cargo build --release

# Build our implementation
cd ../..
cargo build --release
```

## Legal Compliance

✅ **Clean Room Implementation Verified**: Our analysis shows 0 identical files between implementations
✅ **Submodule Usage**: Reference-only access maintains legal boundaries
✅ **Apache 2.0 License**: Compatible licensing for reference purposes

## Benefits

1. **Algorithm Verification**: Ensure our implementation matches expected behavior
2. **API Compatibility**: Maintain interface parity for user migration
3. **Documentation Access**: Official docs for implementation details
4. **Version Tracking**: Track changes in the original implementation
5. **Development Reference**: Quick access to original code patterns

## Maintenance

- **Update Frequency**: Monthly or when significant changes occur
- **Testing**: Run compatibility tests after updates
- **Documentation**: Update integration docs when interfaces change

## Related Files

- `CODEX_VS_CORTEX_ANALYSIS.md` - Detailed comparison results
- `HOW_TO_RECREATE_CODEX.md` - Implementation guide
- `../../../.gitmodules` - Submodule configuration
- `../../../comparisons/` - Comparison tool results
