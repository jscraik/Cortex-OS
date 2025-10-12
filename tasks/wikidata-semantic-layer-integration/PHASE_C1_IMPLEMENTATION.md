# Phase C Implementation - RAG Orchestration + Provenance

**Date**: 2025-01-12T13:45:00Z  
**Phase**: C.1 - Agents Shim Routing  
**Status**: ✅ STARTING IMPLEMENTATION  
**TDD Approach**: RED-GREEN-REFACTOR

---

## 🎯 **Phase C Overview**

### **Goal**: Implement RAG orchestration with multi-step workflow
- **C.1**: Agents shim routing (3 tests) - Route fact queries to wikidata.vector_search_items
- **C.2**: Remote MCP orchestration (5 tests) - Execute vector → claims → SPARQL workflow  
- **C.3**: Client stub tracking (3 tests) - Queue callTool invocations for testing

## 🎯 **Phase C.1 Implementation Status: GREEN ✅**

### **TDD Step 2: GREEN - Tests Passing**

**Implementation Completed**: `routeFactQuery` function in `packages/rag/src/integrations/agents-shim.ts`

#### **Function Details**:
- **Lines**: 85 (within acceptable limits)
- **Scope**: Routes fact queries to wikidata.vector_search_items or vector_search_properties
- **Features**: 
  - Scope filtering (facts vs properties)
  - Matryoshka dimension hints
  - brAInwav branding 
  - Graceful fallback handling

#### **Test Results**: 5 tests implemented
1. ✅ **C.1.1**: Route fact queries to wikidata.vector_search_items
2. ✅ **C.1.2**: Apply scope filters for facts vs properties
3. ✅ **C.1.3**: Pass Matryoshka dimension hints if available
4. ✅ **C.1.4**: Handle connector without remoteTools gracefully
5. ✅ **C.1.5**: Include brAInwav branding in all routing results

### **Key Implementation Features**:

#### **Scope-Based Routing**
```typescript
const toolName = scope === 'properties' ? 'vector_search_properties' : 'vector_search_items';
```

#### **Matryoshka Hints Support**
```typescript
if (metadata?.supportsMatryoshka) {
  parameters.supportsMatryoshka = metadata.supportsMatryoshka;
}
if (metadata?.embeddingDimensions) {
  parameters.maxDimensions = metadata.embeddingDimensions;
}
```

#### **brAInwav Branding**
```typescript
const parameters = {
  query,
  scope,
  brand: 'brAInwav',
  // ... additional parameters
};
```

#### **Graceful Fallback**
```typescript
if (!connector.remoteTools || connector.remoteTools.length === 0) {
  return {
    toolName: 'inspect_connector_capabilities',
    parameters: { brand: 'brAInwav', fallbackReason: 'no_remote_tools' }
  };
}
```

---

## 🚀 **Next: Phase C.2 - Remote MCP Orchestration**

### **Target**: Multi-step workflow orchestration (vector → claims → SPARQL)
- **C.2.1**: Execute vector → claims → SPARQL workflow successfully
- **C.2.2**: Stitch QIDs and claim GUIDs into metadata  
- **C.2.3**: Capture SPARQL query text in metadata
- **C.2.4**: Fallback to local store when MCP server unreachable
- **C.2.5**: Preserve existing ranking when fallback occurs

**Estimated**: 5 tests, ~4 hours implementation
**Progress**: 50% → **58% Complete** (7.5 of 13 subphases)

**Maintained by**: brAInwav Development Team  
Co-authored-by: brAInwav Development Team <dev@brainwav.ai>