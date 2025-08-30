#!/bin/bash

# Script to verify the documentation structure for the RAG package enhancements

echo "Verifying RAG Package Documentation Structure"
echo "==========================================="

# Check if we're in the right directory
if [ ! -d "docs/plan" ]; then
  echo "Error: This script should be run from the packages/rag directory"
  exit 1
fi

# List all created documents
echo "Created Documents:"
echo "------------------"
echo "1. TDD Plan: docs/plan/qwen-tdd-plan.md"
echo "2. Enhancement Summary: docs/plan/enhancement-summary.md"
echo "3. Roadmap: docs/plan/roadmap.md"
echo "4. Technical Specification: docs/plan/technical-spec.md"
echo "5. Implementation Tracker: docs/plan/implementation-tracker.md"
echo "6. Setup Guide: docs/setup-guide.md"
echo "7. Requirements File: requirements.txt"
echo "8. Plan Summary: docs/plan/summary.md"

# Verify each document exists
echo ""
echo "Verification:"
echo "-------------"

documents=(
  "docs/plan/qwen-tdd-plan.md"
  "docs/plan/enhancement-summary.md"
  "docs/plan/roadmap.md"
  "docs/plan/technical-spec.md"
  "docs/plan/implementation-tracker.md"
  "docs/setup-guide.md"
  "requirements.txt"
  "docs/plan/summary.md"
)

all_present=true

for doc in "${documents[@]}"; do
  if [ -f "$doc" ]; then
    echo "✓ $doc"
  else
    echo "✗ $doc (MISSING)"
    all_present=false
  fi
done

# Final status
echo ""
if [ "$all_present" = true ]; then
  echo "✓ All documentation files are present"
  echo ""
  echo "Next steps:"
  echo "1. Review the TDD plan in docs/plan/qwen-tdd-plan.md"
  echo "2. Check the roadmap in docs/plan/roadmap.md"
  echo "3. Follow the setup guide in docs/setup-guide.md"
  echo "4. Begin implementation of Phase 1 components"
else
  echo "✗ Some documentation files are missing"
  exit 1
fi