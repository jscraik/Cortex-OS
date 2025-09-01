# Cleanup Scripts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts for cleaning up and removing legacy code from the codebase.

## Contents

- `remove-legacy-code.py` - Python script for removing legacy code components

## Usage

### Legacy Code Removal

To run the legacy code removal script:

```bash
cd /Users/jamiecraik/.Cortex-OS-clean
python scripts/cleanup/remove-legacy-code.py
```

## Best Practices

1. **Backup**
   - Always create a backup before running cleanup scripts
   - Consider creating a branch for cleanup operations

2. **Documentation**
   - Document what was removed and why
   - Update related documentation to reflect removed components

3. **Testing**
   - Run tests after cleanup operations to ensure functionality is preserved
   - Verify that removed code doesn't break dependent components
