# Cortex WebUI → Open WebUI Feature Parity Research

## Executive Summary

Cortex WebUI is a React/TypeScript port of Open WebUI (originally Svelte/Python) but currently implements only ~15% of Open WebUI's features. This research document catalogs the gaps and identifies integration points within the existing Cortex-OS architecture.

## Current Implementation Status

### ✅ Implemented Features
- **Authentication**: Better Auth with email/OAuth providers
- **Basic Chat**: Real-time messaging with WebSocket support
- **Conversation Management**: CRUD operations for conversations/messages
- **File Upload**: Multimodal processing (images, audio, PDFs)
- **Theming**: Dark/light mode support
- **MCP Tool Layer**: Contract-defined tool execution (stubbed)

### ❌ Missing Critical Features

#### 1. RAG & Document Processing (High Priority)
**Open WebUI Features:**
- Document extraction (PDF, Word, Excel, PowerPoint)
- Vector storage with semantic search
- Web search integration
- Web browsing capabilities
- Citation tracking and source attribution

**Cortex-OS Assets:**
- ✅ `packages/rag`: Full RAG pipeline with:
  - `RAGPipeline` class for ingest/retrieval
  - Multi-provider embedding support (Python client, OpenAI, local)
  - Qwen3 reranking
  - Memory/FAISS/vector stores
  - 95% test coverage
- ✅ Document processing services in webui backend:
  - `documentProcessingService.ts`
  - `pdfWithImagesService.ts`
  - `vectorSearchService.ts`
  - `embeddingService.ts`

**Gap Analysis:**
- Backend services exist but **not connected** to RAG package
- No UI for document upload to RAG workspace
- Missing web search integration
- No citation tracking in chat responses

#### 2. Pipelines System (High Priority)
**Open WebUI Features:**
- Python-based plugin framework
- Custom logic injection (function calling, RAG, monitoring)
- Admin panel for pipeline management
- Community marketplace (1-click install)
- Examples: rate limiting, translation, toxic filter, custom agents

**Cortex-OS Assets:**
- ✅ `packages/orchestration`: LangGraph-based orchestration
  - Multi-agent coordination
  - Event-driven workflows
  - BVOO (Bounded, Validated, Observable) principle
- ✅ `packages/a2a`: Agent-to-agent event bus
- ✅ MCP tool contracts in `libs/typescript/contracts`

**Gap Analysis:**
- No plugin loading mechanism (Python or TypeScript)
- No admin UI for pipeline management
- Orchestration package is designed for internal use, not user-uploadable plugins
- Need TypeScript alternative to Python pipelines

#### 3. Tools & Functions (Medium Priority)
**Open WebUI Features:**
- **Pipe Functions**: Create custom agents/models
- **Filter Functions**: Modify inputs/outputs (inlet/outlet)
- **Action Functions**: Add custom UI buttons
- Community marketplace integration

**Cortex-OS Assets:**
- ✅ MCP tool execution framework in webui backend
- ✅ `libs/typescript/contracts/webuiMcpTools`
- ✅ 9 defined tools (panel, navigation, chat, chart, timeline, etc.)
- ⚠️ All implementations are **stubs** returning mock data

**Gap Analysis:**
- Stubbed implementations need concrete service wiring
- No dynamic tool registration (all hardcoded)
- No marketplace or community tool loading
- Missing filter/action function types

#### 4. Admin & Enterprise Features (Medium Priority)
**Open WebUI Features:**
- RBAC with user groups/permissions
- SSO (federated auth) + SCIM provisioning
- Webhook integrations
- Custom banners and branding
- Model management UI
- Usage analytics

**Cortex-OS Assets:**
- ✅ Better Auth (supports OAuth)
- ✅ Monitoring framework in backend
- ❌ No RBAC system
- ❌ No SSO/SCIM
- ❌ No admin panel UI

**Gap Analysis:**
- Authentication exists but lacks role-based access control
- No enterprise identity management
- No admin dashboard in frontend

#### 5. Advanced Chat Features (Low Priority)
**Open WebUI Features:**
- Code execution module
- Evaluation system
- Multi-model concurrency
- Markdown/LaTeX rendering
- Image generation integration
- Conversation pinning/tagging

**Cortex-OS Assets:**
- ✅ Basic chat with streaming
- ✅ Markdown support (likely via React Markdown)
- ❌ No code execution sandbox
- ❌ No evaluation framework
- ❌ Single model per conversation

**Gap Analysis:**
- Chat UI is basic
- No code execution safety
- No multi-model orchestration in UI

#### 6. Model Builder (Low Priority)
**Open WebUI Features:**
- Create custom models from base models
- Character/persona customization
- System prompt templates
- Model parameter tuning

**Cortex-OS Assets:**
- ✅ Model CRUD endpoints in backend
- ❌ No model builder UI
- ❌ No character system

## Technology Stack Comparison

| Feature | Open WebUI | Cortex WebUI | Migration Path |
|---------|-----------|--------------|----------------|
| **Frontend** | Svelte | React 18 + TypeScript | Direct rewrite |
| **Backend** | Python (FastAPI) | Node.js + Express | Rewrite + leverage existing packages |
| **Pipelines** | Python plugin system | N/A | Design TypeScript alternative |
| **RAG** | Python (LangChain) | `packages/rag` (TypeScript) | Wire existing package |
| **Orchestration** | N/A | `packages/orchestration` (LangGraph) | Extend for user plugins |
| **Auth** | Custom/SSO | Better Auth | Add RBAC layer |
| **Vector DB** | Chroma/Qdrant | FAISS/Memory stores | Add persistent vector store |

## Integration Opportunities

### 1. RAG Integration (Quick Win)
**Existing Code to Leverage:**
- `packages/rag/src/RAGPipeline.ts` - Main pipeline class
- `packages/rag/src/embed/python-client.ts` - Python embedding service
- `packages/rag/src/store/` - Memory/FAISS stores
- Backend services already exist for document processing

**Implementation Path:**
1. Wire `documentProcessingService` to `RAGPipeline`
2. Add vector store initialization on backend startup
3. Create React UI components for document workspace
4. Integrate retrieval into chat message flow
5. Add citation rendering in chat bubbles

### 2. MCP Service Wiring (Medium Effort)
**Existing Code:**
- `apps/cortex-webui/backend/src/mcp/tools.ts` - Tool execution framework
- `libs/typescript/contracts/webuiMcpTools.ts` - Tool schemas

**Implementation Path:**
1. Create concrete service implementations in `backend/src/services/`
2. Replace stub implementations in `defaultServices`
3. Add WebSocket events for real-time updates
4. Test tool execution with frontend integration

### 3. TypeScript Pipelines System (High Effort)
**Design Approach:**
- Use dynamic `import()` for plugin loading (TypeScript/JavaScript files)
- Define pipeline contracts similar to MCP tools
- Leverage `packages/orchestration` for multi-step workflows
- Add sandbox/security layer (VM2 or isolated workers)
- Create admin UI for upload/enable/disable

**Architecture:**
```typescript
interface Pipeline {
  name: string;
  description: string;
  type: 'filter' | 'pipe' | 'action';
  version: string;
  execute(context: PipelineContext): Promise<PipelineResult>;
}

// User uploads pipeline.ts file
// Backend validates, compiles, sandboxes
// Registers in pipeline registry
// Available via MCP or REST API
```

### 4. Admin Panel (Medium Effort)
**React Components Needed:**
- User management table with role assignment
- Model registry UI (list, create, edit, delete)
- Pipeline management (upload, enable/disable, logs)
- Webhook configuration
- Analytics dashboard

**Backend Extensions:**
- RBAC middleware (extend Better Auth)
- Model CRUD with validation
- Pipeline registry service
- Webhook dispatcher

## Phased Implementation Strategy

### Phase 1: Core RAG Integration (1-2 weeks)
1. Wire existing RAG package to webui backend
2. Add document workspace UI
3. Integrate retrieval into chat
4. Add citation rendering
5. **Deliverable**: Working RAG with document search

### Phase 2: MCP Service Implementation (1 week)
1. Implement concrete services for all 9 MCP tools
2. Add WebSocket event handlers
3. Test tool execution end-to-end
4. **Deliverable**: Functional MCP tools (panels, navigation, charts, etc.)

### Phase 3: TypeScript Pipelines (2-3 weeks)
1. Design pipeline contract and security model
2. Implement dynamic loader with sandboxing
3. Create pipeline registry service
4. Build admin UI for pipeline management
5. Add 3-5 example pipelines (rate limit, translation, etc.)
6. **Deliverable**: Working plugin system with examples

### Phase 4: Admin & RBAC (1-2 weeks)
1. Extend Better Auth with roles/permissions
2. Add RBAC middleware to all endpoints
3. Build admin panel UI
4. Add user/model/pipeline management
5. **Deliverable**: Enterprise-ready admin features

### Phase 5: Advanced Chat Features (2 weeks)
1. Add code execution sandbox (Docker/VM2)
2. Implement multi-model orchestration
3. Add conversation tagging/pinning
4. Enhance markdown/LaTeX rendering
5. **Deliverable**: Feature-complete chat interface

### Phase 6: Model Builder & Marketplace (1-2 weeks)
1. Create model builder UI
2. Add character/persona system
3. Implement tool/pipeline marketplace (if desired)
4. **Deliverable**: Custom model creation

## Cortex-OS Architecture Compliance

All implementations must follow brAInwav standards:

### CODESTYLE.md Requirements
- ✅ Named exports only (no default exports)
- ✅ Functions ≤ 40 lines
- ✅ async/await (no .then() chains)
- ✅ Classes only when framework-required

### Governance Standards
- ✅ Contract-first development (Zod schemas in `libs/typescript/contracts`)
- ✅ Event-driven communication (A2A events for cross-feature)
- ✅ 90%+ test coverage
- ✅ OWASP security compliance
- ✅ Structure validation (no cross-imports between sibling features)

### Package Structure
```
apps/cortex-webui/
  backend/
    src/
      domain/          # Pure business logic
      app/             # Use cases
      infra/           # Adapters (RAG, MCP, DB)
      mcp/             # MCP tool layer
  frontend/
    src/
      components/      # React components
      hooks/           # Custom hooks
      services/        # API clients
      contexts/        # React contexts
```

## Risk Assessment

### High Risk
1. **Python Pipelines Migration**: Open WebUI's plugin ecosystem is Python-based; TypeScript alternative may not attract same community
2. **Feature Drift**: Open WebUI is actively developed; maintaining parity will require continuous effort
3. **Performance**: Node.js vs Python for ML/RAG workloads (mitigated by using Rust/Python services)

### Medium Risk
1. **Sandbox Security**: Dynamic code loading requires robust isolation
2. **Vector Store**: Need production-grade persistent storage (FAISS is in-memory by default)
3. **SSO/SCIM**: Enterprise auth is complex; may need dedicated auth service

### Low Risk
1. **RAG Integration**: Existing package is production-ready
2. **MCP Wiring**: Well-defined contracts, straightforward implementation
3. **React UI**: Standard component development

## Recommendations

1. **Prioritize RAG Integration**: Biggest user value, leverages existing code
2. **Design TypeScript Pipelines Carefully**: This is the hardest part; consider hybrid approach (support both Python and TypeScript)
3. **Use Existing Cortex-OS Packages**: Don't reinvent RAG, orchestration, or A2A
4. **Maintain Governance**: All code must pass structure validation, security scans, and coverage thresholds
5. **Document Everything**: Update CHANGELOG.md, README.md, and website docs for each phase

## Next Steps

1. ✅ Complete this research document
2. ⏳ Create detailed TDD plans for each phase
3. ⏳ Implement Phase 1 (RAG integration)
4. ⏳ Gather user feedback
5. ⏳ Iterate on remaining phases

---

**Author**: brAInwav AI Agent  
**Date**: 2025-01-04  
**Status**: Research Complete, Ready for Planning Phase
