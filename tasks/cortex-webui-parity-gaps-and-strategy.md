# Cortex WebUI Feature Parity: Gap Analysis & Migration Strategy

## Feature Parity Matrix

| Feature Category | Open WebUI | Cortex WebUI | Status | Priority | Complexity |
|-----------------|------------|--------------|--------|----------|------------|
| **Authentication & Auth** |
| Email/Password | ✅ | ✅ | Complete | - | - |
| OAuth (GitHub, Google) | ✅ | ✅ | Complete | - | - |
| SSO (SAML, OIDC) | ✅ | ❌ | Missing | High | High |
| SCIM Provisioning | ✅ | ❌ | Missing | Medium | High |
| RBAC (Roles/Permissions) | ✅ | ❌ | Missing | High | Medium |
| User Groups | ✅ | ❌ | Missing | Medium | Low |
| **Chat Interface** |
| Real-time messaging | ✅ | ✅ | Complete | - | - |
| Streaming responses | ✅ | ✅ | Complete | - | - |
| Conversation history | ✅ | ✅ | Complete | - | - |
| Markdown rendering | ✅ | ⚠️ | Partial | Medium | Low |
| LaTeX support | ✅ | ❌ | Missing | Low | Low |
| Code syntax highlighting | ✅ | ❌ | Missing | Medium | Low |
| Conversation pinning | ✅ | ❌ | Missing | Low | Low |
| Conversation tagging | ✅ | ❌ | Missing | Low | Low |
| Multi-model concurrency | ✅ | ❌ | Missing | Medium | Medium |
| Message editing | ✅ | ❌ | Missing | Low | Low |
| Message regeneration | ✅ | ❌ | Missing | Low | Low |
| **RAG & Documents** |
| Document upload | ✅ | ⚠️ | Partial | High | - |
| PDF extraction | ✅ | ⚠️ | Partial (service exists) | High | Low |
| Word/Excel extraction | ✅ | ❌ | Missing | Medium | Medium |
| Vector storage | ✅ | ⚠️ | Backend only | High | Low |
| Semantic search | ✅ | ⚠️ | Backend only | High | Low |
| Web search integration | ✅ | ❌ | Missing | High | Medium |
| Web browsing in chat | ✅ | ❌ | Missing | Medium | High |
| Citation tracking | ✅ | ❌ | Missing | High | Medium |
| Document workspace UI | ✅ | ❌ | Missing | High | Medium |
| **Pipelines & Plugins** |
| Plugin framework | ✅ Python | ❌ | Missing | High | High |
| Function calling | ✅ | ⚠️ | MCP layer exists | High | Medium |
| Custom RAG pipelines | ✅ | ❌ | Missing | Medium | Medium |
| Filter functions (inlet/outlet) | ✅ | ❌ | Missing | Medium | Medium |
| Action functions (UI buttons) | ✅ | ❌ | Missing | Low | Low |
| Pipeline marketplace | ✅ | ❌ | Missing | Low | High |
| Admin panel for pipelines | ✅ | ❌ | Missing | High | Medium |
| **Tools & Functions** |
| Tool execution framework | ✅ | ⚠️ | Stubbed | High | Low |
| Dynamic tool registration | ✅ | ❌ | Missing | Medium | Medium |
| Community tools marketplace | ✅ | ❌ | Missing | Low | High |
| Built-in tools (weather, etc.) | ✅ | ❌ | Missing | Low | Medium |
| **Model Management** |
| Model list/CRUD | ✅ | ⚠️ | Backend only | Medium | Low |
| Model builder UI | ✅ | ❌ | Missing | Medium | Medium |
| Character/persona system | ✅ | ❌ | Missing | Low | Medium |
| System prompt templates | ✅ | ❌ | Missing | Low | Low |
| Model parameter tuning | ✅ | ❌ | Missing | Low | Low |
| Concurrent model usage | ✅ | ❌ | Missing | Medium | Medium |
| **Admin Features** |
| Admin dashboard | ✅ | ❌ | Missing | High | Medium |
| User management UI | ✅ | ❌ | Missing | High | Medium |
| Analytics & metrics | ✅ | ⚠️ | Backend monitoring only | Medium | Medium |
| Webhook integrations | ✅ | ❌ | Missing | Medium | Medium |
| Custom branding/banners | ✅ | ❌ | Missing | Low | Low |
| Audit logs | ✅ | ❌ | Missing | Medium | Medium |
| **Advanced Features** |
| Code execution sandbox | ✅ | ❌ | Missing | Medium | High |
| Evaluation system | ✅ | ❌ | Missing | Low | High |
| Image generation | ✅ | ❌ | Missing | Low | Medium |
| Voice input/output | ✅ | ⚠️ | Audio transcription exists | Low | Medium |
| PWA support | ✅ | ❌ | Missing | Low | Low |
| Multilingual UI | ✅ | ❌ | Missing | Low | Medium |
| **Infrastructure** |
| Docker deployment | ✅ | ⚠️ | Partial | High | Low |
| Kubernetes manifests | ✅ | ⚠️ | Exists but incomplete | Medium | Low |
| Environment config | ✅ | ✅ | Complete | - | - |
| Health checks | ✅ | ✅ | Complete | - | - |

### Summary Statistics
- **Complete**: 8 features (11%)
- **Partial**: 12 features (16%)
- **Missing**: 54 features (73%)
- **Total Features Analyzed**: 74

## Architecture Gap Analysis

### Gap 1: RAG Ecosystem Disconnect
**Problem**: Backend services exist for document processing, but they're not connected to the production-ready `packages/rag` system.

**Current State**:
```typescript
// apps/cortex-webui/backend/src/services/documentProcessingService.ts
// apps/cortex-webui/backend/src/services/vectorSearchService.ts
// apps/cortex-webui/backend/src/services/embeddingService.ts
// All are minimal implementations, not using packages/rag
```

**Desired State**:
```typescript
import { RAGPipeline } from '@cortex-os/rag';
import { PythonEmbedder } from '@cortex-os/rag/embed/python-client';
import { FAISSStore } from '@cortex-os/rag/store/faiss';

const ragPipeline = new RAGPipeline({
  embedder: new PythonEmbedder({ endpoint: process.env.EMBEDDING_SERVICE_URL }),
  store: new FAISSStore({ indexPath: './data/vectors' }),
  // ... config
});
```

**Migration Path**:
1. Replace backend services with RAG package wrappers
2. Add initialization code in server startup
3. Create REST endpoints for document workspace
4. Wire chat message flow to RAG retrieval
5. Add citation rendering in frontend

### Gap 2: MCP Tool Stubbing
**Problem**: 9 MCP tools are defined with Zod contracts but all return dummy data.

**Current State**:
```typescript
// All services return mock data
const defaultServices: WebuiMcpServices = {
  panel: { open: async (i) => ({ opened: i.panelId, focus: i.focus }) },
  // ... all stubs
};
```

**Desired State**:
```typescript
// Concrete implementations with real state management
class PanelServiceImpl implements PanelService {
  constructor(private wsManager: WebSocketManager) {}
  
  async open(input: OpenPanelInput): Promise<unknown> {
    const state = this.wsManager.updatePanelState(input.panelId, { open: true });
    this.wsManager.broadcast({ type: 'panel_opened', data: state });
    return state;
  }
}
```

**Migration Path**:
1. Create service implementations in `backend/src/services/mcp/`
2. Add WebSocket event emitters
3. Wire services to React state via WebSocket listeners
4. Test each tool end-to-end
5. Add telemetry/observability

### Gap 3: No Plugin System
**Problem**: Open WebUI's Python pipelines allow user-uploaded custom logic. Cortex WebUI has no equivalent.

**Proposed Solution**: TypeScript/JavaScript plugin system with sandboxing

**Architecture**:
```typescript
// packages/webui-pipelines/src/PipelineRegistry.ts
interface Pipeline {
  id: string;
  name: string;
  type: 'filter' | 'pipe' | 'action';
  version: string;
  execute(context: PipelineContext): Promise<PipelineResult>;
}

class PipelineRegistry {
  private plugins = new Map<string, Pipeline>();
  
  async load(code: string, metadata: PipelineMetadata): Promise<void> {
    // Validate, sandbox, compile, register
  }
  
  async execute(id: string, context: PipelineContext): Promise<PipelineResult> {
    const pipeline = this.plugins.get(id);
    return pipeline.execute(context);
  }
}
```

**Security Considerations**:
- Use isolated VM (VM2 or Node Worker Threads)
- Timeout enforcement
- Resource limits (memory, CPU)
- Input/output validation with Zod
- Audit logging

**Migration Path**:
1. Create `packages/webui-pipelines` package
2. Implement sandbox and registry
3. Add admin UI for upload/management
4. Create example pipelines (rate limit, translation)
5. Document API for community contributions

### Gap 4: No RBAC Layer
**Problem**: Better Auth provides authentication but no role-based access control.

**Proposed Solution**: Extend Better Auth with roles and permissions

**Schema Extension**:
```typescript
// Add to Drizzle schema
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  permissions: text('permissions', { mode: 'json' }).$type<string[]>(),
});

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').references(() => users.id),
  roleId: text('role_id').references(() => roles.id),
});
```

**Middleware**:
```typescript
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // From Better Auth session
    const hasPermission = await checkPermission(user.id, permission);
    if (!hasPermission) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
};

// Usage
router.post('/api/admin/users', requirePermission('admin.users.create'), createUser);
```

**Migration Path**:
1. Design permission schema
2. Create migration scripts
3. Implement RBAC middleware
4. Add admin UI for role management
5. Protect all admin endpoints

### Gap 5: No Admin Dashboard
**Problem**: No UI for user/model/pipeline management, analytics, or configuration.

**Proposed Components**:
```
frontend/src/pages/Admin/
  Dashboard.tsx        # Overview with metrics
  Users.tsx            # User management table
  Roles.tsx            # Role/permission editor
  Models.tsx           # Model registry CRUD
  Pipelines.tsx        # Pipeline management
  Webhooks.tsx         # Webhook configuration
  Analytics.tsx        # Usage charts
```

**Migration Path**:
1. Create admin route with auth guard
2. Build user management table with RBAC
3. Add model registry UI
4. Add pipeline management (if pipelines implemented)
5. Integrate analytics from backend monitoring

## Phased Migration Strategy

### Phase 0: Foundation (Week 1)
**Goal**: Set up architecture for upcoming features

**Tasks**:
- [ ] Create `packages/webui-pipelines` skeleton
- [ ] Add RBAC schema and migrations
- [ ] Document API contracts for new features
- [ ] Set up testing infrastructure

**Deliverables**:
- Package structure in place
- Database migrations ready
- Contract definitions in `libs/typescript/contracts`

### Phase 1: RAG Integration (Weeks 2-3)
**Goal**: Wire existing RAG package to webui backend

**Tasks**:
- [ ] Replace `documentProcessingService` with RAG pipeline wrapper
- [ ] Add FAISS persistent vector store
- [ ] Create document workspace REST endpoints
- [ ] Build React UI for document upload/management
- [ ] Integrate retrieval into chat message flow
- [ ] Add citation rendering component
- [ ] Add web search integration (optional)

**Tests**:
```typescript
describe('RAG Integration', () => {
  it('should ingest document and store vectors', async () => {
    const result = await ragPipeline.ingest({ text: '...', metadata: {...} });
    expect(result.chunks).toBeGreaterThan(0);
  });
  
  it('should retrieve relevant chunks for query', async () => {
    const results = await ragPipeline.retrieve({ query: 'test query', topK: 5 });
    expect(results).toHaveLength(5);
    expect(results[0].score).toBeGreaterThan(0.7);
  });
  
  it('should include citations in chat response', async () => {
    const response = await chatService.send({ message: 'question', useRAG: true });
    expect(response.citations).toBeDefined();
  });
});
```

**Deliverables**:
- [ ] Working RAG pipeline with persistent storage
- [ ] Document workspace UI
- [ ] Citation rendering in chat
- [ ] 90%+ test coverage
- [ ] Documentation updated

### Phase 2: MCP Service Wiring (Week 4)
**Goal**: Replace stubbed MCP services with real implementations

**Tasks**:
- [ ] Implement `PanelServiceImpl` with WebSocket updates
- [ ] Implement `ComponentStateServiceImpl` with state management
- [ ] Implement `NavigationServiceImpl` with React Router integration
- [ ] Implement `ChatServiceImpl` with message queue
- [ ] Implement `ChartServiceImpl` with charting library
- [ ] Add WebSocket event handlers in frontend
- [ ] Wire all 9 tools end-to-end

**Tests**:
```typescript
describe('MCP Tool Execution', () => {
  it('should open panel and broadcast event', async () => {
    const result = await mcpExecute({ tool: 'open_panel', args: { panelId: 'settings' } });
    expect(result.success).toBe(true);
    expect(wsEvents).toContainEqual({ type: 'panel_opened', data: { panelId: 'settings' } });
  });
  
  it('should update component state and persist', async () => {
    const result = await mcpExecute({ 
      tool: 'update_component_state', 
      args: { componentId: 'chat', path: 'theme', value: 'dark' } 
    });
    const state = await getComponentState('chat');
    expect(state.theme).toBe('dark');
  });
});
```

**Deliverables**:
- [ ] All 9 MCP tools functional
- [ ] WebSocket events working
- [ ] Frontend state updates
- [ ] 90%+ test coverage

### Phase 3: TypeScript Pipelines (Weeks 5-7)
**Goal**: Build user-uploadable plugin system

**Tasks**:
- [ ] Design pipeline contract and security model
- [ ] Implement sandbox (VM2 or Worker Threads)
- [ ] Create `PipelineRegistry` with dynamic loading
- [ ] Add validation and resource limits
- [ ] Create admin UI for pipeline upload/management
- [ ] Implement 5 example pipelines:
  - Rate limiter
  - Translation
  - Toxic message filter
  - Custom RAG
  - Weather tool
- [ ] Add pipeline execution to chat flow
- [ ] Add audit logging

**Tests**:
```typescript
describe('Pipeline System', () => {
  it('should load and execute valid pipeline', async () => {
    await registry.load(pipelineCode, { name: 'test', type: 'filter' });
    const result = await registry.execute('test', { message: 'hello' });
    expect(result.success).toBe(true);
  });
  
  it('should reject malicious pipeline code', async () => {
    const malicious = 'require("fs").unlinkSync("/")';
    await expect(registry.load(malicious, { name: 'bad' })).rejects.toThrow();
  });
  
  it('should enforce timeout on long-running pipeline', async () => {
    const slow = 'while(true) {}';
    await expect(registry.execute('slow', {})).rejects.toThrow(/timeout/i);
  });
});
```

**Deliverables**:
- [ ] Working pipeline system with sandbox
- [ ] Admin UI for management
- [ ] 5 example pipelines
- [ ] Security audit passed
- [ ] Documentation for pipeline developers

### Phase 4: RBAC & Admin Features (Weeks 8-9)
**Goal**: Enterprise-ready administration

**Tasks**:
- [ ] Apply RBAC migrations
- [ ] Implement RBAC middleware
- [ ] Create admin dashboard layout
- [ ] Build user management table with role assignment
- [ ] Build role/permission editor
- [ ] Add model registry UI
- [ ] Add webhook configuration UI
- [ ] Add analytics dashboard
- [ ] Protect all admin endpoints with permissions

**Tests**:
```typescript
describe('RBAC System', () => {
  it('should allow admin to create users', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', adminToken)
      .send({ email: 'test@example.com', role: 'user' });
    expect(res.status).toBe(201);
  });
  
  it('should deny non-admin access to admin endpoints', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', userToken)
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(403);
  });
});
```

**Deliverables**:
- [ ] RBAC system functional
- [ ] Admin dashboard complete
- [ ] User/role management working
- [ ] Analytics displayed
- [ ] 90%+ test coverage

### Phase 5: Advanced Chat Features (Weeks 10-11)
**Goal**: Feature-complete chat interface

**Tasks**:
- [ ] Add code syntax highlighting (Prism.js/Highlight.js)
- [ ] Add LaTeX rendering (KaTeX)
- [ ] Implement message editing
- [ ] Implement message regeneration
- [ ] Add conversation pinning/tagging
- [ ] Implement multi-model concurrency (use orchestration package)
- [ ] Add code execution sandbox (Docker/VM2)
- [ ] Improve markdown rendering

**Tests**:
```typescript
describe('Advanced Chat', () => {
  it('should render code with syntax highlighting', () => {
    render(<Message content="```js\nconst x = 1;\n```" />);
    expect(screen.getByText('const')).toHaveClass('token keyword');
  });
  
  it('should execute code safely in sandbox', async () => {
    const result = await codeExecutor.run('console.log("hello")', 'javascript');
    expect(result.output).toBe('hello\n');
    expect(result.error).toBeUndefined();
  });
  
  it('should use multiple models concurrently', async () => {
    const responses = await chatService.sendMultiModel({
      message: 'test',
      models: ['gpt-4', 'claude-3'],
    });
    expect(responses).toHaveLength(2);
  });
});
```

**Deliverables**:
- [ ] Enhanced markdown/LaTeX/code rendering
- [ ] Message editing/regeneration
- [ ] Conversation organization features
- [ ] Multi-model support
- [ ] Code execution (if deemed safe)
- [ ] 90%+ test coverage

### Phase 6: Model Builder & Finishing Touches (Week 12)
**Goal**: Complete remaining features

**Tasks**:
- [ ] Create model builder UI
- [ ] Add character/persona system
- [ ] Add system prompt templates
- [ ] Add model parameter tuning UI
- [ ] Implement PWA manifest
- [ ] Add i18n for multilingual support
- [ ] Add custom branding options
- [ ] Final polish and bug fixes

**Deliverables**:
- [ ] Model builder functional
- [ ] PWA support
- [ ] Multilingual UI
- [ ] Branding customization
- [ ] All quality gates passing

## Testing Strategy

### Unit Tests
- All new functions/services: 90%+ coverage
- Use Vitest with brAInwav test setup
- Mock external dependencies (DB, APIs)

### Integration Tests
- RAG pipeline end-to-end
- MCP tool execution with WebSocket
- Pipeline loading and execution
- RBAC enforcement across all endpoints

### E2E Tests
- User flows: login → upload document → ask question → see citations
- Admin flows: create user → assign role → verify permissions
- Pipeline flows: upload pipeline → enable → test in chat

### Security Tests
- OWASP LLM Top 10 compliance
- Input validation with Zod
- Sandbox escape attempts
- Rate limiting
- SQL injection attempts
- XSS attempts

## Governance Compliance

### CODESTYLE.md Checklist
- [ ] Named exports only
- [ ] Functions ≤ 40 lines
- [ ] async/await (no .then())
- [ ] Classes only when required
- [ ] Composite: true in tsconfig.json

### Architecture Checklist
- [ ] Contracts-first (Zod schemas in libs/typescript/contracts)
- [ ] Event-driven (A2A events for cross-feature)
- [ ] No cross-imports between sibling packages
- [ ] Domain/app/infra layering
- [ ] 90%+ test coverage

### Quality Gates
- [ ] pnpm lint (no errors)
- [ ] pnpm test (all passing)
- [ ] pnpm security:scan (no high/critical)
- [ ] pnpm structure:validate (no violations)
- [ ] pnpm readiness:check (all pass)

## Risk Mitigation

### Risk 1: Feature Drift
**Mitigation**: 
- Monitor Open WebUI releases
- Quarterly sync reviews
- Community feedback loop
- Automated dependency updates

### Risk 2: Sandbox Security
**Mitigation**:
- Use battle-tested VM2 or Worker Threads
- Regular security audits
- Penetration testing
- Bug bounty program

### Risk 3: Performance (Node.js vs Python)
**Mitigation**:
- Benchmark RAG operations
- Use Rust/Python for ML workloads
- Optimize TypeScript pipelines
- Consider hybrid architecture

### Risk 4: Community Adoption
**Mitigation**:
- Provide Python → TypeScript migration guide
- Support both Python and TypeScript pipelines (hybrid)
- Active community engagement
- Example pipeline library

## Success Metrics

### Feature Parity
- Target: 95% feature parity with Open WebUI within 12 weeks
- Measure: Feature matrix completion percentage

### Performance
- Chat response latency: < 200ms (p95)
- RAG retrieval: < 500ms (p95)
- Pipeline execution: < 1s timeout
- Concurrent users: 100+ without degradation

### Quality
- Test coverage: 90%+ (enforced by CI)
- Security: Zero high/critical vulnerabilities
- Accessibility: WCAG 2.2 AA compliance
- Browser support: Chrome, Firefox, Safari (latest 2 versions)

### Adoption
- User satisfaction: 4.5+ / 5
- Admin adoption: 80%+ enterprises enable RBAC
- Pipeline adoption: 10+ community pipelines within 6 months

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 0: Foundation | 1 week | Package structure, schemas, contracts |
| Phase 1: RAG Integration | 2 weeks | Working RAG, document workspace, citations |
| Phase 2: MCP Wiring | 1 week | All 9 MCP tools functional |
| Phase 3: TypeScript Pipelines | 3 weeks | Plugin system with examples |
| Phase 4: RBAC & Admin | 2 weeks | Admin dashboard, user/role management |
| Phase 5: Advanced Chat | 2 weeks | Enhanced chat, multi-model, code exec |
| Phase 6: Model Builder | 1 week | Model builder, PWA, i18n |
| **Total** | **12 weeks** | **95% feature parity achieved** |

---

**Next Action**: Proceed to Phase 0 TDD planning or request specific phase deep-dive.
