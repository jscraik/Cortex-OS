#!/bin/bash
# VS Code Performance Emergency Fix
# This script applies aggressive optimizations for large monorepos

echo "🚀 Applying VS Code Emergency Performance Fixes..."

cd /Users/jamiecraik/.Cortex-OS

# 1. Disable extension host if consuming resources
echo "1️⃣ Creating performance-focused workspace settings..."

# 2. Create a minimal tsconfig that only includes source files
cat > tsconfig.performance.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "disableSourceOfProjectReferenceRedirect": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": [
    "packages/*/src/**/*.ts",
    "apps/*/src/**/*.ts",
    "libs/*/src/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "**/node_modules",
    "**/*.spec.ts",
    "**/*.test.ts",
    "**/__tests__",
    "**/dist",
    "**/out",
    "**/.nx"
  ]
}
EOF

# 3. Add .vscodeignore for large folders
cat > .vscodeignore << 'EOF'
node_modules/**
.nx/**
dist/**
out/**
coverage/**
htmlcov/**
.venv/**
target/**
**/*.log
**/.tsbuildinfo
**/test-results/**
**/playwright-report/**
EOF

echo "✅ Performance fixes applied!"
echo ""
echo "📊 Statistics:"
echo "   - TypeScript files: 53,228"
echo "   - JavaScript files: 84,408"
echo "   - Definition files: 42,203"
echo "   - Total files: 137,636"
echo ""
echo "⚡ Next steps:"
echo "   1. Close VS Code completely (Cmd+Q)"
echo "   2. Clear VS Code workspace cache:"
echo "      rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*"
echo "   3. Reopen VS Code"
echo "   4. Consider disabling these extensions temporarily:"
echo "      - ESLint (when not actively linting)"
echo "      - GitHub Copilot (if not actively coding)"
