# Cloudflare Tunnel Integration

Cortex Code supports Cloudflare tunnels for secure remote access to your development environment. This lets you access the TUI and WebUI securely from anywhere.

## Quick Setup

### 1. Install cloudflared

macOS:

```bash
brew install cloudflare/cloudflare/cloudflared
```

Linux:

```bash
# Debian/Ubuntu
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# CentOS/RHEL
curl -L --output cloudflared.rpm https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
sudo rpm -i cloudflared.rpm
```

Windows: download from GitHub Releases.

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser window to authenticate with your Cloudflare account.

### 3. Configure Cortex Code

Run the setup command:

```bash
cortex-code tunnel setup
```

Edit your configuration file (`~/.cortex/cortex.json`):

```json
{
   "server": {
      "cloudflare": {
         "tunnel_name": "cortex-code",
         "auto_start": true,
         "health_checks": true
         /* "tunnel_token": "your-tunnel-token-here" */
         /* "domain": "cortex.example.com" */
      }
   },
   "webui": { "enabled": true, "port": 3000, "host": "127.0.0.1" }
}
```

### 4. Start with Tunnel

```bash
# Start TUI with automatic tunnel
cortex-code

# Or start WebUI daemon with tunnel
cortex-code daemon --port 3000
```

## Usage

### CLI Commands

```bash
# Setup tunnel configuration
cortex-code tunnel setup

# Start tunnel manually
cortex-code tunnel start --port 3000

# Check tunnel status
cortex-code tunnel status

# Stop tunnel
cortex-code tunnel stop
```

## Configuration Options

The Cloudflare tunnel integration can be configured through the Cortex Code configuration file (`~/.cortex/cortex.json`):

```json
{ "server": { "cloudflare": { "tunnel_name": "my-cortex-tunnel", "auto_start": true, "health_checks": true } } }
```

Authentication example when exposing WebUI via tunnels:

```json
{ "webui": { "auth": { "method": "ApiKey", "secret_key": "your-secret-key" } } }
```

## WebUI API Endpoints

When tunnels are enabled, additional API endpoints are available:

- GET /api/tunnel/status - Get tunnel status
- POST /api/tunnel/control - Start/stop tunnel

### Start Tunnel via API

```bash
curl -X POST https://your-tunnel-url.trycloudflare.com/api/tunnel/control \
   -H "Content-Type: application/json" \
   -d '{"action": "start"}'
```

### Stop Tunnel via API

```bash
curl -X POST https://your-tunnel-url.trycloudflare.com/api/tunnel/control \
   -H "Content-Type: application/json" \
   -d '{"action": "stop"}'
```

## Examples

### Development Setup

```json
{ "server": { "cloudflare": { "tunnel_name": "cortex-dev", "auto_start": false, "health_checks": true } }, "webui": { "enabled": true, "port": 3000 } }
```

### Production Setup

```json
{ "server": { "cloudflare": { "tunnel_name": "cortex-prod", "auto_start": true } } }
```

## Security Considerations

1. Use custom domains for production instead of generated .trycloudflare.com URLs.
2. Add WebUI authentication when exposed via tunnels (see example above).
3. Monitor tunnel access via the Cloudflare dashboard.
4. Use Cloudflare's DDoS protection and rate limiting.

## Troubleshooting

### Common Issues

1. "cloudflared not found"
    - Ensure cloudflared is installed and in your PATH
    - Run `cloudflared --version` to verify installation

2. Authentication errors
    - Run `cloudflared tunnel login` to re-authenticate
    - Check if your Cloudflare account has tunnel permissions

3. Tunnel won't start
    - Verify your tunnel name exists: `cloudflared tunnel list`
    - Check if the local port is available
    - Review tunnel logs for errors

4. Connection timeout
    - Ensure your local server is running
    - Check firewall settings
    - Verify tunnel configuration

### Getting Help

- Check tunnel status: `cortex-code tunnel status`
- View tunnel logs in the terminal output
- Cloudflare Tunnel docs: <https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/>

This integration makes your Cortex Code instance accessible from anywhere while maintaining security through Cloudflare's infrastructure.
