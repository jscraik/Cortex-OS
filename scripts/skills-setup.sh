#!/usr/bin/env bash
#
# Skills System Setup and Validation Script
# brAInwav Cortex-OS Skills System
#
# Usage:
#   ./scripts/skills-setup.sh         # Setup and validate
#   ./scripts/skills-setup.sh check   # Just validate
#

set -euo pipefail

SKILLS_DIR="${SKILLS_DIR:-./skills}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate skill file frontmatter
validate_skill_frontmatter() {
    local skill_file="$1"
    local errors=0

    log_info "Validating: $(basename "$skill_file")"

    # Extract frontmatter
    if ! grep -q "^---$" "$skill_file"; then
        log_error "Missing YAML frontmatter"
        return 1
    fi

    # Required fields
    local required_fields=(
        "id"
        "name"
        "description"
        "version"
        "author"
        "category"
        "tags"
        "difficulty"
        "estimatedTokens"
    )

    for field in "${required_fields[@]}"; do
        if ! grep -q "^${field}:" "$skill_file"; then
            log_error "Missing required field: ${field}"
            ((errors++))
        fi
    done

    # Validate ID format
    if grep -q "^id:" "$skill_file"; then
        local id=$(grep "^id:" "$skill_file" | head -1 | sed 's/id: *//' | tr -d '"' | tr -d "'")
        if ! echo "$id" | grep -qE "^skill-[a-z0-9-]+$"; then
            log_error "Invalid ID format: ${id} (must be skill-kebab-case)"
            ((errors++))
        fi
    fi

    # Validate version format
    if grep -q "^version:" "$skill_file"; then
        local version=$(grep "^version:" "$skill_file" | head -1 | sed 's/version: *//' | tr -d '"' | tr -d "'")
        if ! echo "$version" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+$"; then
            log_error "Invalid version format: ${version} (must be semver)"
            ((errors++))
        fi
    fi

    # Validate category
    local valid_categories=(
        "coding"
        "communication"
        "security"
        "analysis"
        "automation"
        "integration"
        "testing"
        "documentation"
        "other"
    )

    if grep -q "^category:" "$skill_file"; then
        local category=$(grep "^category:" "$skill_file" | head -1 | sed 's/category: *//' | tr -d '"' | tr -d "'")
        local valid=false
        for valid_cat in "${valid_categories[@]}"; do
            if [ "$category" = "$valid_cat" ]; then
                valid=true
                break
            fi
        done
        if [ "$valid" = false ]; then
            log_error "Invalid category: ${category}"
            ((errors++))
        fi
    fi

    # Validate difficulty
    local valid_difficulties=("beginner" "intermediate" "advanced" "expert")
    if grep -q "^difficulty:" "$skill_file"; then
        local difficulty=$(grep "^difficulty:" "$skill_file" | head -1 | sed 's/difficulty: *//' | tr -d '"' | tr -d "'")
        local valid=false
        for valid_diff in "${valid_difficulties[@]}"; do
            if [ "$difficulty" = "$valid_diff" ]; then
                valid=true
                break
            fi
        done
        if [ "$valid" = false ]; then
            log_error "Invalid difficulty: ${difficulty}"
            ((errors++))
        fi
    fi

    # Check content length
    local content_lines=$(grep -c ^ "$skill_file" || true)
    if [ "$content_lines" -lt 20 ]; then
        log_warning "Skill content seems short (${content_lines} lines)"
    fi

    # Check for required sections
    local required_sections=(
        "## When to Use"
        "## How to Apply"
        "## Success Criteria"
    )

    for section in "${required_sections[@]}"; do
        if ! grep -q "^${section}" "$skill_file"; then
            log_warning "Missing recommended section: ${section}"
        fi
    done

    if [ $errors -eq 0 ]; then
        log_success "Validation passed"
        return 0
    else
        log_error "Validation failed with ${errors} errors"
        return 1
    fi
}

# Setup skills directory structure
setup_skills_directory() {
    log_info "Setting up skills directory structure..."

    # Create main directory
    if [ ! -d "$SKILLS_DIR" ]; then
        mkdir -p "$SKILLS_DIR"
        log_success "Created ${SKILLS_DIR}"
    fi

    # Create category directories
    local categories=(
        "coding"
        "security"
        "testing"
        "documentation"
        "automation"
        "communication"
        "analysis"
        "integration"
        "examples"
    )

    for category in "${categories[@]}"; do
        local cat_dir="${SKILLS_DIR}/${category}"
        if [ ! -d "$cat_dir" ]; then
            mkdir -p "$cat_dir"
            log_success "Created ${cat_dir}"
        fi
    done

    # Check for README
    if [ ! -f "${SKILLS_DIR}/README.md" ]; then
        log_warning "Missing ${SKILLS_DIR}/README.md - create from template"
    else
        log_success "README.md exists"
    fi
}

# Validate all skills
validate_all_skills() {
    log_info "Validating all skills in ${SKILLS_DIR}..."

    local total=0
    local passed=0
    local failed=0

    while IFS= read -r -d '' skill_file; do
        ((total++))
        if validate_skill_frontmatter "$skill_file"; then
            ((passed++))
        else
            ((failed++))
        fi
        echo ""  # Blank line between validations
    done < <(find "$SKILLS_DIR" -name "skill-*.md" -type f -print0)

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Validation Summary:"
    echo "  Total skills: ${total}"
    log_success "Passed: ${passed}"
    if [ $failed -gt 0 ]; then
        log_error "Failed: ${failed}"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ $failed -gt 0 ]; then
        return 1
    fi
    return 0
}

# Main execution
main() {
    local mode="${1:-setup}"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " brAInwav Skills System Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd "$PROJECT_ROOT"

    if [ "$mode" = "check" ]; then
        validate_all_skills
    else
        setup_skills_directory
        echo ""
        validate_all_skills
    fi

    echo ""
    log_info "Skills directory: ${SKILLS_DIR}"
    log_info "Total skills: $(find "$SKILLS_DIR" -name "skill-*.md" -type f | wc -l | tr -d ' ')"
    echo ""
}

# Run main
main "$@"
