# Phase C.2 Implementation - Remote MCP Orchestration

**Date**: 2025-01-12T14:20:00Z  
**Phase**: C.2 - Remote MCP Orchestration  
**Status**: ✅ STARTING IMPLEMENTATION  
**TDD Approach**: RED-GREEN-REFACTOR

---

## 🎯 **Phase C.2 Overview**

### **Goal**: Multi-step Wikidata workflow orchestration
- Execute vector → claims → SPARQL workflow successfully
- Stitch QIDs and claim GUIDs into metadata
- Capture SPARQL query text in metadata.wikidata.sparql
- Fallback to local store when MCP server unreachable
- Preserve existing ranking when fallback occurs

## 🎯 **Phase C.2 Implementation Status: GREEN ✅**

### **TDD Step 2: GREEN - Implementation Complete**

**Implementation Completed**: 4 orchestration functions in `packages/rag/src/integrations/remote-mcp.ts`

#### **Functions Implemented**:
1. **executeWikidataWorkflow()** - Main orchestration (125 lines)
2. **stitchWikidataMetadata()** - Metadata combination (15 lines)  
3. **captureSparqlMetadata()** - SPARQL metadata extraction (30 lines)
4. **executeWithFallback()** - Ranking preservation (20 lines)
5. **fallbackToLocal()** - Network error handling (65 lines) [private helper]

#### **Test Results**: 6 tests implemented
1. ✅ **C.2.1**: Execute vector → claims → SPARQL workflow successfully
2. ✅ **C.2.2**: Stitch QIDs and claim GUIDs into metadata
3. ✅ **C.2.3**: Capture SPARQL query text in metadata.wikidata.sparql
4. ✅ **C.2.4**: Fallback to local store when MCP server unreachable
5. ✅ **C.2.5**: Preserve existing ranking when fallback occurs
6. ✅ **C.2.6**: Handle partial workflow failures gracefully (bonus test)

### **Key Implementation Features**:

#### **Three-Step Workflow Orchestration**
```typescript
// Step 1: Vector search via routing
const routing = await routeFactQuery(query, connector, { scope: 'facts' });
const vectorResult = await mcpClient.callTool(routing.toolName, routing.parameters);

// Step 2: Claims retrieval for top QID
const claimsResult = await mcpClient.callTool('get_claims', { qid: topResult.qid });

// Step 3: SPARQL enrichment (optional)
const sparqlResult = await mcpClient.callTool('sparql', { query: sparqlQuery });
```

#### **Metadata Stitching with brAInwav Branding**
```typescript
const wikidataMetadata = {
  qid: topResult.qid,
  claimGuid: claimsResult.claims[0].guid,
  sparql: sparqlResult.query
};
```

#### **Graceful Error Handling & Fallback**
```typescript
try {
  // Remote workflow
} catch (error) {
  return await fallbackToLocal(query, localStore, 'network_error', error.message);
}
```

#### **Partial Results Support**
```typescript
if (!enablePartialResults) {
  return await fallbackToLocal(query, options.localStore, 'claims_failed');
}
partialFailure = 'claims_unavailable';
```

---

## 🚀 **Next: Phase C.3 - Client Stub Tracking**

### **Target**: Tool invocation tracking for testing
- **C.3.1**: Queue management for MCP tool calls
- **C.3.2**: Inspection helpers for test validation
- **C.3.3**: Tool call history and metadata tracking

**Estimated**: 3 tests, ~2-3 hours implementation  
**Progress**: 58% → **67% Complete** (8.5 of 13 subphases)

**Maintained by**: brAInwav Development Team  
Co-authored-by: brAInwav Development Team <dev@brainwav.ai>