# Cloudflare Quick Tunnel

The `scripts/cloudflare/run-quick-tunnel.sh` helper exposes local services via Cloudflare's quick tunnels.

## IPv4 default

Most environments lack IPv6 connectivity. The script now forces IPv4 unless overridden. By default it runs:

```bash
cloudflared tunnel --edge-ip-version 4
```

To use IPv6 or Cloudflare's auto detection, set `EDGE_IP_VERSION`:

```bash
EDGE_IP_VERSION=6 scripts/cloudflare/run-quick-tunnel.sh mcp
```

If `EDGE_IP_VERSION=auto`, the script will attempt IPv6 and fall back to IPv4 when necessary.
