#!/bin/bash
# TDD-compliant OrbStack utility functions
# Sept 2025 standards: Functions ≤40 lines, named exports, guard clauses

set -euo pipefail

# Validation functions with guard clauses
validate_docker_available() {
    command -v docker >/dev/null 2>&1 || {
        echo "ERROR: Docker not found. Install OrbStack first."
        return 1
    }
}

validate_docker_running() {
    docker info >/dev/null 2>&1 || {
        echo "ERROR: Docker daemon not running. Start OrbStack."
        return 1
    }
}

validate_orbstack_detected() {
    if docker version 2>/dev/null | grep -q "orbstack"; then
        echo "SUCCESS: OrbStack detected"
        return 0
    else
        echo "WARNING: OrbStack not detected"
        return 1
    fi
}

validate_compose_files() {
    local compose_dir="${1:-}"
    [[ -z "$compose_dir" ]] && { echo "ERROR: compose_dir required"; return 1; }

    local required_files=(
        "$compose_dir/docker-compose.dev.yml"
        "$compose_dir/.env.dev"
    )

    for file in "${required_files[@]}"; do
        [[ ! -f "$file" ]] && {
            echo "ERROR: Missing required file: $file"
            return 1
        }
    done

    echo "SUCCESS: All compose files present"
}

# Profile management functions
get_profile_flags() {
    local profiles="${1:-}"
    [[ -z "$profiles" ]] && { echo "ERROR: profiles required"; return 1; }

    local profile_flags=""
    IFS=',' read -ra profile_array <<< "$profiles"

    for profile in "${profile_array[@]}"; do
        # Validate profile name (alphanumeric, dash, underscore only)
        [[ ! "$profile" =~ ^[a-zA-Z0-9_-]+$ ]] && {
            echo "ERROR: Invalid profile name: $profile"
            return 1
        }
        profile_flags+="--profile $profile "
    done

    echo "$profile_flags"
}

# Docker compose operations
compose_config_test() {
    local compose_dir="${1:-}"
    local env_file="${2:-}"

    [[ -z "$compose_dir" || -z "$env_file" ]] && {
        echo "ERROR: compose_dir and env_file required"
        return 1
    }

    docker compose \
        --env-file "$env_file" \
        -f "$compose_dir/docker-compose.dev.yml" \
        -f "$compose_dir/orbstack.yml" \
        config >/dev/null 2>&1 || {
        echo "ERROR: Invalid compose configuration"
        return 1
    }

    echo "SUCCESS: Compose configuration valid"
}

compose_start_services() {
    local compose_dir="${1:-}"
    local env_file="${2:-}"
    local profile_flags="${3:-}"

    [[ -z "$compose_dir" || -z "$env_file" ]] && {
        echo "ERROR: compose_dir and env_file required"
        return 1
    }

    # shellcheck disable=SC2086
    docker compose \
        --env-file "$env_file" \
        -f "$compose_dir/docker-compose.dev.yml" \
        -f "$compose_dir/orbstack.yml" \
        $profile_flags \
        up --build -d
}

compose_stop_services() {
    local compose_dir="${1:-}"
    local env_file="${2:-}"

    [[ -z "$compose_dir" || -z "$env_file" ]] && {
        echo "ERROR: compose_dir and env_file required"
        return 1
    }

    docker compose \
        --env-file "$env_file" \
        -f "$compose_dir/docker-compose.dev.yml" \
        -f "$compose_dir/orbstack.yml" \
        down
}

# Export functions for testing
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    # Being sourced - export functions
    export -f validate_docker_available
    export -f validate_docker_running
    export -f validate_orbstack_detected
    export -f validate_compose_files
    export -f get_profile_flags
    export -f compose_config_test
    export -f compose_start_services
    export -f compose_stop_services
fi
