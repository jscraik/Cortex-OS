# Migration Guide: packages/memories to memory-core

This guide outlines the steps to migrate from the legacy `packages/memories` to the new `packages/memory-core`.

## 1. Update Imports

Replace all imports from `@cortex-os/memories` with `@cortex-os/memory-core`.

## 2. Use the new MemoryProvider

The new `MemoryProvider` interface provides a simplified and unified API for all memory operations. Update your code to use this new provider.

## 3. Remove Legacy Code

Once all code has been migrated, you can safely remove the `packages/memories` directory.
