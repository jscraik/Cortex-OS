#!/bin/bash

# Check if the file exists
if [ -f "packages/orchestration/tests/mlx-first-provider.unit.test.ts" ]; then
  # Create a backup
  cp packages/orchestration/tests/mlx-first-provider.unit.test.ts packages/orchestration/tests/mlx-first-provider.unit.test.ts.bak
  echo "Created backup at packages/orchestration/tests/mlx-first-provider.unit.test.ts.bak"

  # Replace the original with the new file
  mv packages/orchestration/tests/mlx-first-provider.unit.test.ts.new packages/orchestration/tests/mlx-first-provider.unit.test.ts
  echo "Replaced test file successfully"
else
  echo "Original test file does not exist"
fi
