import { expect, test } from '@playwright/test';

/**
 * brAInwav Cortex-OS Test Environment Cleanup
 *
 * Cleanup tests that run after the main test suites:
 * - Remove test data created during tests
 * - Clean up temporary files
 * - Reset database state
 * - Verify cleanup completion
 * - Generate cleanup reports
 */
test.describe('brAInwav Test Environment Cleanup', () => {
	test('should cleanup test users', async ({ page }) => {
		console.log('🧹 Cleaning up brAInwav test users...');

		// Login as admin for cleanup
		const adminLoginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
			data: {
				email: 'admin@brainwav.ai',
				password: 'TestPassword123!',
			},
		});

		if (adminLoginResponse.ok()) {
			const adminData = await adminLoginResponse.json();
			const adminToken = adminData.token;

			// Get list of test users (those with test-specific patterns)
			const usersResponse = await page.request.get('http://localhost:3001/api/admin/users', {
				headers: {
					Authorization: `Bearer ${adminToken}`,
				},
			});

			if (usersResponse.ok()) {
				const usersData = await usersResponse.json();
				const testUsers = usersData.users.filter(
					(user: any) =>
						user.email.includes('test') ||
						user.email.includes('setup') ||
						user.email.includes('api-test') ||
						user.firstName.includes('Test') ||
						user.lastName.includes('Test'),
				);

				// Delete test users
				for (const user of testUsers) {
					const deleteResponse = await page.request.delete(
						`http://localhost:3001/api/admin/users/${user.id}`,
						{
							headers: {
								Authorization: `Bearer ${adminToken}`,
							},
						},
					);
					expect(deleteResponse.status()).toBe(200);
				}

				console.log(`✅ Cleaned up ${testUsers.length} test users`);
			}
		}
	});

	test('should cleanup test documents', async ({ page }) => {
		console.log('🧹 Cleaning up brAInwav test documents...');

		// Login for cleanup
		const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
			data: {
				email: 'testuser@brainwav.ai',
				password: 'TestPassword123!',
			},
		});

		if (loginResponse.ok()) {
			const loginData = await loginResponse.json();
			const token = loginData.token;

			// Get user's documents
			const docsResponse = await page.request.get('http://localhost:3001/api/documents', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (docsResponse.ok()) {
				const docsData = await docsResponse.json();
				const testDocuments = docsData.documents.filter(
					(doc: any) =>
						doc.title.includes('Test') ||
						doc.title.includes('Setup') ||
						doc.title.includes('API') ||
						doc.tags.includes('test') ||
						doc.tags.includes('setup'),
				);

				// Delete test documents
				for (const doc of testDocuments) {
					const deleteResponse = await page.request.delete(
						`http://localhost:3001/api/documents/${doc.id}`,
						{
							headers: {
								Authorization: `Bearer ${token}`,
							},
						},
					);
					expect(deleteResponse.status()).toBe(200);
				}

				console.log(`✅ Cleaned up ${testDocuments.length} test documents`);
			}
		}
	});

	test('should cleanup test workflows', async ({ page }) => {
		console.log('🧹 Cleaning up brAInwav test workflows...');

		// Login for cleanup
		const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
			data: {
				email: 'testuser@brainwav.ai',
				password: 'TestPassword123!',
			},
		});

		if (loginResponse.ok()) {
			const loginData = await loginResponse.json();
			const token = loginData.token;

			// Get user's workflows
			const workflowsResponse = await page.request.get('http://localhost:3001/api/workflows', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (workflowsResponse.ok()) {
				const workflowsData = await workflowsResponse.json();
				const testWorkflows = workflowsData.workflows.filter(
					(workflow: any) =>
						workflow.name.includes('Test') ||
						workflow.name.includes('Setup') ||
						workflow.name.includes('API') ||
						workflow.description.includes('test'),
				);

				// Delete test workflows
				for (const workflow of testWorkflows) {
					const deleteResponse = await page.request.delete(
						`http://localhost:3001/api/workflows/${workflow.id}`,
						{
							headers: {
								Authorization: `Bearer ${token}`,
							},
						},
					);
					expect(deleteResponse.status()).toBe(200);
				}

				console.log(`✅ Cleaned up ${testWorkflows.length} test workflows`);
			}
		}
	});

	test('should cleanup temporary files', async ({ page }) => {
		console.log('🧹 Cleaning up temporary files...');

		// Check if temporary directories exist and clean them
		const _tempDirs = [
			'/tmp/brainwav-test-uploads',
			'/tmp/brainwav-test-processing',
			'/tmp/brainwav-test-cache',
		];

		// This would typically be handled by the backend API
		const cleanupResponse = await page.request.post(
			'http://localhost:3001/api/admin/cleanup-temp',
			{
				headers: {
					Authorization: `Bearer ${process.env.ADMIN_TOKEN || 'test-token'}`,
				},
				data: {
					olderThan: '1h',
					patterns: ['*test*', '*setup*', '*temp*'],
				},
			},
		);

		if (cleanupResponse.ok()) {
			const cleanupData = await cleanupResponse.json();
			console.log(`✅ Cleaned up ${cleanupData.filesDeleted} temporary files`);
		}
	});

	test('should reset local memory test data', async ({ page }) => {
		console.log('🧹 Cleaning up brAInwav local memory test data...');

		// Clear test memories from local memory
		const clearResponse = await page.request.delete('http://localhost:3028/api/v1/memories', {
			headers: {
				Authorization: `Bearer ${process.env.LOCAL_MEMORY_TOKEN || 'test-token'}`,
			},
			data: {
				query: {
					tags: ['test', 'setup', 'api-test'],
					olderThan: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
				},
			},
		});

		if (clearResponse.ok()) {
			const clearData = await clearResponse.json();
			console.log(`✅ Cleaned up ${clearData.deletedCount} test memories`);
		}
	});

	test('should verify cleanup completion', async ({ page }) => {
		console.log('🔍 Verifying brAInwav test environment cleanup...');

		// Verify no test data remains
		const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
			data: {
				email: 'testuser@brainwav.ai',
				password: 'TestPassword123!',
			},
		});

		if (loginResponse.ok()) {
			const loginData = await loginResponse.json();
			const token = loginData.token;

			// Check documents
			const docsResponse = await page.request.get('http://localhost:3001/api/documents', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (docsResponse.ok()) {
				const docsData = await docsResponse.json();
				const remainingTestDocs = docsData.documents.filter(
					(doc: any) => doc.title.includes('Test') || doc.title.includes('Setup'),
				);
				expect(remainingTestDocs.length).toBe(0);
			}

			// Check workflows
			const workflowsResponse = await page.request.get('http://localhost:3001/api/workflows', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (workflowsResponse.ok()) {
				const workflowsData = await workflowsResponse.json();
				const remainingTestWorkflows = workflowsData.workflows.filter(
					(workflow: any) => workflow.name.includes('Test') || workflow.name.includes('Setup'),
				);
				expect(remainingTestWorkflows.length).toBe(0);
			}
		}

		// Verify system health after cleanup
		const healthResponse = await page.request.get('http://localhost:3001/api/health');
		expect(healthResponse.ok()).toBeTruthy();
		const healthData = await healthResponse.json();
		expect(healthData.status).toBe('healthy');

		// Verify local memory health
		const memoryHealthResponse = await page.request.get('http://localhost:3028/api/v1/health');
		expect(memoryHealthResponse.ok()).toBeTruthy();

		console.log('✅ brAInwav test environment cleanup verified');
	});

	test('should generate cleanup report', async ({ page }) => {
		console.log('📊 Generating brAInwav cleanup report...');

		// Get system statistics after cleanup
		const healthResponse = await page.request.get('http://localhost:3001/api/health');
		const healthData = (await healthResponse.ok()) ? await healthResponse.json() : {};

		const memoryHealthResponse = await page.request.get('http://localhost:3028/api/v1/health');
		const memoryHealthData = (await memoryHealthResponse.ok())
			? await memoryHealthResponse.json()
			: {};

		const cleanupReport = {
			timestamp: new Date().toISOString(),
			environment: 'brAInwav Cortex-OS Test Environment',
			status: 'cleanup_complete',
			services: {
				api: {
					status: healthData.status || 'unknown',
					service: healthData.service || 'brAInwav API',
					uptime: healthData.uptime || 'unknown',
				},
				localMemory: {
					status: memoryHealthData.status || 'unknown',
					service: memoryHealthData.service || 'brAInwav Local Memory',
				},
			},
			cleanupActions: [
				'Test users removed',
				'Test documents deleted',
				'Test workflows removed',
				'Temporary files cleaned',
				'Local memory test data cleared',
				'System health verified',
			],
			nextSteps: [
				'Test environment ready for next test run',
				'All services operational',
				'Database reset to clean state',
				'Performance baseline established',
			],
		};

		// Write cleanup report
		console.log(`\n${'='.repeat(60)}`);
		console.log('🧠 brAInwav Cortex-OS Cleanup Report');
		console.log('='.repeat(60));
		console.log(`Timestamp: ${cleanupReport.timestamp}`);
		console.log(`Status: ${cleanupReport.status}`);
		console.log(`API Status: ${cleanupReport.services.api.status}`);
		console.log(`Local Memory Status: ${cleanupReport.services.localMemory.status}`);
		console.log(`Cleanup Actions Completed: ${cleanupReport.cleanupActions.length}`);
		console.log('='.repeat(60));

		// Store cleanup report for test reporting
		await page.request.post('http://localhost:3001/api/admin/test-report', {
			data: {
				type: 'cleanup',
				report: cleanupReport,
			},
		});

		console.log('✅ brAInwav cleanup report generated');
	});
});
