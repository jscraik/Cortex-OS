#!/bin/bash
# Progress Update Script for TDD Implementation
# Automates coverage reporting and progress tracking

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Cortex-WebUI TDD Progress Update${NC}"
echo "========================================"
echo ""

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKS_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$TASKS_DIR")"

# Coverage metrics
echo -e "${YELLOW}📈 Updating Coverage Metrics...${NC}"

# Run tests and generate coverage
cd "$ROOT_DIR"
echo "Running coverage report..."

# Try to get coverage metrics
COVERAGE_OUTPUT=""
if command -v pnpm &> /dev/null; then
    if [ -f "package.json" ] && grep -q "test:coverage" package.json; then
        COVERAGE_OUTPUT=$(pnpm test:coverage 2>&1 || echo "ERROR: Coverage command failed")
    fi
fi

# Extract coverage numbers
LINE_COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep -oE 'Lines\s*:\s*[0-9.]+%' | grep -oE '[0-9.]+' | head -1 || echo "0")
BRANCH_COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep -oE 'Branches\s*:\s*[0-9.]+%' | grep -oE '[0-9.]+' | head -1 || echo "0")
FUNCTION_COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep -oE 'Functions\s*:\s*[0-9.]+%' | grep -oE '[0-9.]+' | head -1 || echo "0")

# Update progress tracker
echo -e "${BLUE}📝 Updating Progress Tracker...${NC}"

PROGRESS_FILE="$TASKS_DIR/04-PROGRESS-TRACKER.md"

# Create backup
cp "$PROGRESS_FILE" "$PROGRESS_FILE.backup"

# Update coverage metrics
sed -i '' "s/| Line Coverage | .*% |/| Line Coverage | ${LINE_COVERAGE}% |/g" "$PROGRESS_FILE"
sed -i '' "s/| Branch Coverage | .*% |/| Branch Coverage | ${BRANCH_COVERAGE}% |/g" "$PROGRESS_FILE"
sed -i '' "s/| Function Coverage | .*% |/| Function Coverage | ${FUNCTION_COVERAGE}% |/g" "$PROGRESS_FILE"

# Update status based on coverage
if (( $(echo "$LINE_COVERAGE >= 95" | bc -l) )); then
    sed -i '' 's/| Line Coverage | .* | .* | .* |/| Line Coverage | '"$LINE_COVERAGE"'% | ≥95% | ✅ Target Met | ✅ |/g' "$PROGRESS_FILE"
elif (( $(echo "$LINE_COVERAGE >= 65" | bc -l) )); then
    sed -i '' 's/| Line Coverage | .* | .* | .* |/| Line Coverage | '"$LINE_COVERAGE"'% | ≥95% | 🟡 Progress | 📈 |/g' "$PROGRESS_FILE"
else
    sed -i '' 's/| Line Coverage | .* | .* | .* |/| Line Coverage | '"$LINE_COVERAGE"'% | ≥95% | 🔴 Critical Gap | ⚠️ |/g' "$PROGRESS_FILE"
fi

if (( $(echo "$BRANCH_COVERAGE >= 95" | bc -l) )); then
    sed -i '' 's/| Branch Coverage | .* | .* | .* |/| Branch Coverage | '"$BRANCH_COVERAGE"'% | ≥95% | ✅ Target Met | ✅ |/g' "$PROGRESS_FILE"
elif (( $(echo "$BRANCH_COVERAGE >= 65" | bc -l) )); then
    sed -i '' 's/| Branch Coverage | .* | .* | .* |/| Branch Coverage | '"$BRANCH_COVERAGE"'% | ≥95% | 🟡 Progress | 📈 |/g' "$PROGRESS_FILE"
else
    sed -i '' 's/| Branch Coverage | .* | .* | .* |/| Branch Coverage | '"$BRANCH_COVERAGE"'% | ≥95% | 🔴 Below Target | ⚠️ |/g' "$PROGRESS_FILE"
fi

# Update last modified date
sed -i '' "s/Last Updated: .*/Last Updated: $(date '+%Y-%m-%d')/" "$PROGRESS_FILE"

# Count test files
TEST_COUNT=$(find . -name "*.test.ts" -not -path "./node_modules/*" | wc -l | tr -d ' ')
echo "Found $TEST_COUNT test files"

# Calculate overall progress percentage
# Simple formula: (line_coverage / 95) * 100
OVERALL_PROGRESS=$(echo "scale=0; ($LINE_COVERAGE / 95) * 100" | bc -l 2>/dev/null || echo "0")

# Update progress bar
PROGRESS_BAR=""
FILLED=$(echo "scale=0; $OVERALL_PROGRESS / 5" | bc -l)
for ((i=0; i<20; i++)); do
    if (( i < FILLED )); then
        PROGRESS_BAR+="█"
    else
        PROGRESS_BAR+="░"
    fi
done

# Update overall progress section
sed -i '' "s/\[.*\] .* Complete/[$PROGRESS_BAR] ${OVERALL_PROGRESS}% Complete/g" "$PROGRESS_FILE"

# Get mutation score if available
MUTATION_SCORE=""
if [ -f "out/mutation.json" ]; then
    MUTATION_SCORE=$(cat out/mutation.json | grep -oE '"mutationScore":[0-9.]+' | grep -oE '[0-9.]+' | head -1 || echo "")
fi

if [ -n "$MUTATION_SCORE" ]; then
    sed -i '' "s/| Mutation Score | .*% |/| Mutation Score | ${MUTATION_SCORE}% |/g" "$PROGRESS_FILE"
fi

# Generate summary report
echo ""
echo -e "${GREEN}✅ Progress Update Complete!${NC}"
echo ""
echo "📊 Current Metrics:"
echo "  • Line Coverage: ${LINE_COVERAGE}%"
echo "  • Branch Coverage: ${BRANCH_COVERAGE}%"
echo "  • Function Coverage: ${FUNCTION_COVERAGE}%"
echo "  • Test Files: $TEST_COUNT"
echo "  • Overall Progress: ${OVERALL_PROGRESS}%"
echo ""

# Create daily log entry
LOG_FILE="$TASKS_DIR/progress-log.md"
echo "## $(date '+%Y-%m-%d') - Progress Update" >> "$LOG_FILE"
echo "- Line Coverage: ${LINE_COVERAGE}%" >> "$LOG_FILE"
echo "- Branch Coverage: ${BRANCH_COVERAGE}%" >> "$LOG_FILE"
echo "- Test Files: $TEST_COUNT" >> "$LOG_FILE"
echo "- Overall Progress: ${OVERALL_PROGRESS}%" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Keep only last 30 days of logs
tail -n 900 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

# Show next actions
echo -e "${YELLOW}🎯 Next Actions:${NC}"
echo "1. Review coverage report: open coverage/lcov-report/index.html"
echo "2. Focus on files with <50% coverage"
echo "3. Write tests for critical paths first"
echo "4. Update task completion in master checklist"
echo ""

# Check if we hit any milestones
if (( $(echo "$LINE_COVERAGE >= 50" | bc -l) )) && (( $(echo "$LINE_COVERAGE < 55" | bc -l) )); then
    echo -e "${GREEN}🎉 Milestone Reached: 50% Line Coverage!${NC}"
fi

if (( $(echo "$LINE_COVERAGE >= 75" | bc -l) )) && (( $(echo "$LINE_COVERAGE < 80" | bc -l) )); then
    echo -e "${GREEN}🎉 Milestone Reached: 75% Line Coverage!${NC}"
fi

if (( $(echo "$LINE_COVERAGE >= 90" | bc -l) )) && (( $(echo "$LINE_COVERAGE < 95" | bc -l) )); then
    echo -e "${GREEN}🎉 Milestone Reached: 90% Line Coverage!${NC}"
fi

if (( $(echo "$LINE_COVERAGE >= 95" | bc -l) )); then
    echo -e "${GREEN}🏆 ACHIEVEMENT UNLOCKED: 95% Coverage Target Met!${NC}"
    echo ""
    echo "🎊 Congratulations! You've achieved the coverage target!"
    echo "   • Run full quality gate check: pnpm quality:check"
    echo "   • Prepare for production deployment"
fi

echo ""
echo -e "${BLUE}💾 Progress saved to:${NC}"
echo "  • Progress Tracker: $PROGRESS_FILE"
echo "  • Daily Log: $LOG_FILE"
echo ""
echo -e "${GREEN}Done! 🚀${NC}"