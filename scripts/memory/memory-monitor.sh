#!/bin/bash
# Proactive memory monitoring and cleanup script

MEMORY_THRESHOLD_MB=1000  # Kill Node processes using more than 1GB
MAX_NODE_PROCESSES=8      # Maximum allowed Node processes

monitor_memory() {
    echo "=== Memory Monitor Check $(date) ==="

    # Get current memory stats
    total_mem=$(sysctl -n hw.memsize | awk '{printf "%.0f", $1/1024/1024}')
    available_mem=$(vm_stat | grep "Pages free" | sed 's/[^0-9]//g' | awk '{printf "%.0f", $1 * 16384 / 1024 / 1024}')

    echo "Total memory: ${total_mem}MB"
    echo "Available memory: ${available_mem}MB"

    # Count Node processes
    node_count=$(pgrep node | wc -l)
    echo "Current Node processes: $node_count"

    if [ "$node_count" -gt $MAX_NODE_PROCESSES ]; then
        echo "⚠️  Too many Node processes ($node_count > $MAX_NODE_PROCESSES)"

        # Kill high-memory Node processes
        echo "Killing high-memory Node processes..."
        ps aux | awk -v threshold=$MEMORY_THRESHOLD_MB '
        /node/ && $6 > threshold*1024 {
            printf "Killing PID %s using %d MB\n", $2, int($6/1024)
            system("kill -15 " $2)
        }'

        sleep 3

        # Force kill if still too many
        new_count=$(pgrep node | wc -l)
        if [ "$new_count" -gt $MAX_NODE_PROCESSES ]; then
            echo "Force killing remaining excess processes..."
            pgrep node | tail -n +$((MAX_NODE_PROCESSES+1)) | xargs kill -9 2>/dev/null
        fi
    fi

    # Check for memory-hungry TypeScript servers
    ts_memory=$(ps aux | awk '/tsserver.js/ {sum += $6} END {print int(sum/1024)}')
    if [ "${ts_memory:-0}" -gt 2000 ]; then
        echo "⚠️  TypeScript servers using ${ts_memory}MB, restarting..."
        pkill -f "tsserver.js"
    fi

    # Check for runaway Vitest processes
    vitest_count=$(ps aux | grep -E "node.*vitest" | grep -v grep | wc -l | tr -d ' ')
    vitest_memory=$(ps aux | awk '/vitest/ && !/grep/ {sum += $6} END {print int(sum/1024)}')

    if [ "$vitest_count" -gt 3 ]; then
        echo "⚠️  Too many Vitest processes ($vitest_count), killing excess..."
        pkill -f "node.*vitest"
    elif [ "${vitest_memory:-0}" -gt 1500 ]; then
        echo "⚠️  Vitest processes using ${vitest_memory}MB, restarting..."
        pkill -f "vitest"
    fi

    # Check for long-running gitleaks processes
    gitleaks_count=$(ps aux | grep -E "gitleaks" | grep -v grep | wc -l | tr -d ' ')
    if [ "$gitleaks_count" -gt 0 ]; then
        gitleaks_runtime=$(ps aux | awk '/gitleaks/ && !/grep/ {print $10}' | head -1)
        echo "⚠️  Found $gitleaks_count gitleaks processes (runtime: $gitleaks_runtime)"
        # Kill if running more than 10 minutes
        ps aux | awk '/gitleaks/ && !/grep/ && $10 > "10:00" {system("kill " $2)}'
    fi

    # VS Code monitoring DISABLED to prevent instability
    vscode_memory=$(ps aux | grep "Code Helper\|Visual Studio Code" | grep -v grep | awk '{sum += $6} END {print int(sum/1024)}')
    if [ "${vscode_memory:-0}" -gt 0 ]; then
        echo "VS Code using ${vscode_memory}MB (monitoring only, no optimization)"
    fi

    echo "=== Memory Monitor Complete ==="
}

# If called with 'daemon' argument, run continuously
if [ "$1" = "daemon" ]; then
    echo "Starting memory monitor daemon..."
    while true; do
        monitor_memory
        sleep 60  # Check every minute
    done
else
    monitor_memory
fi
