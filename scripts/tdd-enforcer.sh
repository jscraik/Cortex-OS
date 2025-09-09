#!/bin/bash

# TDD Enforcer Script for brAInwav Development Workflow
# Ensures TDD practices are followed during development

echo "🚀 Starting TDD Enforcer for brAInwav Development"

# Check if TDD Coach is built
if [ ! -f "packages/tdd-coach/dist/cli/tdd-coach.js" ]; then
    echo "🏗️  Building TDD Coach package..."
    cd packages/tdd-coach
    pnpm build
    cd ../..
fi

# Show current TDD status
echo "📊 Current TDD Status:"
cd packages/tdd-coach
node dist/cli/tdd-coach.js status
cd ../..

# Function to validate specific files
validate_files() {
    local files=$1
    if [ -n "$files" ]; then
        echo "🔍 Validating files: $files"
        cd packages/tdd-coach
        node dist/cli/tdd-coach.js validate --files $files
        local result=$?
        cd ../..
        return $result
    fi
}

# Watch mode for continuous development
if [ "$1" = "--watch" ]; then
    echo "👀 Starting TDD Coach in watch mode..."
    echo "Press Ctrl+C to stop"
    cd packages/tdd-coach
    node dist/cli/tdd-coach.js validate --watch
    cd ../..
    exit 0
fi

# Validate changed files if any specified
if [ -n "$1" ]; then
    validate_files "$1"
    if [ $? -ne 0 ]; then
        echo "❌ TDD validation failed"
        exit 1
    else
        echo "✅ TDD validation passed"
    fi
fi

echo "🎯 TDD Enforcer completed"