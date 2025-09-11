#!/bin/bash
set -euo pipefail

# OrbStack Volume Backup and Restore Utility
# Manages backup and restoration of development environment data

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Ensure backup directory exists
ensure_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# Get timestamp for backup naming
get_timestamp() {
    date +"%Y%m%d_%H%M%S"
}

# List all OrbStack volumes
list_volumes() {
    docker volume ls --format "table {{.Name}}\t{{.Driver}}\t{{.Labels}}" | \
        grep -E "(cortex|orbstack)" || true
}

# Get volume size estimation
get_volume_size() {
    local volume_name="$1"

    # Create a temporary container to inspect volume
    local size=$(docker run --rm -v "$volume_name:/data:ro" alpine:latest \
        sh -c "du -sh /data 2>/dev/null | cut -f1" 2>/dev/null || echo "unknown")

    echo "$size"
}

# Backup a single volume
backup_volume() {
    local volume_name="$1"
    local backup_name="${2:-$(get_timestamp)_${volume_name}}"
    local backup_file="$BACKUP_DIR/${backup_name}.tar.gz"

    log_info "Backing up volume: $volume_name"

    # Get volume size for progress indication
    local volume_size=$(get_volume_size "$volume_name")
    log_info "Estimated volume size: $volume_size"

    # Create backup using a temporary container
    if docker run --rm \
        -v "$volume_name:/data:ro" \
        -v "$BACKUP_DIR:/backup" \
        alpine:latest \
        sh -c "cd /data && tar czf /backup/${backup_name}.tar.gz . 2>/dev/null || tar czf /backup/${backup_name}.tar.gz --warning=no-file-changed . || true"; then

        local backup_size=$(du -sh "$backup_file" | cut -f1)
        log_success "Volume '$volume_name' backed up successfully"
        log_info "Backup size: $backup_size"
        log_info "Backup location: $backup_file"

        return 0
    else
        log_error "Failed to backup volume: $volume_name"
        return 1
    fi
}

# Restore a single volume
restore_volume() {
    local backup_file="$1"
    local volume_name="$2"

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_info "Restoring volume: $volume_name"
    log_info "From backup: $backup_file"

    # Create volume if it doesn't exist
    if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
        docker volume create "$volume_name"
        log_info "Created new volume: $volume_name"
    else
        log_warning "Volume '$volume_name' already exists - data will be overwritten"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Restore cancelled"
            return 0
        fi
    fi

    # Restore backup using a temporary container
    if docker run --rm \
        -v "$volume_name:/data" \
        -v "$backup_file:/backup.tar.gz:ro" \
        alpine:latest \
        sh -c "cd /data && rm -rf ./* 2>/dev/null || true && tar xzf /backup.tar.gz"; then

        log_success "Volume '$volume_name' restored successfully"
        return 0
    else
        log_error "Failed to restore volume: $volume_name"
        return 1
    fi
}

# Backup all OrbStack-related volumes
backup_all_volumes() {
    local timestamp=$(get_timestamp)
    local backup_manifest="$BACKUP_DIR/manifest_$timestamp.txt"

    log_section "Backing up all OrbStack volumes"

    # Create manifest file
    echo "# OrbStack Volume Backup Manifest" > "$backup_manifest"
    echo "# Created: $(date)" >> "$backup_manifest"
    echo "# Project: Cortex-OS" >> "$backup_manifest"
    echo "" >> "$backup_manifest"

    local volumes=$(docker volume ls --format "{{.Name}}" | grep -E "(cortex|orbstack|nats)" || true)
    local backup_count=0
    local total_volumes=$(echo "$volumes" | wc -l)

    if [[ -z "$volumes" ]]; then
        log_warning "No OrbStack-related volumes found"
        return 0
    fi

    log_info "Found $total_volumes volumes to backup"

    for volume in $volumes; do
        ((backup_count++))
        log_info "[$backup_count/$total_volumes] Processing volume: $volume"

        if backup_volume "$volume" "${timestamp}_${volume}"; then
            echo "$volume,${timestamp}_${volume}.tar.gz,$(date),success" >> "$backup_manifest"
        else
            echo "$volume,${timestamp}_${volume}.tar.gz,$(date),failed" >> "$backup_manifest"
        fi
    done

    log_success "Backup completed. Manifest: $backup_manifest"
    log_info "Total backups created: $backup_count"

    # Show backup directory size
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    log_info "Total backup directory size: $total_size"
}

# List available backups
list_backups() {
    log_section "Available Backups"

    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        log_info "No backups found in $BACKUP_DIR"
        return 0
    fi

    echo "Backup files:"
    echo "============="

    # List backup files with details
    find "$BACKUP_DIR" -name "*.tar.gz" -type f | sort | while read -r backup_file; do
        local filename=$(basename "$backup_file")
        local filesize=$(du -sh "$backup_file" | cut -f1)
        local timestamp=$(stat -c "%Y" "$backup_file" 2>/dev/null || stat -f "%m" "$backup_file" 2>/dev/null || echo "0")
        local date_str=$(date -d "@$timestamp" 2>/dev/null || date -r "$timestamp" 2>/dev/null || echo "unknown")

        printf "%-40s %8s %s\n" "$filename" "$filesize" "$date_str"
    done

    echo
    echo "Manifest files:"
    echo "==============="

    # List manifest files
    find "$BACKUP_DIR" -name "manifest_*.txt" -type f | sort | while read -r manifest_file; do
        local filename=$(basename "$manifest_file")
        local line_count=$(wc -l < "$manifest_file")

        printf "%-40s %d volumes\n" "$filename" "$((line_count - 4))"
    done
}

# Restore from manifest
restore_from_manifest() {
    local manifest_file="$1"

    if [[ ! -f "$manifest_file" ]]; then
        log_error "Manifest file not found: $manifest_file"
        return 1
    fi

    log_section "Restoring from manifest"
    log_info "Manifest: $manifest_file"

    # Parse manifest and restore volumes
    local restore_count=0
    local failed_count=0

    while IFS=',' read -r volume_name backup_file date_str status; do
        # Skip comments and empty lines
        if [[ "$volume_name" =~ ^#.*$ ]] || [[ -z "$volume_name" ]]; then
            continue
        fi

        if [[ "$status" == "success" ]]; then
            local full_backup_path="$BACKUP_DIR/$backup_file"

            if restore_volume "$full_backup_path" "$volume_name"; then
                ((restore_count++))
            else
                ((failed_count++))
            fi
        else
            log_warning "Skipping failed backup: $volume_name"
        fi
    done < "$manifest_file"

    log_success "Restore completed"
    log_info "Volumes restored: $restore_count"
    if [[ $failed_count -gt 0 ]]; then
        log_warning "Failed restores: $failed_count"
    fi
}

# Clean old backups
cleanup_backups() {
    local keep_days="${1:-7}"

    log_section "Cleaning up old backups"
    log_info "Keeping backups newer than $keep_days days"

    local deleted_count=0
    local total_size_freed=0

    # Find and delete old backup files
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$keep_days | while read -r old_file; do
        local filesize=$(du -b "$old_file" | cut -f1)
        rm "$old_file"
        log_info "Deleted: $(basename "$old_file")"
        ((deleted_count++))
        ((total_size_freed += filesize))
    done

    # Clean up old manifest files
    find "$BACKUP_DIR" -name "manifest_*.txt" -type f -mtime +$keep_days -delete

    log_success "Cleanup completed"
    log_info "Files deleted: $deleted_count"
    if [[ $total_size_freed -gt 0 ]]; then
        local size_freed_mb=$((total_size_freed / 1024 / 1024))
        log_info "Space freed: ${size_freed_mb}MB"
    fi
}

# Create automated backup script
setup_automated_backup() {
    local interval="${1:-daily}"
    local keep_days="${2:-7}"

    log_section "Setting up automated backups"

    local script_content="#!/bin/bash
# Automated OrbStack backup script
# Generated by orbstack-backup.sh

export BACKUP_DIR=\"$BACKUP_DIR\"

# Run backup
\"$SCRIPT_DIR/orbstack-backup.sh\" backup-all

# Clean old backups
\"$SCRIPT_DIR/orbstack-backup.sh\" cleanup $keep_days

echo \"Automated backup completed at \$(date)\"
"

    local auto_script="$SCRIPT_DIR/auto-backup.sh"
    echo "$script_content" > "$auto_script"
    chmod +x "$auto_script"

    log_success "Automated backup script created: $auto_script"
    log_info "To set up cron job, run:"

    case "$interval" in
        "hourly")
            echo "  echo '0 * * * * $auto_script' | crontab -"
            ;;
        "daily")
            echo "  echo '0 2 * * * $auto_script' | crontab -"
            ;;
        "weekly")
            echo "  echo '0 2 * * 0 $auto_script' | crontab -"
            ;;
        *)
            echo "  # Custom cron expression for $interval"
            echo "  echo '$interval $auto_script' | crontab -"
            ;;
    esac
}

# Show help
show_help() {
    cat << EOF
OrbStack Volume Backup and Restore Utility

Usage: $0 <command> [options]

Commands:
  backup <volume>         Backup a specific volume
  backup-all             Backup all OrbStack-related volumes
  restore <backup> <vol>  Restore volume from backup file
  restore-manifest <file> Restore all volumes from manifest file
  list                   List available backups
  list-volumes           List all OrbStack volumes
  cleanup [days]         Clean up backups older than N days (default: 7)
  setup-auto [interval]  Setup automated backups (daily/weekly/hourly)
  help                   Show this help message

Environment Variables:
  BACKUP_DIR            Directory for backups (default: ./backups)

Examples:
  $0 backup-all                           # Backup all volumes
  $0 backup cortex_data                   # Backup specific volume
  $0 restore backup.tar.gz my_volume     # Restore volume
  $0 restore-manifest manifest.txt       # Restore from manifest
  $0 cleanup 14                          # Keep 14 days of backups
  $0 setup-auto daily                    # Setup daily automated backups

Backup Directory: $BACKUP_DIR
EOF
}

# Main command handler
main() {
    ensure_backup_dir

    case "${1:-help}" in
        "backup")
            if [[ -z "${2:-}" ]]; then
                log_error "Please specify a volume name"
                echo "Use '$0 list-volumes' to see available volumes"
                exit 1
            fi
            backup_volume "$2" "${3:-}"
            ;;
        "backup-all")
            backup_all_volumes
            ;;
        "restore")
            if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
                log_error "Please specify backup file and target volume name"
                echo "Usage: $0 restore <backup_file> <volume_name>"
                exit 1
            fi
            restore_volume "$2" "$3"
            ;;
        "restore-manifest")
            if [[ -z "${2:-}" ]]; then
                log_error "Please specify manifest file"
                exit 1
            fi
            restore_from_manifest "$2"
            ;;
        "list")
            list_backups
            ;;
        "list-volumes")
            log_section "OrbStack Volumes"
            list_volumes
            ;;
        "cleanup")
            cleanup_backups "${2:-7}"
            ;;
        "setup-auto")
            setup_automated_backup "${2:-daily}" "${3:-7}"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
