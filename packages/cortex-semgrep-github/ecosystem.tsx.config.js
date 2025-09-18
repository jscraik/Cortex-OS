module.exports = {
	apps: [
		{
			name: 'cortex-semgrep-github',
			script: 'pnpm',
			args: 'tsx src/server/start.ts',
			cwd: '/Users/jamiecraik/.Cortex-OS/packages/cortex-semgrep-github',

			// Environment variables
			env: {
				NODE_ENV: 'development',
				PORT: 3002,
				GITHUB_TOKEN: process.env.SEMGREP_GITHUB_TOKEN || 'your_github_token_here',
				WEBHOOK_SECRET: process.env.SEMGREP_WEBHOOK_SECRET || 'your_webhook_secret_here',
				SEMGREP_APP_ID: process.env.SEMGREP_APP_ID || '',
				SEMGREP_PRIVATE_KEY: process.env.SEMGREP_PRIVATE_KEY || '',
			},

			env_production: {
				NODE_ENV: 'production',
				PORT: 3002,
				GITHUB_TOKEN: process.env.SEMGREP_GITHUB_TOKEN,
				WEBHOOK_SECRET: process.env.SEMGREP_WEBHOOK_SECRET,
				SEMGREP_APP_ID: process.env.SEMGREP_APP_ID,
				SEMGREP_PRIVATE_KEY: process.env.SEMGREP_PRIVATE_KEY,
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
			time: true,
		},
	],
};
