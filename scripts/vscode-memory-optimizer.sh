#!/bin/bash
# VS Code Memory Optimizer - Intelligently manages Code Helper processes

VSCODE_MEMORY_THRESHOLD=800  # MB threshold for individual Code Helper processes
MAX_CODE_HELPERS=3           # Maximum number of Code Helper processes to keep

optimize_vscode_memory() {
    echo "=== VS Code Memory Optimizer $(date) ==="
    
    # Get all Code Helper processes with their memory usage
    code_helpers=$(ps aux | grep "Code Helper" | grep -v grep | sort -k6 -nr)
    
    if [ -z "$code_helpers" ]; then
        echo "No Code Helper processes found"
        return 0
    fi
    
    echo "Current Code Helper processes:"
    echo "$code_helpers" | while IFS= read -r line; do
        pid=$(echo "$line" | awk '{print $2}')
        mem_kb=$(echo "$line" | awk '{print $6}')
        mem_mb=$((mem_kb / 1024))
        process_name=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
        echo "  PID $pid: ${mem_mb}MB - $process_name"
    done
    
    # Count total Code Helper processes
    helper_count=$(echo "$code_helpers" | wc -l)
    echo "Total Code Helper processes: $helper_count"
    
    # Kill high-memory Code Helper processes first
    echo "Checking for high-memory processes (>${VSCODE_MEMORY_THRESHOLD}MB)..."
    threshold_kb=$((VSCODE_MEMORY_THRESHOLD * 1024))
    
    # Process each line and kill high-memory non-essential processes
    while IFS= read -r line; do
        if [ -z "$line" ]; then continue; fi
        
        pid=$(echo "$line" | awk '{print $2}')
        mem_kb=$(echo "$line" | awk '{print $6}')
        mem_mb=$((mem_kb / 1024))
        process_name=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i}')
        
        if [ "$mem_kb" -gt "$threshold_kb" ]; then
            # Don't kill essential processes
            if echo "$process_name" | grep -q "typescript\|pylance\|eslint"; then
                echo "  Keeping essential process PID $pid (${mem_mb}MB): TypeScript/ESLint/Pylance"
            else
                echo "  Killing high-memory PID $pid (${mem_mb}MB)"
                kill -15 "$pid" 2>/dev/null || echo "    Failed to kill $pid"
            fi
        fi
    done <<< "$code_helpers"
    
    sleep 3  # Allow graceful shutdown
    
    # If still too many processes, kill oldest non-essential ones
    remaining_helpers=$(ps aux | grep "Code Helper" | grep -v grep | wc -l)
    if [ "$remaining_helpers" -gt "$MAX_CODE_HELPERS" ]; then
        echo "Still too many Code Helper processes ($remaining_helpers > $MAX_CODE_HELPERS)"
        echo "Killing oldest non-essential processes..."
        
        # Get non-essential Code Helper PIDs, sorted by start time (oldest first)
        excess_count=$((remaining_helpers - MAX_CODE_HELPERS))
        ps -eo pid,etime,command | grep "Code Helper" | grep -v grep | \
        grep -v "typescript\|pylance\|eslint" | \
        sort -k2 | \
        head -n "$excess_count" | \
        awk '{print $1}' | \
        while IFS= read -r pid; do
            if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
                echo "  Killing oldest non-essential PID $pid"
                kill -15 "$pid" 2>/dev/null || echo "    Failed to kill $pid"
            fi
        done
        
        sleep 2
    fi
    
    # Force kill any remaining excessive processes
    final_count=$(ps aux | grep "Code Helper" | grep -v grep | wc -l)
    if [ "$final_count" -gt $((MAX_CODE_HELPERS + 2)) ]; then
        echo "Force killing remaining excessive processes..."
        excess_count=$((final_count - MAX_CODE_HELPERS))
        ps aux | grep "Code Helper" | grep -v grep | grep -v "typescript\|pylance\|eslint" | \
        head -n "$excess_count" | \
        awk '{print $2}' | \
        while IFS= read -r pid; do
            if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
                echo "  Force killing PID $pid"
                kill -9 "$pid" 2>/dev/null || echo "    Failed to force kill $pid"
            fi
        done
    fi
    
    # Show final state
    final_helpers=$(ps aux | grep "Code Helper" | grep -v grep | wc -l)
    total_vscode_memory=$(ps aux | grep "Code Helper\|Visual Studio Code" | grep -v grep | awk '{sum += $6} END {print int(sum/1024)}')
    
    echo "Final state:"
    echo "  Code Helper processes: $final_helpers"
    echo "  Total VS Code memory: ${total_vscode_memory:-0}MB"
    echo "=== VS Code Optimization Complete ==="
}

# If called with 'gentle' argument, use higher thresholds
if [ "$1" = "gentle" ]; then
    VSCODE_MEMORY_THRESHOLD=1200
    MAX_CODE_HELPERS=5
    echo "Using gentle optimization settings"
fi

optimize_vscode_memory