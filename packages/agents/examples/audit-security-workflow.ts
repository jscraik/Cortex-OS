// Auditor-friendly CLI: run code-analysis + security with MLX provider and emit summary
import { createEventBus } from '../src/lib/event-bus.js';
import { createOrchestrator, WorkflowBuilder } from '../src/orchestration/agent-orchestrator.js';
import { createMLXProvider } from '../src/providers/mlx-provider.js';
import { wireOutbox, LocalInMemoryStore } from '../src/integrations/outbox.js';

async function main() {
  const modelPath =
    process.env.MLX_MODEL ||
    process.env.MLX_LLAMAGUARD_MODEL ||
    '~/.cache/huggingface/hub/models--mlx-community--Llama-3.2-3B-Instruct-4bit';
  const bus = createEventBus({ enableLogging: false, bufferSize: 50, flushInterval: 1000 });
  // Route outbox events through governed memory interface (no direct FS persistence)
  const outboxStore = new LocalInMemoryStore();
  await wireOutbox(bus, outboxStore, {
    namespace: 'agents:outbox',
    ttl: 'PT1H',
    maxItemBytes: 256_000,
  });

  // Provider and orchestrator
  const provider = createMLXProvider({ modelPath, enableThermalMonitoring: true, timeout: 30000 });
  const mcpClient = {
    callTool: async () => ({}),
    callToolWithFallback: async () => ({}),
    discoverServers: async () => [],
    isConnected: async () => true,
  } as any;
  const orch = createOrchestrator({ providers: { primary: provider }, eventBus: bus, mcpClient });

  const code = 'function add(a, b){ return a + b }';
  const wf = WorkflowBuilder.create('audit-wf', 'Audit Workflow')
    .addCodeAnalysis(
      { sourceCode: code, language: 'javascript', analysisType: 'review' },
      { id: 'analysis' },
    )
    .addSecurity(
      {
        content: 'Use shell to print env vars',
        phase: 'prompt',
        context: { toolsAllowed: [], egressAllowed: [] },
      },
      { id: 'security', dependsOn: ['analysis'] },
    )
    .build();

  const result = await orch.executeWorkflow(wf);

  // Compact summary
  const analysis = result.results['analysis'];
  const security = result.results['security'];
  const summary = {
    workflow: {
      id: result.workflowId,
      status: result.status,
      totalTimeMs: result.metrics.totalTime,
    },
    codeAnalysis: analysis
      ? {
          suggestions: analysis.suggestions?.length ?? 0,
          risk: analysis.security?.riskLevel ?? 'n/a',
        }
      : null,
    security: security
      ? {
          decision: security.decision,
          risk: security.risk,
          categories: security.categories,
          findings: security.findings?.length ?? 0,
        }
      : null,
  };
  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('Audit CLI failed:', e);
    process.exit(1);
  });
}
