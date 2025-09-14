---
title: Contributor Setup
sidebar_label: Contributor Setup
---

# Contributor / Developer Setup

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/Cortex-OS/Cortex-OS.git
   pnpm install
   ```

2. Build and test the package:

   ```sh
   pnpm build packages/mcp-core
   pnpm test packages/mcp-core
   ```

3. Follow the [CONTRIBUTING](../../CONTRIBUTING.md) guidelines for commit style.
