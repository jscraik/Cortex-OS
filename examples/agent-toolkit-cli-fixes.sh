#!/bin/bash

# Agent-Toolkit CLI Fix Examples
# This script demonstrates how to use agent-toolkit from the command line

set -e

echo "🔧 Agent-Toolkit CLI Diagnostic Fixes"
echo "=====================================\n"

# 1. First, ensure the agent-toolkit is built
echo "1. Building agent-toolkit..."
cd packages/agent-toolkit
pnpm build
cd ../..

# 2. Run diagnostics analysis
echo "2. Running diagnostic analysis..."
npx agent-toolkit diagnostics analyze \
  --include "packages/agent-toolkit" \
  --severity "error" \
  --format "json" \
  --output "diagnostics-report.json"

# 3. Apply semgrep fixes for common patterns
echo "3. Applying semgrep fixes..."
npx agent-toolkit semgrep fix \
  --pattern "createId(" \
  --fix "import { createId } from '@cortex-os/a2a-core';" \
  --files "apps/api/src/**/*.ts"

npx agent-toolkit semgrep fix \
  --pattern "export default" \
  --fix "export const" \
  --files "packages/agent-toolkit/src/**/*.ts"

# 4. Use codemod for structural changes
echo "4. Applying codemod transformations..."
npx agent-toolkit codemod apply \
  --rule "fix-promise-chains" \
  --find ":[expr].then(:[result] => :[body])" \
  --replace "const :[result] = await :[expr];\n:[body]" \
  --files "apps/**/*.ts"

# 5. Clean up unused imports
echo "5. Cleaning up unused imports..."
npx agent-toolkit cleanup imports \
  --files "packages/agent-toolkit/src/index.ts" \
  --remove-unused \
  --sort

# 6. Validate the fixes
echo "6. Validating fixes..."
npx agent-toolkit validate \
  --targets "packages/agent-toolkit" \
  --checks "typescript,imports,exports"

# 7. Run type checking
echo "7. Running type checking..."
cd packages/agent-toolkit
npx tsc --noEmit
cd ../..

echo "\n✅ Agent-Toolkit CLI fixes complete!"
echo "\n📊 Summary:"
echo "- Applied semgrep patterns for missing imports"
echo "- Fixed default exports"
echo "- Converted promise chains to async/await"
echo "- Cleaned up unused imports"
echo "- Validated all changes"