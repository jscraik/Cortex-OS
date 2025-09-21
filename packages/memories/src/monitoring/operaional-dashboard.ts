import { type HealthCheckResult, MemoryHealthChecker } from './health-check.js';
import { MemoryMetricsCollector, createPrometheusExporter } from './metrics-collector.js';
import { type ExternalStorageManager, getExternalStorageManager } from '../adapters/external-storage.js';

export interface DashboardConfig {
	port: number;
	refreshIntervalMs: number;
	enablePrometheus: boolean;
	enableDetailedMetrics: boolean;
	corsEnabled: boolean;
}

export interface DashboardData {
	health: HealthCheckResult;
	metrics: any;
	storage: any;
	timestamp: Date;
}

export class OperationalDashboard {
	private config: DashboardConfig;
	private healthChecker: MemoryHealthChecker;
	private metricsCollector: MemoryMetricsCollector;
	private externalStorageManager: ExternalStorageManager;
	private server?: any;
	private intervalId?: NodeJS.Timer;

	constructor(
		healthChecker: MemoryHealthChecker,
		metricsCollector: MemoryMetricsCollector,
		config: Partial<DashboardConfig> = {},
	) {
		this.healthChecker = healthChecker;
		this.metricsCollector = metricsCollector;
		this.externalStorageManager = getExternalStorageManager();

		this.config = {
			port: 3001,
			refreshIntervalMs: 30000, // 30 seconds
			enablePrometheus: true,
			enableDetailedMetrics: true,
			corsEnabled: true,
			...config,
		};
	}

	/**
	 * Start the dashboard server
	 */
	async start(): Promise<void> {
		const { default: express } = await import('express');
		const { default: cors } = await import('cors');

		const app = express();

		// Middleware
		if (this.config.corsEnabled) {
			app.use(cors());
		}
		app.use(express.json());

		// Routes
		app.get('/', (req, res) => {
			res.send(this.createHtmlDashboard());
		});

		app.get('/api/dashboard', async (req, res) => {
			try {
				const data = await this.getDashboardData();
				res.json(data);
			} catch (error) {
				res.status(500).json({
					error: 'Failed to fetch dashboard data',
					message: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		});

		app.get('/api/health', createHealthCheckMiddleware(this.healthChecker));

		app.get('/api/metrics', (req, res) => {
			const exporter = createPrometheusExporter(this.metricsCollector);
			res.set('Content-Type', 'text/plain');
			res.send(exporter.getMetrics());
		});

		app.get('/api/storage', (req, res) => {
			const status = this.externalStorageManager.getAllStatus();
			const current = this.externalStorageManager.getCurrentStorage();
			res.json({
				current,
				status,
				isAvailable: this.externalStorageManager.isAvailable(),
			});
		});

		// Start server
		this.server = app.listen(this.config.port, () => {
			console.log(`Operational dashboard started on port ${this.config.port}`);
		});

		// Start periodic data refresh
		this.startPeriodicRefresh();
	}

	/**
	 * Stop the dashboard server
	 */
	async stop(): Promise<void> {
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		if (this.server) {
			return new Promise((resolve) => {
				this.server?.close(() => resolve());
			});
		}
	}

	/**
	 * Get dashboard data
	 */
	async getDashboardData(): Promise<DashboardData> {
		const [health, metrics] = await Promise.all([
			this.healthChecker.checkHealth(),
			this.metricsCollector.getMetrics(),
		]);

		const storage = {
			current: this.externalStorageManager.getCurrentStorage(),
			status: this.externalStorageManager.getAllStatus(),
			isAvailable: this.externalStorageManager.isAvailable(),
		};

		return {
			health,
			metrics,
			storage,
			timestamp: new Date(),
		};
	}

	/**
	 * Create HTML dashboard
	 */
	private createHtmlDashboard(): string {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cortex Memories Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.healthy { background: #10b981; color: white; }
        .status.degraded { background: #f59e0b; color: white; }
        .status.unhealthy { background: #ef4444; color: white; }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { font-weight: 500; color: #6b7280; }
        .metric-value { font-weight: 600; color: #111827; }
        .chart-container {
            height: 200px;
            margin-top: 15px;
        }
        .refresh-info {
            text-align: right;
            color: #6b7280;
            font-size: 12px;
            margin-top: 10px;
        }
        .storage-item {
            padding: 8px;
            margin: 4px 0;
            border-radius: 4px;
            background: #f9fafb;
        }
        .storage-item.available { border-left: 4px solid #10b981; }
        .storage-item.unavailable { border-left: 4px solid #ef4444; }
    </style>
    <script>
        let refreshInterval;

        async function loadDashboard() {
            try {
                const response = await fetch('/api/dashboard');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            }
        }

        function updateDashboard(data) {
            // Update health status
            const healthStatus = document.getElementById('health-status');
            healthStatus.className = 'status ' + data.health.status;
            healthStatus.textContent = data.health.status;

            // Update health details
            const healthDetails = document.getElementById('health-details');
            healthDetails.innerHTML = Object.entries(data.health.components)
                .map(([key, comp]) => \`
                    <div class="metric">
                        <span class="metric-label">\${key}</span>
                        <span class="status \${comp.status}">\${comp.status}</span>
                    </div>
                \`).join('');

            // Update metrics
            const metrics = data.metrics;
            document.getElementById('total-operations').textContent = metrics.summary.totalOperations.toLocaleString();
            document.getElementById('success-rate').textContent = (metrics.summary.successRate * 100).toFixed(2) + '%';
            document.getElementById('avg-latency').textContent = metrics.summary.averageLatencyMs.toFixed(2) + 'ms';
            document.getElementById('p95-latency').textContent = metrics.summary.p95LatencyMs.toFixed(2) + 'ms';
            document.getElementById('throughput').textContent = metrics.summary.throughputPerSecond.toFixed(2) + '/s';
            document.getElementById('total-memories').textContent = metrics.summary.totalMemories.toLocaleString();
            document.getElementById('total-errors').textContent = metrics.summary.totalErrors.toLocaleString();
            document.getElementById('uptime').textContent = formatDuration(metrics.summary.uptime);

            // Update storage
            const storageHtml = data.storage.status.map(status => \`
                <div class="storage-item \${status.available ? 'available' : 'unavailable'}">
                    <div class="metric">
                        <span class="metric-label">Path</span>
                        <span class="metric-value">\${status.path}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Status</span>
                        <span class="metric-value">\${status.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                    \${status.available ? \`
                        <div class="metric">
                            <span class="metric-label">Free Space</span>
                            <span class="metric-value">\${status.freeSpaceGB?.toFixed(2) || 'N/A'} GB</span>
                        </div>
                    \` : ''}
                </div>
            \`).join('');
            document.getElementById('storage-list').innerHTML = storageHtml;

            // Update timestamp
            document.getElementById('last-updated').textContent = new Date(data.timestamp).toLocaleString();
        }

        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return \`\${days}d \${hours % 24}h\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
            if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
            return \`\${seconds}s\`;
        }

        // Start refresh loop
        function startRefresh() {
            loadDashboard();
            refreshInterval = setInterval(loadDashboard, ${this.config.refreshIntervalMs});
        }

        // Initialize on load
        window.addEventListener('load', startRefresh);
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Cortex Memories Operational Dashboard</h1>
            <p>Monitor the health and performance of your memory system</p>
            <div class="refresh-info">
                Last updated: <span id="last-updated">Loading...</span>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>System Health</h2>
                <div class="metric">
                    <span class="metric-label">Overall Status</span>
                    <span id="health-status" class="status">Loading...</span>
                </div>
                <div id="health-details">
                    <!-- Health details will be inserted here -->
                </div>
            </div>

            <div class="card">
                <h2>Operations Summary</h2>
                <div class="metric">
                    <span class="metric-label">Total Operations</span>
                    <span class="metric-value" id="total-operations">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Success Rate</span>
                    <span class="metric-value" id="success-rate">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average Latency</span>
                    <span class="metric-value" id="avg-latency">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">P95 Latency</span>
                    <span class="metric-value" id="p95-latency">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Throughput</span>
                    <span class="metric-value" id="throughput">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value" id="uptime">-</span>
                </div>
            </div>

            <div class="card">
                <h2>Storage Metrics</h2>
                <div class="metric">
                    <span class="metric-label">Total Memories</span>
                    <span class="metric-value" id="total-memories">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Errors</span>
                    <span class="metric-value" id="total-errors">-</span>
                </div>
            </div>

            <div class="card">
                <h2>External Storage</h2>
                <div id="storage-list">
                    <!-- Storage status will be inserted here -->
                </div>
            </div>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #6b7280;">
            <p>
                <a href="/api/health" target="_blank">Health API</a> |
                <a href="/api/metrics" target="_blank">Prometheus Metrics</a> |
                <a href="/api/storage" target="_blank">Storage API</a>
            </p>
        </div>
    </div>
</body>
</html>
        `;
	}

	/**
	 * Start periodic data refresh
	 */
	private startPeriodicRefresh(): void {
		// Update storage metrics periodically
		setInterval(() => {
			this.metricsCollector.updateStorageMetrics().catch(console.error);
		}, this.config.refreshIntervalMs);

		// Emit metrics events
		this.metricsCollector.on('operation', (data) => {
			// Could push to WebSocket clients here
		});

		this.metricsCollector.on('error', (data) => {
			console.error('Memory operation error:', data);
		});
	}
}

/**
 * Create health check middleware for Express
 */
function createHealthCheckMiddleware(healthChecker: MemoryHealthChecker) {
	return async (req: any, res: any, next: any) => {
		const { query } = req;
		const detailed = query.detailed === 'true';

		try {
			if (detailed) {
				const result = await healthChecker.checkHealth();
				res.status(result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503)
					.json(result);
			} else {
				const result = await healthChecker.quickCheck();
				res.status(result.status === 'healthy' ? 200 : 503)
					.json(result);
			}
		} catch (error) {
			res.status(500).json({
				status: 'unhealthy',
				timestamp: new Date(),
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	};
}