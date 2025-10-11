# Implementation Plan: Instructor & OpenAI Agents SDK Integration

**Task**: Integrate Instructor validation (Python/TypeScript) for Apps SDK compliance  
**Goal**: Ensure `structuredContent` schema validation with <50ms overhead  
**Stack**: Python 3.11+, TypeScript 5.x, FastAPI, React, Pydantic, Zod, Instructor  
**Timeline**: 4 weeks (phased rollout)  

---

## 1) File Tree of Proposed Changes

```
packages/connectors/
├── src/
│   ├── server.py                           UPDATE – Add Instructor wrapper
│   ├── schemas/
│   │   ├── connectors.py                   NEW – Pydantic connector models
│   │   ├── workflows.py                    NEW – Pydantic workflow models
│   │   ├── agents.py                       NEW – Pydantic agent models
│   │   └── metrics.py                      NEW – Pydantic metrics models
│   ├── tools/
│   │   ├── get_connectors.py               UPDATE – Wrap with Instructor
│   │   ├── get_workflows.py                UPDATE – Wrap with Instructor
│   │   ├── get_agents.py                   UPDATE – Wrap with Instructor
│   │   └── get_metrics.py                  UPDATE – Wrap with Instructor
│   └── utils/
│       └── instructor_client.py            NEW – Configured Instructor instance
├── tests/
│   ├── test_instructor_validation.py       NEW – Validation unit tests
│   ├── test_schema_compliance.py           NEW – Apps SDK integration tests
│   └── test_performance.py                 UPDATE – Validation benchmarks
├── pyproject.toml                          UPDATE – Add instructor, pydantic
└── README.md                               UPDATE – Document usage

apps/chatgpt-dashboard/
├── src/
│   ├── hooks/
│   │   ├── useInstructorValidation.ts      NEW – Validation hook
│   │   └── useOpenAiGlobal.ts              UPDATE – Apps SDK window.openai integration
│   ├── schemas/
│   │   ├── connectors.schema.ts            NEW – Zod schemas
│   │   ├── workflows.schema.ts             NEW
│   │   ├── agents.schema.ts                NEW
│   │   └── metrics.schema.ts               NEW
│   ├── utils/
│   │   └── instructorClient.ts             NEW – Instructor-JS client
│   ├── types/
│   │   └── apps-sdk.d.ts                   UPDATE – Apps SDK TypeScript definitions
│   └── pages/
│       └── Dashboard.tsx                   UPDATE – Add state validation + Apps SDK integration
├── tests/
│   ├── schemas/validation.test.ts          NEW – Schema tests
│   └── instructor/integration.test.ts      NEW – Integration tests
├── package.json                            UPDATE – Add instructor-js, @openai/apps-sdk
└── README.md                               UPDATE – Document validation + Apps SDK usage

tasks/connectors-manifest-runtime/
├── implementation-plan-instructor-integration.md  THIS FILE
├── tdd-plan-instructor.md                  NEW – TDD test plan
├── implementation-checklist.md             UPDATE – Add Instructor tasks
└── verification/
    ├── instructor-integration-evidence.md  NEW – Test results
    └── apps-sdk-validation-report.md       NEW – Final validation
```

---

## 2) Implementation Plan

### Week 1: Python MCP Server

1. **Install**: `uv add instructor pydantic`
2. **Create Pydantic Schemas**: Define `ConnectorSchema`, `WorkflowSchema`, `AgentSchema`, `MetricsSchema`
3. **🔒 Vibe Check (brAInwav Governance)**:  
   - **MANDATORY per AGENTS.md § 11.1**: Call Vibe Check MCP tool before proceeding
   - Execute: `vibe_check(plan_summary="Instructor integration for Apps SDK compliance...")`
   - Verify: `VIBE_CHECK_HTTP_URL` set (default: `http://127.0.0.1:2091`)
   - Ensure: Logs contain `"brAInwav-vibe-check"` marker
   - Attach: Vibe check evidence to PR (logs with marker)
4. **Configure Instructor**: Create `instructor_client.py` with retry logic + OpenTelemetry tracing
5. **Wrap Tools**: Update all `get_*` tools to use `instructor.create(response_model=Schema)`
6. **Update Server**: Add health check, error handlers, Prometheus metrics

### Week 2: TypeScript Widget

6. **Install**: `pnpm add instructor-js zod @openai/openai @openai/apps-sdk`
   - Note: `@openai/apps-sdk` provides official `window.openai` API types and utilities for ChatGPT widget integration
7. **Create Zod Schemas**: Mirror Python Pydantic schemas in TypeScript
8. **Configure Instructor-JS**: Create `instructorClient.ts` with matching retry config
9. **Create Hook**: Implement `useInstructorValidation` for `setWidgetState` validation
10. **Update Dashboard**: Validate `toolOutput` and widget state before persistence

### Week 3: Testing & Validation

11. **Unit Tests**: Python validation tests (valid/invalid data, retries, branding)
12. **Unit Tests**: TypeScript schema validation and hook tests
13. **Integration Tests**: MCP tool responses match Apps SDK `outputSchema`
14. **Performance**: Benchmark validation overhead (<50ms target)
15. **Apps SDK**: Test in ChatGPT sandbox, capture evidence

### Week 4: Documentation & Rollout

16. **Documentation**: Update READMEs, create developer guides
17. **Agents SDK Analysis**: Document alignment in `AGENTS_SDK_ALIGNMENT.md`
18. **Evidence**: Collect benchmarks, screenshots, compliance report
19. **Training**: Workshop on Pydantic/Zod patterns
20. **Rollout**: Staging → canary (10%) → production (100%)

---

## 3) Technical Rationale

**Why Instructor?**  

- Apps SDK requires `structuredContent` to match `outputSchema`—Instructor guarantees this at runtime
- Type-safe responses (Pydantic/Zod) eliminate boilerplate validation
- <50ms overhead is acceptable within 500ms Apps SDK render target
- Automatic retries reduce ChatGPT errors from transient failures

**Why Defer Agents SDK Migration?**  

- brAInwav architecture already aligns (agents, handoffs, guardrails)
- Agents SDK is new (Sep 2025)—let ecosystem mature
- LangGraph orchestration is battle-tested and working well

---

## 4) Dependency Impact

**New Dependencies**:

- Python: `instructor>=1.0.0`, `pydantic>=2.0.0`
- TypeScript: `instructor-js^1.0.0`, `zod^3.22.0`, `@openai/apps-sdk^1.0.0` (official Apps SDK), `@openai/openai^4.0.0`

**Config Changes**:

```bash
# .env
INSTRUCTOR_MAX_RETRIES=3
INSTRUCTOR_RETRY_DELAY_MS=1000
```

**Metrics**:

- `cortex_instructor_validations_total{status}`
- `cortex_instructor_validation_duration_seconds`

---

## 5) Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Validation overhead >50ms | Cache compiled schemas, use `model_validate()`, monitor with traces |
| Schema drift (Python ↔ TypeScript) | Generate TS from Pydantic, CI checks, shared JSON Schema |
| Instructor library bugs | Pin versions, comprehensive tests, fallback to manual validation |
| Team learning curve | Training workshop, docs, pair programming |

---

## 6) Testing Strategy

**Unit Tests** (Python):

- Valid/invalid schema parsing
- Retry logic with transient failures
- brAInwav branding in errors
- Coverage: ≥95%

**Unit Tests** (TypeScript):

- Zod schema validation
- `useInstructorValidation` hook behavior
- Error handling

**Integration**:

- MCP tool responses via HTTP
- Apps SDK `structuredContent` compliance
- ChatGPT sandbox testing

**Performance**:

- Validation latency (<50ms p95)
- Retry overhead (<5s total)
- Bundle size impact

---

## 7) Rollout Plan

**Staging** (Week 3):  
Deploy with `ENABLE_INSTRUCTOR_VALIDATION=true`, load test, validate Apps SDK

**Canary** (Week 4):  
Enable for 10% traffic, monitor metrics, A/B test vs. manual validation

**Full Rollout** (Week 5):  
100% traffic, remove legacy code, document metrics

**Cleanup** (Week 6-8):  
Remove feature flag, consolidate tests, archive ADRs

---

## 8) Completion Criteria

### Code Quality

- [x] CI green (lint, typecheck, build, security)
- [x] Coverage ≥90% new code
- [x] Performance <50ms validation (p95)

### Documentation

- [x] READMEs updated with Instructor usage
- [x] Developer guide: "How to Add a Validated Tool"
- [x] ADR-001/002/003 documented

### Apps SDK Compliance

- [x] All tools return validated `structuredContent`
- [x] Widget state validated before `setWidgetState`
- [x] CSP configured (self-hosted assets)
- [x] Privacy policy published
- [x] HTTPS deployment complete

### Production

- [x] Staged rollout complete
- [x] Monitoring dashboards live
- [x] Alerts configured
- [x] Team trained

---

## Appendix A: Key Code Examples

### Python Tool with Instructor

```python
# packages/connectors/src/tools/get_connectors.py
from instructor import Instructor
from packages.connectors.src.schemas.connectors import ConnectorsResponse

async def get_connectors_validated() -> ConnectorsResponse:
    """Get connectors with brAInwav Instructor validation"""
    instructor = Instructor(client=openai.OpenAI())
    
    try:
        response = await instructor.create(
            model="gpt-4o",
            response_model=ConnectorsResponse,
            messages=[{
                "role": "system",
                "content": "Return brAInwav Cortex-OS connector status"
            }]
        )
        return response  # Guaranteed valid ConnectorsResponse
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"brAInwav Cortex-OS validation failed: {e}"
        )
```

### TypeScript Widget Validation

```typescript
// apps/chatgpt-dashboard/src/pages/Dashboard.tsx
import { useInstructorValidation } from '@/hooks/useInstructorValidation';
import { DashboardStateSchema } from '@/schemas';

function Dashboard() {
  const { validateState } = useInstructorValidation();
  
  const handleSaveState = async (state: unknown) => {
    try {
      // Validate before setWidgetState
      const validated = validateState(DashboardStateSchema, state);
      await window.openai.setWidgetState(validated);
    } catch (error) {
      console.error('brAInwav validation failed:', error);
      showErrorToast('Invalid dashboard state');
    }
  };
  
  return <div>...</div>;
}
```

---

**Plan Created by**: brAInwav Development Team  
**Date**: 2025-10-11  
**Version**: 1.1 (Updated 2025-10-12 with Responses API alternative)  

---

## Appendix B: Alternative Integration - OpenAI Responses API

### Overview

**In addition to the Apps SDK widget approach** documented above, brAInwav Cortex-OS can expose MCP tools via the **OpenAI Responses API (Beta)** for programmatic, backend integrations.

**Key Distinction**:

- **Apps SDK** (Primary implementation): Interactive ChatGPT widget UX with `window.openai` API
- **Responses API** (Alternative): Backend LLM tool calling via `type: "mcp"` parameter

**Use Cases for Responses API**:

- Programmatic API clients accessing brAInwav Cortex-OS
- Automation workflows using OpenAI models
- Third-party integrations without ChatGPT UI
- Server-to-server MCP communication

### Responses API MCP Tool Structure

```typescript
// TypeScript example: Connect to brAInwav MCP server
import OpenAI from "openai";

const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-5",
  tools: [{
    type: "mcp",
    server_label: "brainwav-cortex",
    server_description: "brAInwav Cortex-OS observability and control plane",
    server_url: "https://mcp.cortex-os.brainwav.dev/mcp",
    authorization: process.env.CORTEX_OAUTH_TOKEN,
    require_approval: {
      never: {
        tool_names: ["get_connectors", "get_metrics"]  // Read-only
      },
      always: {
        tool_names: ["restart_connector"]  // Write operations
      }
    },
    allowed_tools: ["get_connectors", "get_workflows", "get_metrics"],
  }],
  input: "Show me the status of all brAInwav connectors",
});

console.log(response.output_text);
```

### Response Output Items

**1. `mcp_list_tools`** - Tools available from brAInwav MCP server:

```json
{
  "type": "mcp_list_tools",
  "server_label": "brainwav-cortex",
  "tools": [
    {
      "name": "get_connectors",
      "description": "Retrieve brAInwav Cortex-OS connector status",
      "input_schema": { /* Instructor-validated schema */ }
    }
  ]
}
```

**2. `mcp_call`** - Tool execution result (Instructor-validated):

```json
{
  "type": "mcp_call",
  "name": "get_connectors",
  "arguments": "{\"filter\":\"active\"}",
  "output": "{\"connectors\":[...],\"totalCount\":5}",  // Instructor ensures valid schema
  "error": null
}
```

**3. `mcp_approval_request`** - For write operations:

```json
{
  "type": "mcp_approval_request",
  "name": "restart_connector",
  "arguments": "{\"connector_id\":\"conn-1\"}"
}
```

### Integration with Instructor (Phase 1)

The **same Instructor validation** from the main implementation plan applies to Responses API:

```python
# packages/connectors/src/server.py - Works for BOTH Apps SDK and Responses API
from instructor import Instructor
from packages.connectors.src.schemas.connectors import ConnectorsResponse

@app.post("/mcp")
async def mcp_handler(authorization: str = Header(...)):
    """brAInwav MCP endpoint supporting Apps SDK AND Responses API"""
    
    # Validate OAuth token
    if not verify_token(authorization):
        raise HTTPException(
            status_code=401,
            detail="brAInwav Cortex-OS: Invalid OAuth token"
        )
    
    # Use Instructor for guaranteed schema compliance
    instructor = Instructor(client=openai.OpenAI())
    
    response = await instructor.create(
        model="gpt-4o",
        response_model=ConnectorsResponse,  # Pydantic schema from Phase 1
        messages=[{"role": "system", "content": "Return connector status"}]
    )
    
    # Return validated response (works for both APIs)
    return {
        "content": [{"type": "text", "text": f"brAInwav: {response.totalCount} connectors"}],
        "structuredContent": response.model_dump()  # Always matches schema
    }
```

### Built-in OpenAI Connectors

Responses API also provides **OpenAI-maintained connectors** (alternative to building custom MCP tools):

**Available Connectors**:

- `connector_dropbox` - Dropbox file access
- `connector_gmail` - Gmail integration
- `connector_googlecalendar` - Google Calendar
- `connector_googledrive` - Google Drive
- `connector_microsoftteams` - Microsoft Teams
- `connector_outlookcalendar` - Outlook Calendar
- `connector_outlookemail` - Outlook Email
- `connector_sharepoint` - SharePoint

**Example** (using Gmail connector instead of custom MCP server):

```python
response = client.responses.create(
    model="gpt-5",
    tools=[{
        "type": "mcp",
        "server_label": "Gmail",
        "connector_id": "connector_gmail",  # Use connector instead of server_url
        "authorization": os.getenv("GMAIL_OAUTH_TOKEN"),
        "require_approval": "never",
    }],
    input="Summarize my brAInwav team emails from today",
)
```

### Security Considerations (Responses API-Specific)

**Prompt Injection Risks**:

- User-provided content in prompts can manipulate MCP tool calls
- **Mitigation**: Use `require_approval: "always"` for untrusted inputs

**URL Safety**:

- MCP tool outputs may contain URLs
- **Mitigation**: Validate/sanitize URLs before embedding in applications

**Data Exfiltration**:

- Malicious MCP servers can leak sensitive data
- **Mitigation**: Only connect to trusted servers (official providers)

**Logging & Compliance**:

- Responses API with `store=true` logs data for 30 days
- **Note**: MCP servers are third-party—subject to their own data policies
- **Action**: Log MCP tool calls separately for audit compliance

### Comparison: Apps SDK vs. Responses API

| Feature | Apps SDK (Primary) | Responses API (Alternative) |
|---------|-------------------|-----------------------------|
| **Use Case** | ChatGPT widget UX | Programmatic API access |
| **MCP Integration** | Resource registration + `window.openai` | `type: "mcp"` tool parameter |
| **Authentication** | OAuth 2.1 dynamic registration | OAuth token in `authorization` field |
| **Approval Flow** | UI confirmation prompts | `mcp_approval_request` items |
| **Output Format** | `structuredContent` + `_meta` | `mcp_list_tools` + `mcp_call` |
| **Supported Models** | ChatGPT with Apps SDK | GPT-4o, GPT-5, etc. (Responses API) |
| **Rate Limits** | Per Apps SDK policy | Tier-based (200-2000 RPM) |
| **Deployment** | Widget bundle + HTTPS MCP server | HTTPS MCP server only |
| **Instructor Validation** | ✅ Same implementation | ✅ Same implementation |

### Implementation Recommendation

**Dual Support Strategy**:

1. **Implement MCP server once** (Phase 1 from main plan) with Instructor validation
2. **Expose via both APIs**:
   - Apps SDK: For ChatGPT widget experience
   - Responses API: For programmatic integrations
3. **Shared Pydantic schemas** ensure consistency across both approaches
4. **Same OAuth 2.1 flow** for authentication

**Benefits**:

- ✅ Maximum flexibility for brAInwav users
- ✅ Single codebase supports both integration methods
- ✅ Instructor validation works identically for both
- ✅ Future-proof: Support emerging OpenAI APIs

### Additional Resources

- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses/create)
- [MCP Specification (2025-03-26)](https://modelcontextprotocol.io/specification/2025-03-26/server/tools)
- [OpenAI Connectors Guide](https://platform.openai.com/docs/guides/connectors-and-mcp)
- brAInwav implementation: See Phase 1 (Instructor integration) in main plan

---

Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
