#!/bin/bash

# Quick Manual Deployment Script
# Use this if you want to specify the host directly or do manual steps

echo "🚀 brAInwav MCP Manual Deployment Helper"
echo
echo "We have the built package ready:"
echo "  📦 $(ls /Users/jamiecraik/.Cortex-OS/packages/cortex-mcp/dist/cortex_mcp-*.whl)"
echo
echo "Choose your deployment method:"
echo
echo "1️⃣  AUTOMATED (if you know your host):"
echo "   MCP_HOST=your-actual-host ./scripts/deploy-mcp.sh --skip-build"
echo
echo "2️⃣  MANUAL STEPS (copy commands to run on your host):"
echo
echo "   # Copy the wheel to your host first:"
echo "   scp $(ls /Users/jamiecraik/.Cortex-OS/packages/cortex-mcp/dist/cortex_mcp-*.whl) your-host:/tmp/"
echo
echo "   # Then run these commands on your MCP host:"
echo "   sudo systemctl stop cortex-fastmcp.service"
echo "   pip install --upgrade /tmp/cortex_mcp-1.0.0-py3-none-any.whl"
echo "   export CORTEX_MCP_TRANSPORT=streamable-http"
echo "   sudo systemctl start cortex-fastmcp.service"
echo "   sudo systemctl status cortex-fastmcp.service --no-pager"
echo
echo "3️⃣  CLOUDFLARE CACHE PURGE (after deployment):"
echo "   # If you have Cloudflare credentials:"
echo "   curl -X POST \"https://api.cloudflare.com/client/v4/zones/\$CLOUDFLARE_ZONE_ID/purge_cache\" \\"
echo "     -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     --data '{\"files\":[\"https://cortex-mcp.brainwav.io/.well-known/mcp.json\"]}'"
echo
echo "4️⃣  VERIFICATION:"
echo "   curl -fsSL https://cortex-mcp.brainwav.io/.well-known/mcp.json | jq"
echo "   # Should show: \"transport\": \"streamable-http\""
echo
echo "💡 Package location: /Users/jamiecraik/.Cortex-OS/packages/cortex-mcp/dist/"
echo "💡 Package size: $(du -h /Users/jamiecraik/.Cortex-OS/packages/cortex-mcp/dist/cortex_mcp-*.whl | cut -f1)"
