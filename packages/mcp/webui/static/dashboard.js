/* eslint-env browser */
/* global AbortController, WebSocket, Chart */
/**
 * MCP Dashboard Real-time JavaScript
 */

// Security: Allowlisted API endpoints to prevent SSRF
const ALLOWED_API_ENDPOINTS = [
	'/api/status',
	'/api/tools',
	'/api/tools/call',
	'/api/pool/status',
	'/api/plugins',
	'/api/circuit-breakers',
	'/api/metrics',
];

/**
 * Secure fetch wrapper with endpoint validation and timeout
 * @param {string} url - API endpoint to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
async function secureFetch(url, options = {}) {
	// Validate that the URL is an allowed API endpoint
	const isAllowed = ALLOWED_API_ENDPOINTS.some((endpoint) => {
		return (
			url === endpoint ||
			url.startsWith(endpoint + '?') ||
			url.startsWith(endpoint + '/')
		);
	});

	if (!isAllowed) {
		throw new Error(`API endpoint not allowed: ${url}`);
	}

	// Add timeout if not specified
	const timeoutMs = 10000; // 10 second timeout
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error.name === 'AbortError') {
			throw new Error('Request timeout');
		}
		throw error;
	}
}

class MCPDashboard {
	constructor() {
		this.ws = null;
		this.charts = {};
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;

		this.init();
	}

	init() {
		this.setupWebSocket();
		this.setupEventHandlers();
		this.initializeCharts();
		this.fetchInitialData();

		// Start periodic updates
		setInterval(() => this.fetchStatus(), 5000);
		setInterval(() => this.fetchMetrics(), 10000);
	}

	setupWebSocket() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws`;

		this.ws = new WebSocket(wsUrl);

		this.ws.onopen = () => {
			console.log('WebSocket connected');
			this.reconnectAttempts = 0;
			this.updateConnectionStatus(true);
		};

		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			this.handleRealtimeUpdate(data);
		};

		this.ws.onclose = () => {
			console.log('WebSocket disconnected');
			this.updateConnectionStatus(false);
			this.attemptReconnect();
		};

		this.ws.onerror = (error) => {
			console.error('WebSocket error:', error);
			this.updateConnectionStatus(false);
		};
	}

	attemptReconnect() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay = 2 ** this.reconnectAttempts * 1000; // Exponential backoff

			setTimeout(() => {
				console.log(
					`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
				);
				this.setupWebSocket();
			}, delay);
		}
	}

	updateConnectionStatus(connected) {
		const indicator = document.getElementById('ws-status');
		if (indicator) {
			indicator.className = connected
				? 'status-indicator status-healthy'
				: 'status-indicator status-failed';
			indicator.title = connected
				? 'WebSocket Connected'
				: 'WebSocket Disconnected';
		}
	}

	handleRealtimeUpdate(data) {
		switch (data.type) {
			case 'log':
				this.addLogEntry(data.message);
				break;
			case 'status_update':
				this.updateServerStatus(data.data);
				break;
			case 'metrics':
				this.updateMetrics(data.data);
				break;
			case 'tool_execution':
				this.handleToolExecution(data.data);
				break;
			case 'plugin_event':
				this.handlePluginEvent(data.data);
				break;
			default:
				console.log('Unknown message type:', data.type);
		}
	}

	addLogEntry(message) {
		const logContainer = document.getElementById('log-container');
		if (!logContainer) return;

		const logEntry = document.createElement('div');
		logEntry.className = 'log-entry';
		logEntry.innerHTML = `
            <span class="log-timestamp">[${new Date().toISOString()}]</span>
            <span class="log-message">${message}</span>
        `;

		logContainer.appendChild(logEntry);
		logContainer.scrollTop = logContainer.scrollHeight;

		// Keep only last 100 log entries
		const entries = logContainer.children;
		if (entries.length > 100) {
			logContainer.removeChild(entries[0]);
		}
	}

	async fetchInitialData() {
		await Promise.all([
			this.fetchStatus(),
			this.fetchTools(),
			this.fetchPlugins(),
			this.fetchConnectionPool(),
			this.fetchCircuitBreakers(),
		]);
	}

	async fetchStatus() {
		try {
			const response = await secureFetch('/api/status');
			const data = await response.json();
			this.updateServerStatus(data);
		} catch (error) {
			console.error('Failed to fetch status:', error);
			this.updateServerStatus({ status: 'error', error: error.message });
		}
	}

	updateServerStatus(data) {
		const container = document.getElementById('server-status');
		if (!container) return;

		const statusClass =
			{
				healthy: 'status-healthy',
				degraded: 'status-degraded',
				error: 'status-failed',
				stopped: 'status-failed',
			}[data.status] || 'status-failed';

		container.innerHTML = `
            <div class="status-item">
                <span class="status-indicator ${statusClass}"></span>
                <span>Status: ${data.status}</span>
            </div>
            <div class="status-item">Uptime: ${this.formatUptime(data.uptime || 0)}</div>
            <div class="status-item">Plugins: ${data.plugins_loaded || 0}</div>
            <div class="status-item">Connections: ${data.active_connections || 0}</div>
            <div class="status-item">Requests: ${data.total_requests || 0}</div>
        `;
	}

	async fetchTools() {
		try {
			const response = await secureFetch('/api/tools');
			const data = await response.json();
			this.updateToolsList(data.tools || []);
		} catch (error) {
			console.error('Failed to fetch tools:', error);
		}
	}

	updateToolsList(tools) {
		const container = document.getElementById('tools-list');
		if (!container) return;

		if (tools.length === 0) {
			container.innerHTML = '<div class="empty-state">No tools available</div>';
			return;
		}

		container.innerHTML = tools
			.map(
				(tool) => `
            <div class="tool-item">
                <div class="tool-header">
                    <strong>${tool.name}</strong>
                    <button class="btn btn-sm btn-primary" onclick="dashboard.testTool('${tool.name}')">
                        Test
                    </button>
                </div>
                <p class="tool-description">${tool.description || 'No description available'}</p>
                <div class="tool-params">
                    ${Object.keys(tool.parameters || {}).length > 0
						? `Parameters: ${Object.keys(tool.parameters).join(', ')}`
						: 'No parameters'
					}
                </div>
            </div>
        `,
			)
			.join('');
	}

	async testTool(toolName) {
		try {
			const response = await secureFetch('/api/tools/call', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: toolName, parameters: {} }),
			});

			const result = await response.json();

			const modal = this.createModal(
				'Tool Execution Result',
				`
                <div class="tool-result">
                    <div class="result-header">
                        <strong>Tool:</strong> ${toolName}
                        <span class="result-status ${result.success ? 'success' : 'error'}">
                            ${result.success ? '✓ Success' : '✗ Failed'}
                        </span>
                    </div>
                    <div class="result-time">
                        Execution Time: ${(result.execution_time * 1000).toFixed(2)}ms
                    </div>
                    ${result.error
					? `
                        <div class="result-error">
                            <strong>Error:</strong> ${result.error}
                        </div>
                    `
					: ''
				}
                    ${result.result
					? `
                        <div class="result-data">
                            <strong>Result:</strong>
                            <pre>${JSON.stringify(result.result, null, 2)}</pre>
                        </div>
                    `
					: ''
				}
                </div>
            `,
			);

			modal.show();
		} catch (error) {
			this.showError(`Tool execution failed: ${error.message}`);
		}
	}

	async fetchConnectionPool() {
		try {
			const response = await secureFetch('/api/pool/status');
			const data = await response.json();
			this.updateConnectionPoolStatus(data);
		} catch (error) {
			console.error('Failed to fetch connection pool status:', error);
		}
	}

	updateConnectionPoolStatus(data) {
		const container = document.getElementById('pool-status');
		if (!container) return;

		const stateClass =
			{
				healthy: 'status-healthy',
				degraded: 'status-degraded',
				failed: 'status-failed',
				initializing: 'status-degraded',
			}[data.state] || 'status-failed';

		container.innerHTML = `
            <div class="status-item">
                <span class="status-indicator ${stateClass}"></span>
                <span>State: ${data.state}</span>
            </div>
            <div class="status-item">Total: ${data.total_connections}</div>
            <div class="status-item">Healthy: ${data.healthy_connections}</div>
            <div class="status-item">Active: ${data.active_connections}</div>
            <div class="status-item">Available: ${data.available_connections}</div>
        `;
	}

	initializeCharts() {
		const ctx = document.getElementById('metrics-chart');
		if (!ctx) return;

		this.charts.metrics = new Chart(ctx, {
			type: 'line',
			data: {
				labels: [],
				datasets: [
					{
						label: 'Request Rate',
						data: [],
						borderColor: 'rgb(75, 192, 192)',
						tension: 0.1,
					},
					{
						label: 'Error Rate',
						data: [],
						borderColor: 'rgb(255, 99, 132)',
						tension: 0.1,
					},
				],
			},
			options: {
				responsive: true,
				scales: {
					y: {
						beginAtZero: true,
					},
				},
				plugins: {
					title: {
						display: true,
						text: 'Real-time Metrics',
					},
				},
			},
		});
	}

	updateMetrics(metricsData) {
		if (!this.charts.metrics) return;

		const chart = this.charts.metrics;
		const now = new Date().toLocaleTimeString();

		// Add new data point
		chart.data.labels.push(now);
		chart.data.datasets[0].data.push(metricsData.request_rate || 0);
		chart.data.datasets[1].data.push(metricsData.error_rate || 0);

		// Keep only last 20 data points
		if (chart.data.labels.length > 20) {
			chart.data.labels.shift();
			for (const dataset of chart.data.datasets) {
				dataset.data.shift();
			}
		}

		chart.update('none'); // No animation for performance
	}

	createModal(title, content) {
		const modal = document.createElement('div');
		modal.className = 'modal';
		modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

		document.body.appendChild(modal);

		modal.querySelector('.modal-close').onclick = () => {
			modal.remove();
		};

		modal.onclick = (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		};

		return {
			show: () => {
				modal.style.display = 'block';
			},
			hide: () => {
				modal.style.display = 'none';
			},
			remove: () => modal.remove(),
		};
	}

	showError(message) {
		const modal = this.createModal(
			'Error',
			`
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                ${message}
            </div>
        `,
		);
		modal.show();
	}

	formatUptime(seconds) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		return `${hours}h ${minutes}m ${secs}s`;
	}

	setupEventHandlers() {
		// Add keyboard shortcuts
		document.addEventListener('keydown', (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
				e.preventDefault();
				this.fetchInitialData();
			}
		});

		// Add refresh button functionality
		const refreshBtn = document.getElementById('refresh-btn');
		if (refreshBtn) {
			refreshBtn.onclick = () => this.fetchInitialData();
		}
	}
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
	dashboard = new MCPDashboard();
	// Expose after initialization
	window.dashboard = dashboard;
});

// Export placeholder for type-checkers; runtime assignment happens on DOMContentLoaded
window.dashboard = window.dashboard || null;
