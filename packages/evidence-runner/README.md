# Evidence Runner

**MLX-powered Evidence Enhancement for brAInwav Cortex-OS**

Evidence Runner provides intelligent evidence analysis and enhancement capabilities using MLX models for privacy-sensitive processing and advanced AI techniques for comprehensive evidence validation.

## Features

- **🧠 MLX Integration**: Apple Silicon optimized evidence processing
- **🔍 Embedding Search**: Semantic similarity-based evidence discovery  
- **📊 Deterministic Processing**: Reproducible evidence enhancement results
- **🛡️ Error Resilience**: Graceful fallback mechanisms for robustness
- **📈 Observability**: Full telemetry and monitoring integration
- **⚡ Performance**: Sub-2s processing for standard evidence claims

## Quick Start

```typescript
import { EvidenceEnhancer } from '@cortex-os/evidence-runner';

const enhancer = new EvidenceEnhancer({
  mlxModelPath: '/path/to/qwen3-4b',
  enableMLXGeneration: true,
  enableEmbeddingSearch: true,
  confidenceBoost: 0.1,
  temperature: 0.3,
  maxTokens: 512
});

const enhanced = await enhancer.enhanceEvidence({
  taskId: 'task-001',
  claim: 'System performance meets SLA requirements',
  sources: [
    {
      type: 'file',
      path: '/src/metrics.ts',
      content: 'export const SLA_TARGET = 95;'
    }
  ]
});

console.log(`Confidence: ${enhanced.confidence}`);
console.log(`Analysis: ${enhanced.aiAnalysis}`);
```

## Configuration

### EvidenceEnhancerConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mlxModelPath` | `string` | *required* | Path to MLX model for enhancement |
| `embeddingModelPath` | `string` | *optional* | Path to embedding model for search |
| `enableMLXGeneration` | `boolean` | `true` | Enable MLX-powered analysis |
| `enableEmbeddingSearch` | `boolean` | `true` | Enable semantic search |
| `confidenceBoost` | `number` | `0.1` | Confidence boost for AI enhancements |
| `temperature` | `number` | `0.3` | Temperature for generation (0-2.0) |
| `maxTokens` | `number` | `512` | Maximum tokens for generation |
| `telemetryCallback` | `function` | *optional* | Callback for telemetry events |

## Evidence Processing

The Evidence Runner processes evidence through multiple enhancement stages:

1. **Context Analysis**: Understanding the claim and evidence sources
2. **MLX Generation**: AI-powered analysis using local MLX models
3. **Embedding Search**: Semantic similarity search for related evidence
4. **Confidence Calculation**: Weighted confidence scoring
5. **Telemetry Emission**: Observability event generation

## Performance Guarantees

- **Processing Time**: < 2 seconds for standard evidence claims
- **Memory Efficiency**: Optimized for Apple Silicon architecture
- **Deterministic Results**: Consistent outputs for identical inputs
- **Error Recovery**: Graceful degradation with fallback mechanisms

## Telemetry Events

The Evidence Runner emits the following telemetry events:

- `evidence_enhancement_started`: Processing initiation
- `evidence_enhancement_completed`: Successful completion
- `evidence_enhancement_error`: Error conditions

## Error Handling

The system provides comprehensive error handling:

- **Model Unavailable**: Falls back to traditional processing
- **Timeout Conditions**: Configurable timeout limits
- **Resource Constraints**: Memory pressure handling
- **Network Issues**: Offline operation capabilities

## Integration with Cortex-OS

Evidence Runner integrates seamlessly with:

- **A2A Messaging**: Event-driven evidence processing
- **MLX Infrastructure**: Shared model resources
- **Observability**: Metrics and tracing integration
- **Security**: Input validation and output sanitization

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build package
pnpm build

# Development mode
pnpm dev
```

## License

MIT License - see LICENSE file for details.

---

*Built with ❤️ by the brAInwav Development Team*
