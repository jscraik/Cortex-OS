/**
 * PM2 Ecosystem Configuration for Cortex Structure Guard GitHub App
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart cortex-structure-github
 *   pm2 logs cortex-structure-github
 */

module.exports = {
  apps: [
    {
      name: 'cortex-structure-github',
      script: 'pnpm',
      args: 'tsx src/server/start.ts',
      cwd: '/Users/jamiecraik/.Cortex-OS/packages/cortex-structure-github',

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
        GITHUB_TOKEN: process.env.STRUCTURE_GITHUB_TOKEN || 'your_github_token_here',
        WEBHOOK_SECRET: process.env.STRUCTURE_WEBHOOK_SECRET || 'your_webhook_secret_here',
        STRUCTURE_APP_ID: process.env.STRUCTURE_APP_ID || '',
        STRUCTURE_PRIVATE_KEY: process.env.STRUCTURE_PRIVATE_KEY || '',
        AUTO_FIX_ENABLED: 'false',
        DRY_RUN: 'true'
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        GITHUB_TOKEN: process.env.STRUCTURE_GITHUB_TOKEN,
        WEBHOOK_SECRET: process.env.STRUCTURE_WEBHOOK_SECRET,
        STRUCTURE_APP_ID: process.env.STRUCTURE_APP_ID,
        STRUCTURE_PRIVATE_KEY: process.env.STRUCTURE_PRIVATE_KEY,
        AUTO_FIX_ENABLED: 'true',
        DRY_RUN: 'false'
      },

      // Process management
      instances: 1,
      exec_mode: 'fork',

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',

      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',

      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Auto-start on system reboot
      startup: true,

      // Merge logs
      merge_logs: true,

      // Time zone
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'jamiecraik',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:jamiescottcraik/Cortex-OS.git',
      path: '/Users/jamiecraik/.Cortex-OS',
      'post-deploy': 'cd packages/cortex-structure-github && pnpm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
