import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium, type FullConfig } from '@playwright/test';
import { MockServices } from './support/mock-services';
import { TestDatabase } from './support/test-database';

/**
 * Global setup for brAInwav Cortex-OS E2E tests
 *
 * This setup runs once before all test suites and:
 * - Starts Docker compose test environment
 * - Seeds test database with initial data
 * - Sets up mock services for external dependencies
 * - Creates necessary directories and files
 * - Validates test environment readiness
 */
async function globalSetup(_config: FullConfig) {
	console.log('🧠 brAInwav Cortex-OS E2E Test Suite - Global Setup');
	console.log('=====================================================');

	try {
		// Create necessary directories
		const directories = [
			'test-results',
			'test-results/screenshots',
			'test-results/videos',
			'test-results/traces',
			'test-results/reports',
			'uploads',
			'data',
		];

		directories.forEach((dir) => {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
				console.log(`📁 Created directory: ${dir}`);
			}
		});

		// Start Docker compose test environment
		console.log('🐳 Starting Docker compose test environment...');
		try {
			execSync('docker compose -f docker-compose.test.yml up -d', {
				stdio: 'inherit',
				cwd: process.cwd(),
			});
			console.log('✅ Docker compose test environment started');
		} catch (_error) {
			console.warn('⚠️ Docker compose not available, using local services');
		}

		// Wait for services to be ready
		console.log('⏳ Waiting for services to be ready...');
		await waitForServices();

		// Setup test database
		console.log('🗄️ Setting up test database...');
		const testDb = new TestDatabase();
		await testDb.initialize();
		await testDb.seed();
		console.log('✅ Test database initialized and seeded');

		// Setup mock services
		console.log('🎭 Setting up mock services...');
		const mockServices = new MockServices();
		await mockServices.start();
		console.log('✅ Mock services started');

		// Store references in global object for teardown
		(global as any).__testContext = {
			testDb,
			mockServices,
		};

		// Validate environment
		console.log('🔍 Validating test environment...');
		await validateEnvironment();

		console.log('🎉 Global setup completed successfully');
		console.log('=====================================================\n');
	} catch (error) {
		console.error('❌ Global setup failed:', error);
		process.exit(1);
	}
}

/**
 * Wait for services to be ready
 */
async function waitForServices() {
	const maxRetries = 30;
	const retryDelay = 2000;

	const services = [
		{ name: 'Frontend', url: 'http://localhost:3000' },
		{ name: 'Backend API', url: 'http://localhost:3001/api/health' },
		{ name: 'Local Memory', url: 'http://localhost:3028/api/v1/health' },
	];

	for (const service of services) {
		let retries = 0;
		while (retries < maxRetries) {
			try {
				const browser = await chromium.launch();
				const context = await browser.newContext();
				const response = await context.request.get(service.url);
				await browser.close();

				if (response.ok()) {
					console.log(`✅ ${service.name} is ready`);
					break;
				}
			} catch (_error) {
				retries++;
				if (retries >= maxRetries) {
					throw new Error(`❌ ${service.name} not ready after ${maxRetries} attempts`);
				}
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			}
		}
	}
}

/**
 * Validate test environment
 */
async function validateEnvironment() {
	const requiredEnvVars = ['NODE_ENV', 'JWT_SECRET'];

	for (const envVar of requiredEnvVars) {
		if (!process.env[envVar]) {
			throw new Error(`❌ Required environment variable ${envVar} is not set`);
		}
	}

	// Validate service availability
	const browser = await chromium.launch();
	const context = await browser.newContext();

	try {
		const response = await context.request.get('http://localhost:3001/api/health');
		if (!response.ok()) {
			throw new Error('Health check failed');
		}

		const health = await response.json();
		if (health.status !== 'healthy') {
			throw new Error(`Service status: ${health.status}`);
		}
	} catch (error) {
		throw new Error(`❌ Service validation failed: ${error}`);
	} finally {
		await browser.close();
	}

	console.log('✅ Environment validation passed');
}

export default globalSetup;
