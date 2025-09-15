🔍 GitHub Apps Diagnostic Report
=================================

📊 Process Status
-------------------
✅ GitHub app processes found:
27524 node /Users/jamiecraik/.Cortex-OS/node_modules/.pnpm/nx@21.4.1/node_modules/nx/src/tasks-runner/fork.js /Volumes/ExternalSSD/ai-tmp/d518a61e8e1531ce310e/fp24707-0.sock @cortex-os/cortex-ai-github:test
50007 node /Users/jamiecraik/.Cortex-OS/node_modules/.pnpm/nx@21.4.1/node_modules/nx/src/tasks-runner/fork.js /Volumes/ExternalSSD/ai-tmp/d518a61e8e1531ce310e/fp49403-0.sock @cortex-os/cortex-ai-github:test
66056 cloudflared tunnel --config /Users/jamiecraik/.Cortex-OS/packages/cortex-semgrep-github/infrastructure/cloudflare/tunnel.config.yml run insula-semgrep-app

📡 Port Status
---------------
❌ Port 3001: Not in use
❌ Port 3002: Not in use
❌ Port 3003: Not in use

⚙️ Configuration Status
------------------------
✅ cortex-ai-github: .env exists
✅ cortex-semgrep-github: .env exists
✅ cortex-structure-github: .env exists

🏗️ Build Status
----------------
✅ cortex-ai-github: Built (dist/ exists)
✅ cortex-semgrep-github: Built (dist/ exists)
✅ cortex-structure-github: Built (dist/ exists)

💡 Recommendations
-------------------
1. Create .env files for each app with required variables
2. Build the apps: pnpm run build
3. Start the apps manually or create startup scripts
4. Register actual GitHub Apps with webhooks
5. Configure webhook URLs to point to the running servers

🔧 Quick Start Commands
-----------------------
```bash
# Create environment files
cp packages/cortex-ai-github/.env.example packages/cortex-ai-github/.env
cp packages/cortex-semgrep-github/.env.example packages/cortex-semgrep-github/.env
cp packages/cortex-structure-github/.env.example packages/cortex-structure-github/.env

# Build all apps
cd packages/cortex-ai-github && pnpm build
cd packages/cortex-semgrep-github && pnpm build
cd packages/cortex-structure-github && pnpm build

# Start apps (in separate terminals)
cd packages/cortex-ai-github && pnpm dev
cd packages/cortex-semgrep-github && pnpm dev
cd packages/cortex-structure-github && pnpm dev
```
