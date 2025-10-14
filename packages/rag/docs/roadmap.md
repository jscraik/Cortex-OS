# Roadmap

| Status | Feature | Notes |
|---|---|---|
| ✅ | **REF‑RAG Tri-Band Context System** | Risk-Enhanced Fact Retrieval with Band A/B/C architecture |
| ✅ | Risk Classification & Verification | LOW/MEDIUM/HIGH/CRITICAL query risk assessment |
| ✅ | Virtual Token Compression | MLX-native compressed context processing |
| ✅ | Structured Fact Extraction | Regex-based fact extraction with confidence scoring |
| ✅ | Hybrid Relevance Scoring | Multi-factor relevance with heuristic fallbacks |
| ✅ | Budget Management | Risk-class specific context allocation |
| ✅ | Self-Verification & Escalation | Automated fact checking and escalation loops |
| ✅ | Model Gateway Integration | Tri-band chat endpoints with virtual token support |
| 🚧 | Streaming ingestion | Real-time updates via message queues |
| 🚧 | Distributed storage | Sharded vector stores across nodes |
| 🚧 | Analytics dashboard | Query performance metrics |
| 📝 | RAG CLI | Manage ingestion jobs and inspect stores |

## REF‑RAG Implementation Details

### Version 1.0 (Completed ✅)

**Core Architecture:**
- **Tri-Band Context System**: Band A (full text), Band B (virtual tokens), Band C (structured facts)
- **Risk Classification**: Automated query risk assessment with mandatory expansion hints
- **Fact Extraction**: Lightweight regex-based extraction for numbers, quotes, code, dates, entities
- **Compression Encoding**: Virtual token generation with configurable compression ratios
- **Relevance Policy**: Hybrid scoring combining similarity, freshness, diversity, domain relevance
- **Budget Management**: Risk-class specific allocations with conservative/default/aggressive presets
- **Verification Engine**: Self-check and escalation orchestration for critical queries
- **Pipeline Orchestrator**: End-to-end REF‑RAG processing with traceability

**Integration Points:**
- **Model Gateway**: Enhanced chat schema with tri-band context support
- **MLX Python Runner**: Native Apple Silicon acceleration for virtual token processing
- **Generation Pipeline**: `generateWithBands` method for tri-band context handling
- **Testing Suite**: Comprehensive test coverage for all REF‑RAG components

**Performance Targets:**
- LOW Risk: 120ms latency, 50 req/s throughput, 92% accuracy
- MEDIUM Risk: 250ms latency, 30 req/s throughput, 95% accuracy
- HIGH Risk: 450ms latency, 20 req/s throughput, 97% accuracy
- CRITICAL: 800ms latency, 10 req/s throughput, 99% accuracy

### Version 1.1 (Planned 🚧)

**Advanced Features:**
- Enhanced compression algorithms with adaptive ratios
- Multi-modal context support (images, audio, video)
- Distributed processing across multiple nodes
- Advanced verification system with external fact-checking integration

### Version 2.0 (Future 📋)

**Next Generation:**
- Federated retrieval across multiple knowledge bases
- Real-time context updates and cache invalidation
- Advanced reasoning chains with logical inference
- Cross-lingual support with translation capabilities

Enterprise quickstarts will cover overlay deployments and multi-tenant setups as these features become available.
