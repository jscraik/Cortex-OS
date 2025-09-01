# Cortex-OS Patches

[![CI Status](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

## Table of Contents

- [Overview](#overview)
- [Contents](#contents)
- [Usage](#usage)
- [Creating New Patches](#creating-new-patches)
- [Contributing](#contributing)
- [Licensing](#licensing)

## Overview

This directory stores patch files used to apply targeted fixes and enhancements to the codebase.

## Contents

- `memory-systems-enhancements.patch` – enhancements for memory systems.

## Usage

Apply a patch:

```bash
git apply patches/memory-systems-enhancements.patch
```

For complex patches:

```bash
git apply --ignore-whitespace --reject patches/memory-systems-enhancements.patch
```

## Creating New Patches

1. Implement changes in the codebase.
2. Generate a patch: `git diff > patches/your-patch-name.patch`.
3. Add an entry to this README.
4. Commit the patch and README updates together.

## Contributing

Ensure patches are well documented and follow project versioning conventions. Contributions are welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Licensing

Licensed under the [Apache 2.0 License](../LICENSE).
