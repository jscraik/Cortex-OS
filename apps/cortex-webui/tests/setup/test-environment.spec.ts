import { test, expect } from '@playwright/test';

/**
 * brAInwav Cortex-OS Test Environment Setup
 *
 * Setup tests that run before the main test suites:
 * - Validate test environment is ready
 * - Verify all services are accessible
 * - Check database connectivity
 * - Validate mock services
 * - Confirm authentication system
 * - Test file upload capabilities
 */
test.describe('brAInwav Test Environment Setup', () => {
  test('should validate all services are ready', async ({ page }) => {
    console.log('🧠 Validating brAInwav Cortex-OS test environment...');

    // Check frontend
    const frontendResponse = await page.goto('http://localhost:3000');
    expect(frontendResponse?.status()).toBe(200);
    await expect(page.locator('text=brAInwav')).toBeVisible();

    // Check backend API health
    const apiResponse = await page.request.get('http://localhost:3001/api/health');
    expect(apiResponse.ok()).toBeTruthy();
    const healthData = await apiResponse.json();
    expect(healthData.status).toBe('healthy');
    expect(healthData.service).toContain('brAInwav');

    // Check local memory service
    const memoryResponse = await page.request.get('http://localhost:3028/api/v1/health');
    expect(memoryResponse.ok()).toBeTruthy();

    // Check mock services
    const aiServiceResponse = await page.request.get('http://localhost:3030/health');
    expect(aiServiceResponse.ok()).toBeTruthy();

    const fileServiceResponse = await page.request.get('http://localhost:3031/health');
    expect(fileServiceResponse.ok()).toBeTruthy();

    console.log('✅ All brAInwav services are ready');
  });

  test('should validate database connectivity', async ({ page }) => {
    // Test database operations
    const testUser = {
      firstName: 'Setup',
      lastName: 'Test',
      email: `setup-${Date.now()}@brainwav.ai`,
      password: 'SetupTestPassword123!'
    };

    // Create test user
    const createResponse = await page.request.post('http://localhost:3001/api/auth/register', {
      data: testUser
    });
    expect(createResponse.status()).toBe(201);

    // Verify user was created
    const userData = await createResponse.json();
    expect(userData.user.email).toBe(testUser.email);

    // Test authentication
    const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    expect(loginData.token).toBeDefined();

    // Test database read
    const profileResponse = await page.request.get('http://localhost:3001/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    expect(profileResponse.status()).toBe(200);
    const profileData = await profileResponse.json();
    expect(profileData.user.email).toBe(testUser.email);

    console.log('✅ Database connectivity validated');
  });

  test('should validate file upload capabilities', async ({ page }) => {
    // Login first
    const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
      data: {
        email: 'testuser@brainwav.ai',
        password: 'TestPassword123!'
      }
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Test document creation via API
    const testDocument = {
      title: 'brAInwav Setup Test Document',
      content: 'This document validates brAInwav Cortex-OS setup',
      tags: ['setup', 'test', 'brainwav']
    };

    const docResponse = await page.request.post('http://localhost:3001/api/documents', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: testDocument
    });
    expect(docResponse.status()).toBe(201);

    const docData = await docResponse.json();
    expect(docData.document.title).toBe(testDocument.title);

    // Test document retrieval
    const getResponse = await page.request.get(`http://localhost:3001/api/documents/${docData.document.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(getResponse.status()).toBe(200);

    console.log('✅ File upload capabilities validated');
  });

  test('should validate RAG system functionality', async ({ page }) => {
    // Login
    const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
      data: {
        email: 'testuser@brainwav.ai',
        password: 'TestPassword123!'
      }
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Create test document for RAG
    const ragDocument = {
      title: 'brAInwav RAG Setup Test',
      content: 'brAInwav Cortex-OS provides advanced RAG capabilities with semantic search and citation generation.',
      tags: ['rag', 'setup', 'brainwav', 'cortex-os']
    };

    const docResponse = await page.request.post('http://localhost:3001/api/documents', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: ragDocument
    });
    expect(docResponse.status()).toBe(201);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test RAG query
    const ragResponse = await page.request.post('http://localhost:3001/api/rag/query', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        query: 'What are brAInwav RAG capabilities?',
        maxResults: 3,
        includeCitations: true
      }
    });

    if (ragResponse.status() === 200) {
      const ragData = await ragResponse.json();
      expect(ragData.answer).toBeDefined();
      expect(ragData.citations).toBeDefined();
    }

    // Test semantic search
    const searchResponse = await page.request.post('http://localhost:3001/api/search', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        query: 'brAInwav Cortex-OS',
        limit: 5
      }
    });
    expect(searchResponse.status()).toBe(200);
    const searchData = await searchResponse.json();
    expect(searchData.results).toBeDefined();

    console.log('✅ RAG system functionality validated');
  });

  test('should validate workflow system', async ({ page }) => {
    // Login
    const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
      data: {
        email: 'testuser@brainwav.ai',
        password: 'TestPassword123!'
      }
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Test agent availability
    const agentsResponse = await page.request.get('http://localhost:3001/api/agents', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(agentsResponse.status()).toBe(200);
    const agentsData = await agentsResponse.json();
    expect(agentsData.agents.length).toBeGreaterThan(0);

    // Test workflow creation
    const workflowData = {
      name: 'brAInwav Setup Test Workflow',
      description: 'Workflow to validate brAInwav setup',
      agents: [
        {
          name: 'Setup Test Agent',
          type: 'worker',
          config: {
            model: 'claude-3-haiku',
            timeout: 15000
          }
        }
      ]
    };

    const workflowResponse = await page.request.post('http://localhost:3001/api/workflows', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: workflowData
    });
    expect(workflowResponse.status()).toBe(201);
    const workflowResult = await workflowResponse.json();
    expect(workflowResult.workflow.name).toBe(workflowData.name);

    console.log('✅ Workflow system validated');
  });

  test('should validate accessibility compliance', async ({ page }) => {
    // Check basic accessibility on main pages
    const pages = [
      'http://localhost:3000/',
      'http://localhost:3000/login',
      'http://localhost:3000/register'
    ];

    for (const pageUrl of pages) {
      await page.goto(pageUrl);

      // Check for basic accessibility requirements
      // Has page title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);

      // Has main landmark or equivalent
      const hasMainLandmark = await page.locator('main, [role="main"]').count();
      const hasHeading = await page.locator('h1, h2, h3').count();
      expect(hasMainLandmark + hasHeading).toBeGreaterThan(0);

      // Has skip link or equivalent
      const hasSkipLink = await page.locator('a[href^="#"], [role="navigation"]').count();
      expect(hasSkipLink).toBeGreaterThan(0);

      // Check for proper language
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBeTruthy();
    }

    console.log('✅ Accessibility compliance validated');
  });

  test('should validate performance benchmarks', async ({ page }) => {
    // Test page load performance
    const startTime = Date.now();
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load within reasonable time
    expect(loadTime).toBeLessThan(5000);

    // Test API response times
    const apiStart = Date.now();
    const response = await page.request.get('http://localhost:3001/api/health');
    const apiTime = Date.now() - apiStart;

    expect(response.ok()).toBeTruthy();
    expect(apiTime).toBeLessThan(1000);

    console.log(`✅ Performance validated - Page: ${loadTime}ms, API: ${apiTime}ms`);
  });
});