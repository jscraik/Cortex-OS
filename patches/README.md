# Patches

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains patch files used for applying specific fixes and enhancements to the codebase.

## Contents

Currently no patches are provided. Add new patch files as needed.

## Usage

Patches can be applied using the `git apply` command:

```bash
git apply patches/your-patch-name.patch
```

For more complex patches, you may need to use additional flags:

```bash
git apply --ignore-whitespace --reject patches/your-patch-name.patch
```

## Creating New Patches

To create a new patch:

1. Make your changes in the codebase
2. Run `git diff > patches/your-patch-name.patch`
3. Add an entry to this README.md file
4. Commit the patch file along with the README update

## Note

Ensure patches are properly documented and follow the versioning conventions of the project.
