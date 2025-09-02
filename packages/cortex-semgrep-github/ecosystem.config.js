/**
 * PM2 Ecosystem Configuration for Cortex Semgrep GitHub App
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart cortex-semgrep-github
 *   pm2 logs cortex-semgrep-github
 */

module.exports = {
	apps: [
		{
			name: "cortex-semgrep-github",
			script: "dist/server/start.js",
			cwd: "/Users/jamiecraik/.Cortex-OS/packages/cortex-semgrep-github",

			// Environment variables
			env: {
				NODE_ENV: "development",
				PORT: 3002,
				GITHUB_TOKEN:
					"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",
				WEBHOOK_SECRET:
					"fbff2764d54286c03dc1c084503fc10e98fbbd2c2b3882580e3655a407fa0dfa4df6a03be0433b71a90ab79fbc422e1499dac330ecb1bcadbbd8d3f764b3ef20",
				SEMGREP_APP_ID: process.env.SEMGREP_APP_ID || "",
				SEMGREP_PRIVATE_KEY: process.env.SEMGREP_PRIVATE_KEY || "",
			},

			env_production: {
				NODE_ENV: "production",
				PORT: 3002,
				GITHUB_TOKEN: process.env.GITHUB_TOKEN,
				WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
				SEMGREP_APP_ID: process.env.SEMGREP_APP_ID,
				SEMGREP_PRIVATE_KEY: process.env.SEMGREP_PRIVATE_KEY,
			},

			// Process management
			instances: 1,
			exec_mode: "cluster",

			// Restart policy
			autorestart: true,
			watch: false,
			max_memory_restart: "512M",
			restart_delay: 5000,
			max_restarts: 10,
			min_uptime: "30s",

			// Logging
			log_file: "./logs/combined.log",
			out_file: "./logs/out.log",
			error_file: "./logs/error.log",
			log_date_format: "YYYY-MM-DD HH:mm Z",

			// Advanced options
			kill_timeout: 5000,
			listen_timeout: 10000,

			// Health monitoring
			health_check_grace_period: 3000,

			// Script arguments
			args: [],

			// Node.js options
			node_args: ["--max-old-space-size=512"],

			// Auto-start on system reboot
			startup: true,

			// Merge logs
			merge_logs: true,

			// Time zone
			time: true,
		},
	],

	deploy: {
		production: {
			user: "jamiecraik",
			host: "localhost",
			ref: "origin/main",
			repo: "git@github.com:jamiescottcraik/Cortex-OS.git",
			path: "/Users/jamiecraik/.Cortex-OS",
			"post-deploy":
				"cd packages/cortex-semgrep-github && pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production",
			env: {
				NODE_ENV: "production",
			},
		},
	},
};
