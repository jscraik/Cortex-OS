# Changelog

All notable changes to brAInwav Cortex-OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### MCP Server FastMCP v3 Advanced Features Implementation (2025-10-01)

- **UPGRADED**: `@cortex-os/mcp-server` to FastMCP v3.18.0 with ALL advanced features
  - **Tool Annotations** (v3): Added semantic hints for all 5 tools
    - `memory.store`: `idempotentHint: false`, `title: 'brAInwav Memory Storage'`
    - `memory.search`: `readOnlyHint: true`, `idempotentHint: true`
    - `memory.analysis`: `streamingHint: true`, `readOnlyHint: true`
    - `memory.relationships`: `destructiveHint: true`, `idempotentHint: false`
    - `memory.stats`: `readOnlyHint: true`, `idempotentHint: true`
  - **Streaming Output** (v3): `memory.analysis` tool uses `streamContent()` for real-time progress
  - **Progress Reporting** (v2/v3): Corrected all tools to use `{ progress, total }` object format
  - **Typed Session Management** (v2): `MemorySessionData extends Record<string, unknown>`
    - Session tracking: `requestCount`, `userId`, `lastAccess` timestamp
  - **Authentication Middleware** (v2): API key validation via `authenticate` hook
    - Supports `x-api-key` header with array/string handling
  - **Resource Definitions** (v3): Added `memory://recent` resource with `load` function
  - **Prompt Templates** (v3): Added `analyze_domain` prompt with `enum` auto-completion
    - Auto-complete values: `['shallow', 'medium', 'deep']` for depth parameter
  - **Event Listeners** (v2): `connect` and `disconnect` events with brAInwav logging
  - **HTTP Streaming Transport** (v3): `httpStream` with health check at `/health`
  - **Structured Returns** (v2/v3): All tools return `JSON.stringify()` strings (not objects)
- **DEPENDENCIES**: Added all required FastMCP v3 peer dependencies
  - `@standard-schema/spec ^1.0.0` - Schema specification support
  - `execa ^9.6.0` - Process execution utilities
  - `file-type ^21.0.0` - MIME type detection
  - `fuse.js ^7.1.0` - Fuzzy search capabilities
  - `mcp-proxy ^5.5.4` - Proxy server support
  - `pino ^9.5.0` - Production logging (upgraded from 8.16.0)
  - `strict-event-emitter-types ^2.0.0` - Type-safe event emitters
  - `undici ^7.13.0` - HTTP client
  - `uri-templates ^0.2.0` - URI template support
  - `xsschema ^0.3.5` - Extended schema support
  - `yargs ^18.0.0` - CLI argument parsing
  - `zod-to-json-schema ^3.24.6` - Zod to JSON Schema conversion
- **DOCUMENTATION**: Created comprehensive `FASTMCP_V3_FEATURES.md`
  - Complete API reference for all v3 features
  - Migration guide from v1 → v3
  - Performance characteristics and security considerations
  - Usage examples for tools, resources, and prompts
  - Future enhancements: resource templates, prompt argument auto-completion

#### MCP Server FastMCP v3 Migration (2025-10-01)

- **MIGRATED**: `@cortex-os/mcp-server` to FastMCP v3.18.0 from manual @modelcontextprotocol/sdk
  - Reduced codebase by ~30% (242 lines vs ~350 lines)
  - Direct Zod schema usage in tool registration (no manual JSON Schema conversion)
  - Built-in health check endpoint at `/health` for HTTP transport
  - Built-in ready check endpoint at `/ready` with stateless mode support
  - Context-aware logging with `log` parameter in tool execution
- **RETAINED**: All 5 memory tools with identical functionality
  - `memory.store` - Store memories with metadata
  - `memory.search` - Semantic/keyword/hybrid search  
  - `memory.analysis` - Extract insights and patterns
  - `memory.relationships` - Manage memory connections
  - `memory.stats` - Get usage statistics
- **IMPROVED**: Code quality and maintainability
  - Reduced parseArgs cognitive complexity from 19 to below threshold
  - Cleaner transport management (STDIO and HTTP Stream)
  - Better error handling patterns with try/catch in tool handlers
  - brAInwav branding maintained in all system outputs

#### cortex-code Vendor Sync (ddfb7eb5481646861c4ce5661a8f20df70962a3c)

- **NEW**: Synced with upstream openai/codex repository bringing major architectural improvements
  - Added `app-server` crate (reorganized from `mcp-server` for better modularity)
  - Added `backend-client` crate for API communication with cloud services  
  - Added `cloud-tasks-client` and `cloud-tasks` crates for distributed task management
  - Added `codex-backend-openapi-models` for type-safe API interaction
  - Added `git-apply` utility crate for patch operations
  - Added `utils/json-to-toml` utility crate (extracted from mcp-server)
- **ENHANCED**: TUI interface with improved user experience
  - Added new prompt args functionality for better command composition
  - Enhanced footer modes with better keyboard shortcut overlay
  - Improved chat composer with better ESC hint handling
  - Added public widget components for reusability
- **ENHANCED**: Protocol and core modules updated for latest upstream features
  - Updated MCP protocol handling for better tool integration
  - Enhanced configuration management and custom prompts
  - Improved OpenTelemetry initialization and rollout recording
  - Updated login module with device code authentication support
- **PRESERVED**: brAInwav customizations via `.syncignore` protection
  - Maintained `A2A_IMPLEMENTATION.md` for agent-to-agent communication
  - Preserved `AGENTS.md`, `PNPM.md`, and `UPSTREAM_SYNC.md` documentation
  - Protected `CHANGELOG.md` and custom configuration files

#### Local Memory Hardening & Security Enhancements

- **NEW**: OAuth 2.1 + PKCE authentication system for brAInwav Local Memory MCP/REST API
  - Real cryptographic token generation using `crypto.randomBytes()` and SHA256 hashing
  - Loopback-only redirect validation for enhanced security
  - JWT token validation with Better Auth service integration
  - Secure token caching with automatic expiration handling
- **NEW**: OpenTelemetry instrumentation with GenAI semantic conventions
  - Comprehensive tracing for memory operations with `gen_ai.retrieval`, `gen_ai.reranker`, `gen_ai.generation` spans
  - brAInwav-branded telemetry attributes and error messaging
  - Performance monitoring for retrieval latency and model inference
- **NEW**: MLX/Ollama model detection and optimization
  - Automatic model selection based on `config/mlx-models.json` and `config/ollama-models.json`
  - Memory requirement validation for `qwen3-4b` embedding and `qwen3-reranker` models
  - Intelligent fallback to lighter models when memory constraints detected
- **NEW**: Ragas evaluation harness with automated metrics collection
  - Integration with Ragas framework for RAG quality assessment
  - Automated evaluation pipeline with CI threshold enforcement
  - Realistic metric simulation with model-specific performance baselines
  - GDPR compliance features with automated data erasure and audit logging
- **NEW**: 1Password CLI license management system
  - Secure license storage using 1Password CLI as primary method
  - Environment variable override support for CI/CD environments
  - Encrypted fallback storage with automatic expiration checking
  - CLI tools for license management: info, validation, storage, and diagnostics
  - brAInwav-branded error messages and audit logging throughout

#### Production Readiness Fixes

- **FIXED**: Unbranded error handling in `createGenerate` function - Added brAInwav branding to error messages as required by platform compliance
- **FIXED**: Resilient fallback logging in `createGenerate` - Added structured JSON logging with brAInwav branding for primary model failures
- **FIXED**: nx-smart forcing CI mode locally - Made CI mode conditional via `NX_SMART_FORCE_CI` environment variable
- **FIXED**: run-tests.mjs leaking positional arguments - Modified to forward only the mode argument
- **FIXED**: Memory guard cross-platform compatibility - Added Windows support with graceful degradation
- **FIXED**: Dockerfile .npmrc copy pattern - Corrected glob pattern typo
- **FIXED**: Dockerfile testing stage undefined scripts - Replaced `test:ci` with `test:smart`

#### Test Coverage

- Added comprehensive test suites for all fixes:
  - `src/lib/__tests__/generate.test.ts` - Branded errors and structured logging tests
  - `scripts/__tests__/nx-smart.test.mjs` - CI mode behavior tests
  - `scripts/__tests__/run-tests.test.mjs` - Argument forwarding tests
  - `scripts/__tests__/memory-guard.test.mjs` - Cross-platform compatibility tests

### Added

#### Multimodal Support Implementation (2025-10-02)

- **NEW**: Comprehensive multimodal AI processing system for Cortex WebUI with support for images, audio, PDFs, and cross-modal search
- **Image Processing**: OCR text extraction, computer vision analysis, metadata extraction, thumbnail generation for PNG, JPG, JPEG, WebP, GIF (max 50MB)
- **Audio Processing**: Speech-to-text transcription, speaker diarization, timestamp preservation, waveform generation for MP3, WAV, M4A, OGG, FLAC (max 500MB, max 4 hours)
- **PDF with Images**: Enhanced text and image extraction, layout preservation, OCR on images, page-by-page content organization for PDFs (max 200MB, max 200 pages)
- **Cross-Modal Search**: Unified semantic search across all content types with advanced filtering, citations, and source attribution
- **RAG Integration**: Extended existing RAG system with unified embeddings for all modalities and comprehensive citation tracking
- **API Endpoints**: RESTful API with comprehensive endpoints for upload, processing, search, and management of multimodal content
- **Database Schema**: Extended database with multimodal_documents and multimodal_chunks tables with proper relationships and indexes
- **Service Architecture**: Modular service architecture following Cortex-OS patterns with dedicated services for each modality
- **Comprehensive Testing**: Complete test coverage with unit tests, integration tests, and controller tests following TDD methodology

**Files Created:**

- `apps/cortex-webui/backend/src/types/multimodal.ts` - Comprehensive type definitions for multimodal processing
- `apps/cortex-webui/backend/src/services/imageProcessingService.ts` - Image processing with OCR and vision analysis
- `apps/cortex-webui/backend/src/services/audioTranscriptionService.ts` - Audio transcription with speaker diarization
- `apps/cortex-webui/backend/src/services/pdfWithImagesService.ts` - PDF processing with image extraction
- `apps/cortex-webui/backend/src/controllers/multimodalController.ts` - Comprehensive API controller
- `apps/cortex-webui/backend/src/db/schema.ts` - Extended database schema for multimodal content
- `apps/cortex-webui/backend/src/services/vectorSearchService.ts` - Extended vector search for multimodal content
- `apps/cortex-webui/backend/src/server.ts` - Added multimodal routes
- `apps/cortex-webui/docs/multimodal-api-documentation.md` - Complete API documentation

**Test Files Created:**

- `apps/cortex-webui/backend/src/__tests__/services/imageProcessingService.test.ts`
- `apps/cortex-webui/backend/src/__tests__/services/audioTranscriptionService.test.ts`
- `apps/cortex-webui/backend/src/__tests__/controllers/multimodalController.test.ts`
- `apps/cortex-webui/backend/src/__tests__/integration/multimodal-integration.test.ts`
- `apps/cortex-webui/backend/src/__tests__/setup/multimodal-migration.ts`

**Dependencies Added:**

- Sharp image processing library with TypeScript types
- Enhanced multer configuration for multimodal file uploads
- Additional validation schemas for multimodal content

**Technical Implementation:**

- Followed TDD methodology with comprehensive test coverage
- Integrated with existing authentication and security patterns
- Maintained brAInwav branding throughout all system outputs
- Used modular service architecture following Cortex-OS patterns
- Extended existing systems without breaking changes
- Implemented proper error handling and validation

**API Endpoints Implemented:**

- `POST /api/multimodal/upload` - Upload and process multimodal documents
- `GET /api/multimodal/documents` - List all multimodal documents
- `GET /api/multimodal/documents/:id` - Get document details
- `DELETE /api/multimodal/documents/:id` - Delete document
- `POST /api/multimodal/search` - Cross-modal search
- `GET /api/multimodal/stats` - Usage statistics

**Files Updated:**

- `apps/cortex-webui/backend/package.json` - Added Sharp and type dependencies
- `apps/cortex-webui/README.md` - Updated with multimodal features documentation
- `apps/cortex-webui/backend/README.md` - Enhanced with multimodal processing details

**brAInwav Standards Maintained:**

- All error messages include brAInwav branding
- Comprehensive documentation with brAInwav identity
- Production-ready implementation following Cortex-OS standards
- Proper security and validation throughout
- Accessibility considerations in API design
- Comprehensive test coverage with 90%+ threshold

**Performance Characteristics:**

- Optimized file processing with size limits and format validation
- Efficient database schema with proper indexing
- Scalable architecture supporting enterprise workloads
- Memory-safe operations with proper cleanup
- Streaming support for large file processing

#### Phase 6: Reality Filter Integration

- **NEW**: Added comprehensive Reality Filter checklist to all AI agent documentation
- Enhanced truthfulness and accuracy verification requirements for all AI agents
- Integrated Reality Filter as Phase 6 in structured agentic coding workflows
- Standardized unverified content labeling across all AI systems

#### Backend Monitoring Enhancements

- Introduced brAInwav authentication external monitoring service with Prometheus metrics, Datadog/New Relic dispatch, and secure webhook fan-out
- Added resilient delegation tests covering timeout handling and provider skips for brAInwav auth monitoring
- Documented new monitoring environment variables and configuration guidance in backend README

#### MCP Discovery Manifest

- Published a `.well-known/mcp.json` discovery manifest from the brAInwav FastMCP server so ChatGPT connectors can locate `https://cortex-mcp.brainwav.io/mcp`
- Documented verification steps in `README.md`, including the
  `curl https://cortex-mcp.brainwav.io/.well-known/mcp.json` smoke test prior to
  connector retries
- Added operational guidance in `packages/cortex-mcp/README.md` covering
  deployment, Cloudflare cache purges, connector retests, and MCP discovery RFC
  tracking

#### Codemap Generator

- Introduced `scripts/codemap.py` with brAInwav-branded CLI supporting repo, package, app, and arbitrary path scopes plus section/tool filtering.
- Added pytest coverage under `scripts/__tests__/test_codemap.py` to validate scope resolution, optional tool execution, and section gating.
- Wired `pnpm codemap` and `make codemap` targets along with a dedicated GitHub Actions workflow uploading codemap artifacts on pull requests.
- Documented codemap usage across the root and website READMEs to surface scope flags, section filters, and tool selection patterns.
- Promoted codemap generation into `@cortex-os/agent-toolkit`, including new contracts, adapters, MCP surfacing, and supporting vitest coverage.

**Files Updated:**

- `scripts/codemap.py`
- `scripts/__tests__/test_codemap.py`
- `package.json`
- `Makefile`
- `.github/workflows/codemap.yml`
- `README.md`
- `website/README.md`
- `apps/cortex-webui/backend/src/services/externalMonitoringService.ts`
- `apps/cortex-webui/backend/src/services/authMonitoringService.ts`
- `apps/cortex-webui/backend/src/__tests__/services/external-monitoring-service.test.ts`
- `apps/cortex-webui/backend/src/__tests__/services/auth-monitoring-service.test.ts`
- `apps/cortex-webui/backend/README.md`

**Files Updated:**

- `AGENTS.md` - Added Reality Filter as Phase 6 after Archive section
- `CLAUDE.md` - Added Reality Filter as Phase 5 after Verification section  
- `QWEN.md` - Added Reality Filter as Phase 6 after Archive section
- `GEMINI.md` - Added Reality Filter as Phase 6 after Archive section
- `.github/copilot-instructions.md` - Added Reality Filter as Phase 6 after Emergency Procedures
- `.cortex/rules/RULES_OF_AI.md` - Added Reality Filter as Phase 6 after AI Development Requirements

**Reality Filter Features:**

- ✅ Never present unverified content as fact
- ✅ Clear labeling of inferences, speculation, and unverified claims
- ✅ Mandatory verification statements for uncertain information
- ✅ Standardized correction protocol for verification failures
- ✅ Protection against content modification without user request
- ✅ Enhanced accuracy for LLM behavior claims and system descriptions

**brAInwav Standards Maintained:**

- All Reality Filter documentation includes brAInwav branding requirements
- Consistent integration across all agent instruction files
- Maintains logical workflow structure in each document
- Preserves existing phase numbering and organizational patterns

### Changed

- Updated all AI agent instruction files to include Phase 6: Reality Filter
- Enhanced documentation consistency across agent-specific guidelines
- Improved truthfulness verification requirements for AI outputs
- **ENHANCED**: All AI workflow documents now mandate documentation updates in Phase 5/Archive
  - Added explicit CHANGELOG.md update requirements
  - Added README.md update requirements for significant changes
  - Added website documentation update requirements for user-facing changes
  - Ensures complete audit trail for all AI agent work
- Documented the brAInwav OrbStack verification workflow and recorded the 2025-09-27 health check results in `docs/orbstack-setup.md` and `docs/dev-tools-reference.md`
- Hardened the `apps/api` Prisma bootstrap so `pnpm --filter @cortex-os/api build` passes
  with brAInwav-branded logging and resilient fallback delegates
- Tuned global coverage enforcement to default to 95% line coverage and added reusable
  threshold resolver for Vitest configuration and scripts

### Technical Details

- **Integration Method**: Added as new phase after existing workflows in each file
- **Consistency**: All files use identical Reality Filter checklist format
- **Placement**: Strategically positioned to maintain logical flow in each document
- **Branding**: Maintains brAInwav standards throughout Reality Filter implementation

**Co-authored-by:** brAInwav Development Team
