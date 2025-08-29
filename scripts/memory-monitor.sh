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
    
    # Check VS Code memory usage
    vscode_memory=$(ps aux | grep "Code Helper\|Visual Studio Code" | grep -v grep | awk '{sum += $6} END {print int(sum/1024)}')
    if [ "${vscode_memory:-0}" -gt 3000 ]; then
        echo "⚠️  VS Code using ${vscode_memory}MB, optimizing..."
        if [ -x "/Users/jamiecraik/.Cortex-OS-clean/scripts/vscode-memory-optimizer.sh" ]; then
            bash /Users/jamiecraik/.Cortex-OS-clean/scripts/vscode-memory-optimizer.sh gentle
        fi
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