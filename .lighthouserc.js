// Lighthouse CI Configuration for Performance Monitoring
// Comprehensive performance testing and monitoring setup

const fs = require('node:fs');
const path = require('node:path');

// Read package.json to determine available scripts
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson = {};
try {
	packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch {
	console.warn('Could not read package.json for Lighthouse configuration');
	packageJson = {};
}

// Configuration with environment-based defaults
const basePort = process.env.CORTEX_PORT || process.env.PORT || '3000';
const host = process.env.CORTEX_HOST || 'localhost';
const baseUrl = `http://${host}:${basePort}`;

// Determine start command based on available scripts
let startCommand = null;
if (packageJson.scripts) {
	if (packageJson.scripts.start) {
		startCommand = 'pnpm start';
	} else if (packageJson.scripts.dev) {
		startCommand = 'pnpm dev';
	} else if (packageJson.scripts['cortex-os:start']) {
		startCommand = 'pnpm cortex-os:start';
	}
}

module.exports = {
	ci: {
		collect: {
			// Number of runs to perform
			numberOfRuns: process.env.CI ? 1 : 3,

			// URLs to test - configurable via environment
			url: process.env.LIGHTHOUSE_URLS
				? process.env.LIGHTHOUSE_URLS.split(',')
				: [baseUrl, `${baseUrl}/health`],

			// Chrome settings
			settings: {
				chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless',
				// Allow self-signed certificates for development
				extraHeaders:
					process.env.NODE_ENV === 'development' ? '{"Accept-Encoding": "gzip"}' : undefined,
			},

			// Start server command - only if available and not already running
			...(startCommand && !process.env.LIGHTHOUSE_NO_START_SERVER
				? {
						startServerCommand: startCommand,
						startServerReadyPattern: 'ready on|listening on|server started|Started server',
						startServerReadyTimeout: 60000,
					}
				: {}),
		},

		assert: {
			// Performance budgets - adjustable for development vs production
			assertions: {
				// Core Web Vitals - more lenient in development
				'categories:performance': [
					'warn',
					{ minScore: process.env.NODE_ENV === 'production' ? 0.9 : 0.7 },
				],
				'categories:accessibility': ['error', { minScore: 0.95 }],
				'categories:best-practices': ['warn', { minScore: 0.85 }],
				'categories:seo': ['warn', { minScore: 0.8 }],

				// Specific metrics - adjusted for development
				'metrics:first-contentful-paint': [
					'warn',
					{
						maxNumericValue: process.env.NODE_ENV === 'production' ? 2000 : 3000,
					},
				],
				'metrics:largest-contentful-paint': [
					'error',
					{
						maxNumericValue: process.env.NODE_ENV === 'production' ? 2500 : 4000,
					},
				],
				'metrics:first-input-delay': ['error', { maxNumericValue: 100 }],
				'metrics:cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

				// Resource budgets - more generous for development
				'resource-summary:script:size': [
					'error',
					{
						maxNumericValue: process.env.NODE_ENV === 'production' ? 500000 : 800000,
					},
				],
				'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 150000 }],

				// Lighthouse audits - conditional based on environment
				'audits:server-response-time': [
					'error',
					{
						maxNumericValue: process.env.NODE_ENV === 'production' ? 600 : 1000,
					},
				],
			},
		},

		upload: {
			// Upload results only in CI or if explicitly enabled
			target:
				process.env.CI || process.env.LIGHTHOUSE_UPLOAD ? 'temporary-public-storage' : undefined,
		},
	},
};
