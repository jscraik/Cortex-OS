#!/bin/bash
echo "🔄 brAInwav: Restarting TypeScript Language Service..."
pkill -f "tsserver" 2>/dev/null || true
pkill -f "typescript" 2>/dev/null || true
sleep 2
echo "✅ brAInwav: TypeScript service restarted"
echo "📝 In VS Code, run: TypeScript: Restart TS Server"
