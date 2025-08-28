# Patches

This directory contains patch files used for applying specific fixes and enhancements to the codebase.

## Contents

- `memory-systems-enhancements.patch` - Contains enhancements for memory systems

## Usage

Patches can be applied using the `git apply` command:

```bash
git apply patches/memory-systems-enhancements.patch
```

For more complex patches, you may need to use additional flags:

```bash
git apply --ignore-whitespace --reject patches/memory-systems-enhancements.patch
```

## Creating New Patches

To create a new patch:

1. Make your changes in the codebase
2. Run `git diff > patches/your-patch-name.patch`
3. Add an entry to this README.md file
4. Commit the patch file along with the README update

## Note

Ensure patches are properly documented and follow the versioning conventions of the project.
