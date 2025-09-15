# YouTube MCP Server Setup & Fix

## Problem Solved

The YouTube MCP server was failing with "Cannot read properties of undefined (reading 'replace')"
because it was trying to process an undefined `YOUTUBE_API_KEY` environment variable.

## Solution Implemented

1. **Created a robust wrapper script** (`/Users/jamiecraik/.Cortex-OS/scripts/youtube-mcp-wrapper.sh`)
2. **Updated Claude desktop config** to use the wrapper instead of direct npx
3. **Added environment validation** and clear error messages

## Setting Up Your YouTube API Key

### Step 1: Get a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Create credentials → API Key
5. Copy the API key (starts with `AIza...`)

### Step 2: Set the Environment Variable

#### Option A: System-wide (Recommended for Claude Desktop)

```bash
# Set for all applications (including Claude Desktop)
launchctl setenv YOUTUBE_API_KEY "your_api_key_here"
```

#### Option B: Shell session only

```bash
# For current terminal session
export YOUTUBE_API_KEY="your_api_key_here"

# To make permanent, add to ~/.zshrc or ~/.bashrc
echo 'export YOUTUBE_API_KEY="your_api_key_here"' >> ~/.zshrc
```

### Step 3: Restart Claude Desktop

After setting the environment variable, restart Claude Desktop application to pick up the new environment.

## Verification

### Test the wrapper script manually

```bash
/Users/jamiecraik/.Cortex-OS/scripts/youtube-mcp-wrapper.sh
```

**Expected outputs:**

- ✅ With API key: `[INFO] Environment validation passed (API key length: XX chars)`
- ❌ Without API key: `[ERROR] YOUTUBE_API_KEY environment variable is required`

### Check your environment

```bash
# Check if key is set (will show masked length)
echo "API Key length: ${#YOUTUBE_API_KEY}"

# Verify launchctl setting
launchctl getenv YOUTUBE_API_KEY | sed 's/./*/g'
```

## Files Modified

1. **Created**: `/Users/jamiecraik/.Cortex-OS/scripts/youtube-mcp-wrapper.sh`
2. **Updated**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Before/After Configuration

**Before (problematic):**

```json
"youtube": {
  "transport": {
    "type": "stdio", 
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-youtube"]
  },
  "env": {
    "YOUTUBE_API_KEY": "${YOUTUBE_API_KEY}"
  }
}
```

**After (fixed):**

```json
"youtube": {
  "transport": {
    "type": "stdio",
    "command": "/Users/jamiecraik/.Cortex-OS/scripts/youtube-mcp-wrapper.sh",
    "args": []
  }
}
```

## Troubleshooting

**Still getting errors?**

1. Restart Claude Desktop completely
2. Verify API key is set: `launchctl getenv YOUTUBE_API_KEY`
3. Test wrapper manually (see Verification section above)
4. Check logs in Claude Desktop for new error messages

**Need to remove the fix?**

- Delete `/Users/jamiecraik/.Cortex-OS/scripts/youtube-mcp-wrapper.sh`
- Revert the config change in Claude desktop config

The wrapper script provides clear error messages and validates your environment before attempting to start the MCP server, preventing the undefined property errors you were seeing.
