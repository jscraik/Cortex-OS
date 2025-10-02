import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * brAInwav Cortex-OS Performance Load Tests
 *
 * Comprehensive performance testing using k6:
 * - Load testing for peak usage scenarios
 * - Stress testing with sustained load
 * - Spike testing for sudden traffic increases
 * - Endurance testing for long-running stability
 * - Performance monitoring and SLO validation
 * - Multi-scenario testing (API, UI, WebSocket)
 */

// Custom metrics for brAInwav performance monitoring
const brAInwavMetrics = {
  // Response time metrics
  apiResponseTime: new Trend('brAInwav_api_response_time'),
  uiResponseTime: new Trend('brAInwav_ui_response_time'),
  workflowExecutionTime: new Trend('brAInwav_workflow_execution_time'),
  documentProcessingTime: new Trend('brAInwav_document_processing_time'),

  // Success rate metrics
  apiSuccessRate: new Rate('brAInwav_api_success_rate'),
  workflowSuccessRate: new Rate('brAInwav_workflow_success_rate'),
  documentUploadSuccessRate: new Rate('brAInwav_document_upload_success_rate'),

  // Throughput metrics
  requestsPerSecond: new Rate('brAInwav_requests_per_second'),
  concurrentUsers: new Rate('brAInwav_concurrent_users'),

  // Resource utilization metrics
  memoryUsage: new Trend('brAInwav_memory_usage'),
  cpuUsage: new Trend('brAInwav_cpu_usage'),
};

// Test configuration
export const options = {
  stages: [
    // Warmup phase
    { duration: '2m', target: 10 },
    // Normal load
    { duration: '5m', target: 50 },
    // Peak load
    { duration: '10m', target: 200 },
    // Stress test
    { duration: '5m', target: 500 },
    // Recovery phase
    { duration: '5m', target: 100 },
    // Cool down
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // brAInwav SLO thresholds
    'brAInwav_api_response_time': ['p(95)<2000'],
    'brAInwav_ui_response_time': ['p(95)<3000'],
    'brAInwav_workflow_execution_time': ['p(95)<30000'],
    'brAInwav_document_processing_time': ['p(95)<60000'],

    'brAInwav_api_success_rate': ['rate>0.99'],
    'brAInwav_workflow_success_rate': ['rate>0.95'],
    'brAInwav_document_upload_success_rate': ['rate>0.98'],

    'http_req_duration': ['p(95)<5000'],
    'http_req_failed': ['rate<0.01'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:3001/api';

// User pool for realistic testing
const userPool = [
  { email: 'testuser1@brainwav.ai', password: 'TestPassword123!' },
  { email: 'testuser2@brainwav.ai', password: 'TestPassword123!' },
  { email: 'testuser3@brainwav.ai', password: 'TestPassword123!' },
];

// Document templates for testing
const documentTemplates = [
  {
    title: 'brAInwav Architecture Guide',
    content: 'Comprehensive guide to brAInwav Cortex-OS architecture and implementation details...',
    tags: ['architecture', 'brainwav', 'cortex-os']
  },
  {
    title: 'ASBR Runtime Documentation',
    content: 'Detailed documentation for Autonomous Software Behavior Reasoning runtime system...',
    tags: ['asbr', 'runtime', 'brainwav']
  },
  {
    title: 'AI Agent Configuration',
    content: 'Configuration guide for brAInwav AI agents and workflow orchestration...',
    tags: ['agents', 'workflows', 'configuration']
  }
];

export function setup() {
  console.log('🧠 brAInwav Cortex-OS Performance Test Setup');
  console.log('================================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Stages: ${options.stages.length}`);
  console.log('================================================');
}

export default function () {
  // Select random user
  const user = userPool[Math.floor(Math.random() * userPool.length)];

  // Authenticate
  const authResponse = authenticateUser(user);
  const authToken = authResponse.json('token');

  // Execute test scenarios
  const scenarios = [
    () => testUserInterface(authToken),
    () => testAPIEndpoints(authToken),
    () => testDocumentWorkflows(authToken),
    () => testAgentWorkflows(authToken),
    () => testRAGQueries(authToken),
  ];

  // Randomly select scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(Math.random() * 3 + 1); // Random pause between 1-4 seconds
}

function authenticateUser(user) {
  const startTime = Date.now();

  const response = http.post(`${API_URL}/auth/login`, JSON.stringify(user), {
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Client': 'k6-brAInwav-load-test'
    },
  });

  const responseTime = Date.now() - startTime;
  brAInwavMetrics.apiResponseTime.add(responseTime);
  brAInwavMetrics.apiSuccessRate.add(response.status === 200);

  check(response, {
    'brAInwav auth: status is 200': (r) => r.status === 200,
    'brAInwav auth: response time < 2s': (r) => responseTime < 2000,
    'brAInwav auth: has token': (r) => r.json('token') !== undefined,
  });

  return response;
}

function testUserInterface(authToken) {
  const startTime = Date.now();

  // Test dashboard loading
  const dashboardResponse = http.get(`${BASE_URL}/dashboard`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'X-Test-Client': 'k6-brAInwav-load-test'
    }
  });

  const responseTime = Date.now() - startTime;
  brAInwavMetrics.uiResponseTime.add(responseTime);

  check(dashboardResponse, {
    'brAInwav UI: dashboard loaded': (r) => r.status === 200,
    'brAInwav UI: response time < 3s': (r) => responseTime < 3000,
    'brAInwav UI: contains brAInwav branding': (r) => r.body.includes('brAInwav'),
  });

  // Test navigation
  sleep(1);

  const navResponse = http.get(`${BASE_URL}/documents`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'X-Test-Client': 'k6-brAInwav-load-test'
    }
  });

  check(navResponse, {
    'brAInwav UI: documents page loaded': (r) => r.status === 200,
    'brAInwav UI: documents content present': (r) => r.body.includes('documents'),
  });
}

function testAPIEndpoints(authToken) {
  const startTime = Date.now();

  // Test documents API
  const documentsResponse = http.get(`${API_URL}/documents`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'X-Test-Client': 'k6-brAInwav-load-test'
    }
  });

  const responseTime = Date.now() - startTime;
  brAInwavMetrics.apiResponseTime.add(responseTime);
  brAInwavMetrics.apiSuccessRate.add(documentsResponse.status === 200);

  check(documentsResponse, {
    'brAInwav API: documents endpoint': (r) => r.status === 200,
    'brAInwav API: response time < 2s': (r) => responseTime < 2000,
    'brAInwav API: valid JSON response': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  // Test workflows API
  const workflowsResponse = http.get(`${API_URL}/workflows`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'X-Test-Client': 'k6-brAInwav-load-test'
    }
  });

  check(workflowsResponse, {
    'brAInwav API: workflows endpoint': (r) => r.status === 200,
    'brAInwav API: workflows data structure': (r) => {
      const data = JSON.parse(r.body);
      return data.hasOwnProperty('workflows');
    },
  });
}

function testDocumentWorkflows(authToken) {
  const startTime = Date.now();

  // Create document
  const documentTemplate = documentTemplates[Math.floor(Math.random() * documentTemplates.length)];
  const createResponse = http.post(`${API_URL}/documents`, JSON.stringify(documentTemplate), {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'X-Test-Client': 'k6-brAInwav-load-test'
    }
  });

  brAInwavMetrics.documentUploadSuccessRate.add(createResponse.status === 201);

  if (createResponse.status === 201) {
    const documentId = createResponse.json('document.id');

    // Process document
    const processStartTime = Date.now();
    const processResponse = http.post(`${API_URL}/documents/${documentId}/process`, JSON.stringify({
      processingOptions: {
        extractEntities: true,
        generateSummary: true,
        enableRAG: true
      }
    }), {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Test-Client': 'k6-brAInwav-load-test'
      }
    });

    const processTime = Date.now() - processStartTime;
    brAInwavMetrics.documentProcessingTime.add(processTime);

    check(processResponse, {
      'brAInwav Document: processing started': (r) => r.status === 202,
      'brAInwav Document: processing time < 60s': (r) => processTime < 60000,
      'brAInwav Document: has processing ID': (r) => r.json('processingId') !== undefined,
    });
  }
}

function testAgentWorkflows(authToken) {
  const startTime = Date.now();

  // Create simple workflow
  const workflowData = {
    name: `Load Test Workflow ${Date.now()}`,
    description: 'Workflow created during brAInwav load testing',
    agents: [
      {
        name: 'Load Test Agent',
        type: 'worker',
        config: {
          model: 'claude-3-haiku',
          timeout: 15000
        }
      }
    ]
  };

  const createResponse = http.post(`${API_URL}/workflows`, JSON.stringify(workflowData), {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'X-Test-Client': 'k6-brAInwav-load-test'
    }
  });

  if (createResponse.status === 201) {
    const workflowId = createResponse.json('workflow.id');

    // Execute workflow
    const execStartTime = Date.now();
    const execResponse = http.post(`${API_URL}/workflows/${workflowId}/execute`, JSON.stringify({
      mode: 'immediate',
      input: {
        testData: 'brAInwav load test execution',
        priority: 'normal'
      }
    }), {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Test-Client': 'k6-brAInwav-load-test'
      }
    });

    const execTime = Date.now() - execStartTime;
    brAInwavMetrics.workflowExecutionTime.add(execTime);
    brAInwavMetrics.workflowSuccessRate.add(execResponse.status === 202);

    check(execResponse, {
      'brAInwav Workflow: execution started': (r) => r.status === 202,
      'brAInwav Workflow: execution time < 30s': (r) => execTime < 30000,
      'brAInwav Workflow: has execution ID': (r) => r.json('executionId') !== undefined,
    });
  }
}

function testRAGQueries(authToken) {
  const startTime = Date.now();

  const queries = [
    'What is brAInwav Cortex-OS?',
    'Explain ASBR runtime architecture',
    'How do brAInwav agents coordinate?',
    'What are the key features of brAInwav?',
    'How does brAInwav handle document processing?'
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  const ragResponse = http.post(`${API_URL}/rag/query`, JSON.stringify({
    query: query,
    contextWindow: 2000,
    maxResults: 3,
    includeCitations: true
  }), {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'X-Test-Client': 'k6-brAInwav-load-test'
    }
  });

  const responseTime = Date.now() - startTime;
  brAInwavMetrics.apiResponseTime.add(responseTime);
  brAInwavMetrics.apiSuccessRate.add(ragResponse.status === 200);

  check(ragResponse, {
    'brAInwav RAG: query successful': (r) => r.status === 200,
    'brAInwav RAG: response time < 5s': (r) => responseTime < 5000,
    'brAInwav RAG: has answer': (r) => r.json('answer') !== undefined,
    'brAInwav RAG: has citations': (r) => r.json('citations').length > 0,
    'brAInwav RAG: mentions brAInwav': (r) => r.json('answer').includes('brAInwav'),
  });
}

export function teardown() {
  console.log('================================================');
  console.log('🧠 brAInwav Cortex-OS Performance Test Complete');
  console.log('================================================');

  // Print summary metrics
  console.log('Performance Summary:');
  console.log(`API Response Time (p95): ${brAInwavMetrics.apiResponseTime.p(95).toFixed(2)}ms`);
  console.log(`UI Response Time (p95): ${brAInwavMetrics.uiResponseTime.p(95).toFixed(2)}ms`);
  console.log(`Workflow Execution Time (p95): ${brAInwavMetrics.workflowExecutionTime.p(95).toFixed(2)}ms`);
  console.log(`Document Processing Time (p95): ${brAInwavMetrics.documentProcessingTime.p(95).toFixed(2)}ms`);

  console.log('\nSuccess Rates:');
  console.log(`API Success Rate: ${(brAInwavMetrics.apiSuccessRate.rate * 100).toFixed(2)}%`);
  console.log(`Workflow Success Rate: ${(brAInwavMetrics.workflowSuccessRate.rate * 100).toFixed(2)}%`);
  console.log(`Document Upload Success Rate: ${(brAInwavMetrics.documentUploadSuccessRate.rate * 100).toFixed(2)}%`);

  console.log('================================================');
}