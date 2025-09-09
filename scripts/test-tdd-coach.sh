#!/bin/bash

# Test script to verify TDD Coach functionality
echo "🧪 Testing TDD Coach CLI functionality..."

# Check if TDD Coach CLI exists
if [ ! -f "packages/tdd-coach/dist/cli/tdd-coach.js" ]; then
    echo "❌ TDD Coach CLI not found. Building package..."
    cd packages/tdd-coach
    pnpm build
    cd ../..
fi

# Test basic CLI functionality
echo "🔍 Testing basic CLI commands..."

# Test help command
echo "Testing help command..."
cd packages/tdd-coach
node dist/cli/tdd-coach.js --help > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Help command works"
else
    echo "❌ Help command failed"
    exit 1
fi

# Test status command
echo "Testing status command..."
node dist/cli/tdd-coach.js status > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Status command works"
else
    echo "❌ Status command failed"
    exit 1
fi

# Test validate command help
echo "Testing validate command help..."
node dist/cli/tdd-coach.js validate --help > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Validate command help works"
else
    echo "❌ Validate command help failed"
    exit 1
fi

cd ../..

echo "🎉 All TDD Coach CLI tests passed!"
echo "🚀 TDD Coach is ready for use in your development workflow"
