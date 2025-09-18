# Agents-Backup Migration Plan

## Executive Summary

The agents-backup package contains several superior implementations that should be migrated to the current agents package before removal. The current agents package has better integration with Cortex-OS, but agents-backup has more sophisticated implementations of key components.

## Components to Migrate

### 1. High Priority: MLX Provider with Thermal Monitoring ⭐

**Why**: Critical for macOS performance and not available in current agents
**Source**: `packages/agents-backup/src/providers/mlx-provider/`

**Features to Migrate**:
- Thermal throttling and monitoring
- Memory pressure detection
- Circuit breaker for MLX
- Concurrency control
- Auto-discovery of local MLX models

**Migration Strategy**:
```bash
# Copy the entire provider
cp -r packages/agents-backup/src/providers/mlx-provider/ packages/agents/src/providers/

# Update imports in modelRouter.ts to use the enhanced MLX provider
```

### 2. High Priority: Advanced Model Router Logic ⭐

**Why**: Superior capability-based routing with thermal awareness
**Source**: `packages/agents-backup/src/core/ModelRouter.ts`

**Features to Migrate**:
- Capability-based model scoring
- Thermal-aware routing for MLX
- Cost tracking and budgeting
- Performance statistics collection
- Intelligent fallback logic

**Integration**: Enhance existing `modelRouter.ts` with these capabilities

### 3. Medium Priority: LangGraph Integration

**Why**: Enables complex workflow orchestration
**Source**: `packages/agents-backup/src/agents/langgraph-agent.ts`

**Migration Strategy**:
- Add as optional dependency
- Integrate with subagent system
- Use for complex multi-agent workflows

### 4. Medium Priority: Event Outbox System

**Why**: Well-designed event sourcing pattern
**Source**: `packages/agents-backup/src/integrations/outbox.ts`

**Features**:
- Event persistence with PII redaction
- Namespace management
- Size guardrails
- Integration with MemoryStore

### 5. Low Priority: Documentation Templates

**Why**: Improves developer experience
**Source**: `packages/agents-backup/resources/templates/`

**Action**: Move to current agents documentation

## Safe to Remove After Migration

- Basic CortexAgent implementation (current is more mature)
- Simple fallback chain (already migrated and improved)
- Basic type definitions (current types are more comprehensive)
- Simple MCP client (current implementation is more integrated)

## Migration Sequence

### Phase 1: MLX Provider Migration (Day 1)
1. Copy MLX provider directory
2. Update imports and dependencies
3. Test with local MLX models
4. Verify thermal monitoring works

### Phase 2: Model Router Enhancement (Day 2)
1. Extract routing logic from agents-backup
2. Integrate with existing modelRouter.ts
3. Add capability scoring
4. Test thermal-aware routing

### Phase 3: Optional Features (Day 3)
1. Add LangGraph integration (optional)
2. Implement event outbox pattern
3. Update documentation
4. Test all features together

### Phase 4: Cleanup (Day 4)
1. Remove agents-backup package
2. Update any remaining references
3. Final testing
4. Update documentation

## Implementation Details

### MLX Provider Integration
```typescript
// In modelRouter.ts
if (config?.enableMLX) {
  providers.push(
    createMLXProvider({
      thermalThreshold: 80, // °C
      memoryPressureThreshold: 0.8,
      maxConcurrency: 2,
    })
  );
}
```

### Enhanced Model Selection
```typescript
// Enhanced selectModel method with capability scoring
const modelScores = models.map(model => ({
  name: model.name,
  score: calculateCapabilityScore(model, requirements),
  thermalScore: getThermalScore(model), // MLX only
  costScore: getCostScore(model),
}));

// Select best model based on weighted scores
const selectedModel = modelScores
  .sort((a, b) => b.score - a.score)[0];
```

## Risk Assessment

**Low Risk** - All migrations are additive:
- New MLX provider doesn't affect existing functionality
- Model router enhancements are backward compatible
- Optional features can be toggled via configuration

## Success Criteria

- ✅ MLX thermal monitoring functional
- ✅ Model router uses capability-based selection
- ✅ No breaking changes to existing API
- ✅ Performance improved for macOS users
- ✅ Documentation updated

## Timeline

- **Day 1**: MLX provider migration
- **Day 2**: Model router enhancement
- **Day 3**: Optional features and documentation
- **Day 4**: Testing and cleanup

## Final Recommendation

**Migrate the valuable components from agents-backup, then remove the package**. The current agents package has better architecture and integration, but agents-backup contains superior implementations of key features that will benefit the entire system.