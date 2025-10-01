# brAInwav Cloudflare Tunnel Port Configuration

## ✅ **Corrected Port Assignments (2025-09-23)**

### **Cloudflare Tunnel Services** 🌐
These services have Cloudflare tunnel links and **MUST** use these specific ports:

| Service | Port | Status | Cloudflare Tunnel |
|---------|------|--------|-------------------|
| **GitHub AI** | `3001` | ✅ Configured | Yes - Has tunnel link |
| **Semgrep** | `3002` | ✅ Configured | Yes - Has tunnel link |
| **Structure** | `3003` | ✅ Configured | Yes - Has tunnel link |
| **MCP Connector** | `3024` | ✅ Configured | Yes - [cortex-mcp.brainwav.io](https://cortex-mcp.brainwav.io) |

### **Reserved Ports** 🔒

| Port | Purpose | Status |
|------|---------|--------|
| `3000` | Future MCP services | Reserved |
| `8007` | Cloudflare webhooks | Reserved |

### **Relocated Services** 🔄
Services moved OUT of Cloudflare tunnel range:

| Service | Old Port | New Port | Reason |
|---------|----------|----------|---------|
| **Local Memory** | `3002` | `3028` | Port 3002 needed for Semgrep tunnel |

## **Key Changes Made:**

1. **✅ GitHub AI**: Restored to port `3001` (has Cloudflare tunnel)
2. **✅ Semgrep**: Restored to port `3002` (has Cloudflare tunnel)
3. **✅ Structure**: Restored to port `3003` (has Cloudflare tunnel)
4. **✅ Local Memory**: Migrated to port `3028` (no tunnel needed)

## **Current Status:**

- **Cloudflare tunnel ports** (3001, 3002, 3003, 3024) are now **correctly reserved**
- **No port conflicts** - each service has unique assignment
- **Local Memory** needs to be restarted on port 3028 in dual mode
- **All tunnel services** ready for deployment

## **Next Steps:**

1. Start services on their assigned Cloudflare tunnel ports:
   ```bash
   # GitHub AI on 3001
   # Semgrep on 3002  
   # Structure on 3003
   # MCP Connector on 3024
   ```

2. Verify Local Memory on port 3028:
   ```bash
   LOCAL_MEMORY_MODE=dual LOCAL_MEMORY_PORT=3028 local-memory &
   curl http://localhost:3028/api/v1/health
   ```

3. Update any configuration files referencing old ports

## **Configuration Files Updated:**
- `/Users/jamiecraik/.Cortex-OS/config/ports.env` - ✅ Corrected assignments
- `/Users/jamiecraik/.Cortex-OS/scripts/migrate-cloudflare-ports.sh` - ✅ Migration tool created

---
*Co-authored-by: brAInwav Development Team*
