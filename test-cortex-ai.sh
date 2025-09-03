#!/bin/bash
cd /Users/jamiecraik/.Cortex-OS/packages/cortex-ai-github
echo "Running cortex-ai-github tests..."
npx vitest run --reporter=verbose 2>&1 | head -100
