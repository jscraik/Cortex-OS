module.exports = {
	apps: [
		{
			name: 'mlx-orchestrator',
			script: 'node',
			args: 'apps/cortex-cli/scripts/mlx-orchestrator.cjs',
			instances: 1, // single orchestrator only
			exec_mode: 'fork',
			instance_var: 'INSTANCE_ID',
			wait_ready: true,
			listen_timeout: 5000,
			max_memory_restart: '2G',
			autorestart: true,
			watch: false,
			env: {
				NODE_ENV: 'production',
				MLX_CONCURRENCY: '3', // orchestrator will still cap at 3
				ORCH_GLOBAL_CAP: '3',
				ORCH_SLOTS_DIR: '/tmp/cortex-orch-slots',
			},
		},
		{
			name: 'github-ai',
			script: 'scripts/github-apps/run-ai-github.sh',
			restart_delay: 1000,
			autorestart: true,
			interpreter: 'none',
			env: {
				NODE_ENV: 'production',
			},
		},
		{
			name: 'github-semgrep',
			script: 'scripts/github-apps/run-semgrep-github.sh',
			restart_delay: 1000,
			autorestart: true,
			interpreter: 'none',
			env: {
				NODE_ENV: 'production',
			},
		},
		{
			name: 'github-structure',
			script: 'scripts/github-apps/run-structure-github.sh',
			restart_delay: 1000,
			autorestart: true,
			interpreter: 'none',
			env: {
				NODE_ENV: 'production',
			},
		},
	],
};
