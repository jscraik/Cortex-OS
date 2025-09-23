# Cortex-OS Application Deployment TDD Plan

## brAInwav Engineering - Second Brain Deployment Strategy

**Target Application:** `apps/cortex-os` - Core Runtime & Second Brain  
**Current Status:** 🚨 CRITICAL - Cannot compile, deploy, or run  
**Production Impact:** Complete second brain unavailability  
**Timeline:** 5-7 days after A2A messaging fixes  
**TDD Approach:** Runtime-First, Service-Oriented Development  

---

## 🎯 Mission: Deploy Cortex-OS as Functional Second Brain

### Vision

Transform Cortex-OS from a non-functional codebase into a production-ready second brain system capable of:

- 🧠 **Knowledge Management** via RAG system
- 🤖 **Agent Orchestration** for task automation 
- - 📝 **Memory Management** for long-term retention
- 🔗 **MCP Integration** for external tool connectivity
- 📊 **Observability** for system health monitoring
- 🌐 **Web Interface** for user interaction
- 📈 **Metrics & Analytics** for system performance
- 🎯 **Mission Critical** for user experience
- Agents Package Integration

### Current Blockers

- **Compilation Failure** - Cannot build due to A2A dependency issues
- **Missing Runtime Services** - Incomplete service wiring
- **No Health Checks** - Cannot verify system readiness
- **Broken Dependencies** - Repository interfaces undefined
- **No Deployment Pipeline** - Cannot systematically deploy

---

## 🏗️ TDD Implementation Strategy

### Phase 1: Runtime Foundation & Basic Services (Day 1-2)

#### 1.1 Write Failing Runtime Tests

```typescript
// apps/cortex-os/tests/runtime/basic-startup.test.ts
describe('Cortex-OS Basic Runtime', () => {
  it('should start runtime without compilation errors', async () => {
    // This will initially fail due to compilation issues
    const { startRuntime } = await import('../src/runtime');
    
    expect(startRuntime).toBeDefined();
    expect(typeof startRuntime).toBe('function');
  });

  it('should initialize core services on startup', async () => {
    const runtime = await startRuntime();
    
    expect(runtime.httpUrl).toMatch(/^http:\/\/.*:\d+$/);
    expect(runtime.mcpUrl).toMatch(/^http:\/\/.*:\d+$/);  
    expect(runtime.events).toBeDefined();
    expect(runtime.stop).toBeDefined();
    
    await runtime.stop();
  });

  it('should fail gracefully if dependencies unavailable', async () => {
    // Mock missing dependencies
    const mockContainer = createMockContainer();
    mockContainer.get.mockImplementation(() => {
      throw new Error('Service not available');
    });
    
    await expect(startRuntime()).rejects.toThrow('Service not available');
  });
});
```

#### 1.2 Repository Interface Implementation Tests

```typescript
// apps/cortex-os/tests/persistence/repository-contracts.test.ts
describe('Repository Contract Implementation', () => {
  describe('TaskRepository', () => {
    it('should implement CRUD operations', async () => {
      const taskRepo = container.get<TaskRepository>(TOKENS.TaskRepository);
      
      const task = {
        id: 'task-123',
        title: 'Test Task',
        status: 'pending',
        createdAt: new Date()
      };
      
      // Create
      await taskRepo.create(task);
      
      // Read
      const retrieved = await taskRepo.findById('task-123');
      expect(retrieved).toMatchObject(task);
      
      // Update
      await taskRepo.update('task-123', { status: 'completed' });
      const updated = await taskRepo.findById('task-123');
      expect(updated.status).toBe('completed');
      
      // Delete
      await taskRepo.delete('task-123');
      const deleted = await taskRepo.findById('task-123');
      expect(deleted).toBeNull();
    });
  });

  // Similar tests for ProfileRepository, ArtifactRepository, EvidenceRepository
});
```

#### 1.3 Service Wiring Tests

```typescript
// apps/cortex-os/tests/boot/service-wiring.test.ts
describe('Service Container Wiring', () => {
  it('should wire all required services', () => {
    const services = [
      'Memories',
      'Orchestration', 
      'MCPGateway',
      'TaskRepository',
      'ProfileRepository',
      'ArtifactRepository',
      'EvidenceRepository'
    ];
    
    for (const serviceName of services) {
      const token = TOKENS[serviceName];
      expect(() => container.get(token)).not.toThrow();
    }
  });

  it('should implement singleton pattern for stateful services', () => {
    const memories1 = container.get(TOKENS.Memories);
    const memories2 = container.get(TOKENS.Memories);
    
    expect(memories1).toBe(memories2); // Same instance
  });
});
```

### Phase 2: HTTP Server & API Implementation (Day 3)

#### 2.1 HTTP Server Tests

```typescript
// apps/cortex-os/tests/http/runtime-server.test.ts
describe('Runtime HTTP Server', () => {
  let server: RuntimeHttpServer;
  let runtime: RuntimeHandle;
  
  beforeEach(async () => {
    runtime = await startRuntime();
    server = runtime.httpServer;
  });
  
  afterEach(async () => {
    await runtime.stop();
  });

  it('should serve health check endpoint', async () => {
    const response = await fetch(`${runtime.httpUrl}/health`);
    
    expect(response.status).toBe(200);
    
    const health = await response.json();
    expect(health).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      services: expect.any(Object)
    });
  });

  it('should serve task management endpoints', async () => {
    // POST /tasks - Create task
    const createResponse = await fetch(`${runtime.httpUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Task',
        description: 'Testing task creation'
      })
    });
    
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.id).toBeDefined();
    
    // GET /tasks/:id - Retrieve task
    const getResponse = await fetch(`${runtime.httpUrl}/tasks/${created.id}`);
    expect(getResponse.status).toBe(200);
    
    const retrieved = await getResponse.json();
    expect(retrieved.title).toBe('Test Task');
  });

  it('should handle CORS for web UI integration', async () => {
    const response = await fetch(`${runtime.httpUrl}/health`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });
});
```

#### 2.2 MCP Server Integration Tests  

```typescript
// apps/cortex-os/tests/mcp/mcp-server.test.ts
describe('MCP Server Integration', () => {
  let runtime: RuntimeHandle;
  
  beforeEach(async () => {
    runtime = await startRuntime();
  });
  
  afterEach(async () => {
    await runtime.stop();
  });

  it('should serve MCP protocol endpoints', async () => {
    const response = await fetch(`${runtime.mcpUrl}/mcp/tools/list`);
    
    expect(response.status).toBe(200);
    const tools = await response.json();
    expect(Array.isArray(tools)).toBe(true);
  });

  it('should handle tool execution requests', async () => {
    const toolRequest = {
      tool: 'memory_search',
      parameters: {
        query: 'test knowledge',
        limit: 10
      }
    };
    
    const response = await fetch(`${runtime.mcpUrl}/mcp/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolRequest)
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
```

### Phase 3: Event System & A2A Integration (Day 4)

#### 3.1 Event Manager Tests

```typescript
// apps/cortex-os/tests/events/event-manager.test.ts
describe('Event Manager', () => {
  let runtime: RuntimeHandle;
  
  beforeEach(async () => {
    runtime = await startRuntime();
  });
  
  afterEach(async () => {
    await runtime.stop();
  });

  it('should emit runtime events', async () => {
    const events: any[] = [];
    
    runtime.events.on('runtime.started', (event) => {
      events.push(event);
    });
    
    await runtime.events.emitEvent({
      type: 'runtime.started',
      data: {
        httpUrl: runtime.httpUrl,
        mcpUrl: runtime.mcpUrl,
        startedAt: new Date().toISOString()
      }
    });
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('runtime.started');
  });

  it('should integrate with A2A messaging', async () => {
    const publishedMessages: any[] = [];
    
    // Mock A2A publish to capture messages
    const originalPublish = runtime.a2a.publish;
    runtime.a2a.publish = vi.fn(async (type, payload) => {
      publishedMessages.push({ type, payload });
      return originalPublish(type, payload);
    });
    
    await runtime.events.emitEvent({
      type: 'task.completed',
      data: { taskId: 'task-123', result: 'success' }
    });
    
    expect(publishedMessages).toHaveLength(1);
    expect(publishedMessages[0].type).toBe('task.completed');
  });
});
```

#### 3.2 Second Brain Functionality Tests

```typescript
// apps/cortex-os/tests/integration/second-brain.test.ts
describe('Second Brain Integration', () => {
  let runtime: RuntimeHandle;
  
  beforeEach(async () => {
    runtime = await startRuntime();
    await waitForServicesReady(runtime);
  });
  
  afterEach(async () => {
    await runtime.stop();
  });

  it('should handle knowledge storage and retrieval', async () => {
    // Store knowledge
    const storeResponse = await fetch(`${runtime.httpUrl}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Cortex-OS is a second brain system',
        tags: ['cortex', 'ai', 'knowledge']
      })
    });
    
    expect(storeResponse.status).toBe(201);
    const stored = await storeResponse.json();
    
    // Retrieve knowledge
    const searchResponse = await fetch(`${runtime.httpUrl}/knowledge/search?q=second brain`);
    expect(searchResponse.status).toBe(200);
    
    const results = await searchResponse.json();
    expect(results.items).toContainEqual(
      expect.objectContaining({
        content: expect.stringContaining('second brain')
      })
    );
  });

  it('should orchestrate agent workflows', async () => {
    const workflowRequest = {
      type: 'knowledge_extraction',
      input: {
        text: 'Extract key concepts from this technical document...',
        format: 'markdown'
      }
    };
    
    const response = await fetch(`${runtime.httpUrl}/agents/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowRequest)
    });
    
    expect(response.status).toBe(202); // Accepted, async processing
    const workflow = await response.json();
    expect(workflow.id).toBeDefined();
    expect(workflow.status).toBe('running');
  });

  it('should provide system observability', async () => {
    const metricsResponse = await fetch(`${runtime.httpUrl}/metrics`);
    expect(metricsResponse.status).toBe(200);
    
    const metrics = await metricsResponse.text();
    expect(metrics).toContain('cortex_runtime_uptime');
    expect(metrics).toContain('cortex_messages_processed');
    expect(metrics).toContain('cortex_memory_usage');
  });
});
```

### Phase 4: Production Deployment & Monitoring (Day 5-6)

#### 4.1 Environment Configuration Tests

```typescript
// apps/cortex-os/tests/deployment/environment.test.ts
describe('Environment Configuration', () => {
  it('should validate required environment variables', () => {
    const requiredEnvVars = [
      'CORTEX_HTTP_PORT',
      'CORTEX_HTTP_HOST', 
      'CORTEX_MCP_MANAGER_PORT',
      'CORTEX_MCP_MANAGER_HOST'
    ];
    
    for (const envVar of requiredEnvVars) {
      process.env[envVar] = ''; // Clear env var
      
      expect(() => startRuntime()).rejects.toThrow(
        expect.stringContaining(envVar)
      );
    }
  });

  it('should use secure defaults in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORTEX_PRIVACY_MODE = 'true';
    
    const config = parseRuntimeConfig();
    
    expect(config.privacyMode).toBe(true);
    expect(config.httpHost).toBe('127.0.0.1'); // Localhost only
  });
});
```

#### 4.2 Health Check & Monitoring Tests

```typescript
// apps/cortex-os/tests/monitoring/health-checks.test.ts
describe('Health Checks & Monitoring', () => {
  let runtime: RuntimeHandle;
  
  beforeEach(async () => {
    runtime = await startRuntime();
  });
  
  afterEach(async () => {
    await runtime.stop();
  });

  it('should report healthy status when all services running', async () => {
    const response = await fetch(`${runtime.httpUrl}/health`);
    const health = await response.json();
    
    expect(health.status).toBe('healthy');
    expect(health.services).toMatchObject({
      http: { status: 'healthy' },
      mcp: { status: 'healthy' },
      a2a: { status: 'healthy' },
      memory: { status: 'healthy' }
    });
  });

  it('should report degraded status if services unavailable', async () => {
    // Simulate service failure
    await runtime.memories.shutdown();
    
    const response = await fetch(`${runtime.httpUrl}/health`);
    const health = await response.json();
    
    expect(health.status).toBe('degraded');
    expect(health.services.memory.status).toBe('unhealthy');
  });

  it('should provide Prometheus metrics', async () => {
    const response = await fetch(`${runtime.httpUrl}/metrics`);
    const metrics = await response.text();
    
    // Check for key metrics
    expect(metrics).toMatch(/cortex_runtime_uptime_seconds \d+/);
    expect(metrics).toMatch(/cortex_http_requests_total \d+/);
    expect(metrics).toMatch(/cortex_memory_usage_bytes \d+/);
  });
});
```

### Phase 5: End-to-End Second Brain Validation (Day 7)

#### 5.1 Complete Workflow Tests

```typescript
// apps/cortex-os/tests/e2e/second-brain-workflows.test.ts
describe('Second Brain End-to-End Workflows', () => {
  let runtime: RuntimeHandle;
  
  beforeEach(async () => {
    runtime = await startRuntime();
    await waitForServicesReady(runtime, 30000);
  });
  
  afterEach(async () => {
    await runtime.stop();
  });

  it('should complete knowledge ingestion workflow', async () => {
    // 1. Ingest document
    const document = {
      title: 'TDD Best Practices',
      content: 'Test-driven development improves code quality...',
      source: 'internal-docs'
    };
    
    const ingestResponse = await fetch(`${runtime.httpUrl}/knowledge/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document)
    });
    
    expect(ingestResponse.status).toBe(202);
    const ingestion = await ingestResponse.json();
    
    // 2. Wait for processing completion
    await waitForIngestionComplete(runtime, ingestion.id);
    
    // 3. Verify searchability
    const searchResponse = await fetch(
      `${runtime.httpUrl}/knowledge/search?q=test-driven development`
    );
    const results = await searchResponse.json();
    
    expect(results.items).toContainEqual(
      expect.objectContaining({
        title: 'TDD Best Practices'
      })
    );
  });

  it('should complete agent orchestration workflow', async () => {
    // 1. Submit complex task
    const task = {
      type: 'document_analysis',
      input: {
        url: 'https://example.com/technical-paper.pdf',
        analysis_type: 'summary_and_concepts'
      }
    };
    
    const taskResponse = await fetch(`${runtime.httpUrl}/agents/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    
    const createdTask = await taskResponse.json();
    
    // 2. Monitor task progress
    const progressUpdates = await monitorTaskProgress(runtime, createdTask.id);
    
    expect(progressUpdates).toContainEqual(
      expect.objectContaining({ status: 'completed' })
    );
    
    // 3. Verify results stored
    const resultsResponse = await fetch(
      `${runtime.httpUrl}/agents/tasks/${createdTask.id}/results`
    );
    const results = await resultsResponse.json();
    
    expect(results).toMatchObject({
      summary: expect.any(String),
      concepts: expect.any(Array),
      confidence: expect.any(Number)
    });
  });
});
```

---

## 🎯 Success Criteria & Validation

### ✅ Runtime Functionality

- [ ] **Cortex-OS starts** without compilation errors
- [ ] **All core services** initialize successfully
- [ ] **HTTP server** responds to health checks
- [ ] **MCP server** handles tool requests
- [ ] **Event system** publishes/subscribes correctly

### ✅ Second Brain Capabilities

- [ ] **Knowledge ingestion** processes documents
- [ ] **Semantic search** returns relevant results
- [ ] **Agent workflows** execute end-to-end
- [ ] **Task orchestration** completes successfully
- [ ] **System observability** provides metrics

### ✅ Production Readiness

- [ ] **Environment configuration** validated
- [ ] **Health checks** comprehensive and accurate
- [ ] **Graceful shutdown** implemented
- [ ] **Error handling** robust and logged
- [ ] **Performance** meets second brain requirements

### ✅ Integration Validation

- [ ] **A2A messaging** reliable cross-service
- [ ] **Repository persistence** data integrity
- [ ] **Web UI compatibility** API contracts
- [ ] **Docker deployment** containerized operation

---

## 🔧 Implementation Commands

### Pre-requisites (Complete A2A fixes first)

```bash
# Ensure A2A messaging is fixed
cd /Users/jamiecraik/.Cortex-OS
pnpm typecheck:smart --filter @cortex-os/a2a-core
# Should return 0 errors
```

### Day 1-2: Runtime Foundation

```bash
# Create test structure
mkdir -p apps/cortex-os/tests/{runtime,persistence,boot}

# Implement repository interfaces
vi apps/cortex-os/src/persistence/

# Fix compilation errors
pnpm typecheck apps/cortex-os
```

### Day 3: HTTP & MCP Servers

```bash
# Implement HTTP endpoints
vi apps/cortex-os/src/http/runtime-server.ts

# Test server functionality
pnpm test apps/cortex-os/tests/http/
```

### Day 4: Event System Integration  

```bash
# Implement event manager
vi apps/cortex-os/src/events/

# Test A2A integration
pnpm test apps/cortex-os/tests/events/
```

### Day 5-6: Production Deployment

```bash
# Environment configuration
vi apps/cortex-os/src/config/

# Health checks & monitoring
vi apps/cortex-os/src/monitoring/

# Docker testing
docker compose -f docker/docker-compose.yml up cortex-os
```

### Day 7: End-to-End Validation

```bash
# Run complete test suite
pnpm test apps/cortex-os/

# Deployment validation
./scripts/deploy-validation.sh
```

---

## 🚀 Expected Outcomes

### Before Implementation

```bash
❌ cortex-os compilation fails
❌ Cannot start runtime services
❌ No functional second brain
❌ Docker deployment broken
```

### After Implementation

```bash
✅ cortex-os compiles and runs
✅ All runtime services operational
✅ Second brain functionality verified
✅ Docker deployment successful
✅ 95%+ test coverage achieved
✅ Production monitoring active
```

---

## 📋 Risk Mitigation

### Risk: Service Dependencies Unavailable

**Mitigation:** Mock interfaces, graceful degradation, health checks

### Risk: Performance Issues Under Load

**Mitigation:** Load testing, resource limits, monitoring alerts  

### Risk: Data Persistence Failures

**Mitigation:** Repository pattern, transaction handling, backup strategies

### Risk: Docker Environment Inconsistencies

**Mitigation:** Environment validation, containerized testing, reproducible builds

---

**Previous Plan:** [01-A2A-MESSAGING-TDD-PLAN.md](./01-A2A-MESSAGING-TDD-PLAN.md)  
**Next Plan:** [03-DOCKER-ORCHESTRATION-TDD-PLAN.md](./03-DOCKER-ORCHESTRATION-TDD-PLAN.md)  
**Co-authored-by: brAInwav Development Team**
