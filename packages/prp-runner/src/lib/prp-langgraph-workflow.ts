import { StateGraph, END } from '@langchain/langgraph';
import { z } from 'zod';
import { ASBRAIIntegration } from '../asbr-ai-integration.js';
import { ModelSelector, type ModelConfig } from './model-selector.js';
import { ErrorBoundary, ErrorType } from './error-boundary.js';

// PRP-specific state schema
export const PRPWorkflowStateSchema = z.object({
  // Input
  prp: z.any(),
  context: z.any(),

  // Gate states
  gates: z.record(z.object({
    status: z.enum(['pending', 'running', 'passed', 'failed', 'skipped']),
    result: z.any().optional(),
    error: z.string().optional(),
    executionTime: z.number().optional()
  })).default({}),

  // Workflow state
  currentGate: z.string().optional(),
  phase: z.enum(['g0-ideation', 'g1-architecture', 'g2-test-plan', 'g3-code-review', 'g4-verification', 'g5-triage', 'g6-release-readiness', 'g7-release', 'completed']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),

  // Model selection
  selectedModel: z.any().optional(),
  modelConfig: z.any().optional(),

  // Results
  evidence: z.array(z.any()).default([]),
  insights: z.any().optional(),
  artifacts: z.array(z.any()).default([]),

  // Metadata
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalExecutionTime: z.number().optional()
});

export type PRPWorkflowState = z.infer<typeof PRPWorkflowStateSchema>;

/**
 * PRP Workflow using LangGraph state management
 */
export class PRPLangGraphWorkflow {
  private graph: StateGraph<PRPWorkflowState>;
  private aiIntegration: ASBRAIIntegration;
  private modelSelector: ModelSelector;
  private errorBoundary = new ErrorBoundary();

  // Gate definitions
  private gates = [
    'g0-ideation',
    'g1-architecture',
    'g2-test-plan',
    'g3-code-review',
    'g4-verification',
    'g5-triage',
    'g6-release-readiness',
    'g7-release'
  ];

  constructor(aiIntegration: ASBRAIIntegration, modelSelector: ModelSelector) {
    this.aiIntegration = aiIntegration;
    this.modelSelector = modelSelector;
    this.graph = this.createPRPGraph();
  }

  /**
   * Create the PRP workflow graph
   */
  private createPRPGraph(): StateGraph<PRPWorkflowState> {
    const workflow = new StateGraph(PRPWorkflowStateSchema);

    // Add nodes
    workflow.addNode('initialize', this.initialize.bind(this));
    workflow.addNode('selectModel', this.selectModel.bind(this));
    workflow.addNode('executeGate', this.executeGate.bind(this));
    workflow.addNode('validateGate', this.validateGate.bind(this));
    workflow.addNode('collectEvidence', this.collectEvidence.bind(this));
    workflow.addNode('generateInsights', this.generateInsights.bind(this));
    workflow.addNode('complete', this.complete.bind(this));
    workflow.addNode('handleError', this.handleError.bind(this));

    // Set entry point
    workflow.setEntryPoint('initialize');

    // Add edges
    workflow.addEdge('initialize', 'selectModel');
    workflow.addEdge('selectModel', 'executeGate');

    // Add conditional edges for gate execution
    workflow.addConditionalEdges('executeGate', this.shouldContinueToNextGate.bind(this), {
      next: 'validateGate',
      error: 'handleError',
      complete: 'collectEvidence'
    });

    workflow.addEdge('validateGate', 'collectEvidence');
    workflow.addEdge('collectEvidence', 'generateInsights');
    workflow.addEdge('generateInsights', 'complete');

    // Error handling
    workflow.addConditionalEdges('handleError', this.shouldRetryOrAbort.bind(this), {
      retry: 'executeGate',
      abort: END
    });

    workflow.addEdge('complete', END);

    return workflow;
  }

  /**
   * Initialize workflow
   */
  private async initialize(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    console.log('Initializing PRP workflow');

    // Initialize gate states
    const gateStates: Record<string, any> = {};
    this.gates.forEach(gateId => {
      gateStates[gateId] = {
        status: 'pending'
      };
    });

    return {
      gates: gateStates,
      currentGate: this.gates[0],
      phase: this.gates[0],
      status: 'running',
      startTime: new Date().toISOString()
    };
  }

  /**
   * Select optimal model for PRP processing
   */
  private async selectModel(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    try {
      const taskType = 'prp-analysis';
      const requiredCapabilities = ['code-analysis', 'documentation'];

      const selectedModel = this.modelSelector.selectOptimalModel(
        taskType,
        undefined, // input tokens
        requiredCapabilities
      );

      if (!selectedModel) {
        throw new Error('No suitable model found for PRP analysis');
      }

      return {
        selectedModel: selectedModel.id,
        modelConfig: selectedModel
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute current gate
   */
  private async executeGate(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    if (!state.currentGate || state.error) {
      return state;
    }

    try {
      const gateId = state.currentGate;
      console.log(`Executing gate: ${gateId}`);

      // Update gate status
      const updatedGates = { ...state.gates };
      updatedGates[gateId] = {
        ...updatedGates[gateId],
        status: 'running'
      };

      // Execute gate with error boundary
      const result = await this.errorBoundary.execute(
        async () => {
          return await this.executeSpecificGate(gateId, state);
        },
        {
          operationName: `gate-${gateId}`,
          timeout: 60000, // 1 minute per gate
          onError: (error) => {
            console.error(`Gate ${gateId} failed:`, error);
          }
        }
      );

      return {
        gates: {
          ...updatedGates,
          [gateId]: {
            ...updatedGates[gateId],
            status: 'passed',
            result,
            executionTime: Date.now()
          }
        }
      };
    } catch (error) {
      const gateId = state.currentGate!;
      return {
        gates: {
          ...state.gates,
          [gateId]: {
            ...state.gates[gateId],
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          }
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute a specific gate
   */
  private async executeSpecificGate(gateId: string, state: PRPWorkflowState): Promise<any> {
    // Import gate dynamically to avoid circular dependencies
    const { createGate } = await import('../gates/base.js');
    const gate = createGate(gateId);

    // Execute gate
    return await gate.execute({
      prp: state.prp,
      context: state.context,
      model: state.modelConfig,
      aiIntegration: this.aiIntegration
    });
  }

  /**
   * Validate gate result
   */
  private async validateGate(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    if (state.error) {
      return state;
    }

    // Basic validation - can be enhanced
    const currentGate = state.currentGate!;
    const gateResult = state.gates[currentGate];

    if (!gateResult.result) {
      return {
        error: `Gate ${currentGate} did not produce a result`
      };
    }

    return state;
  }

  /**
   * Collect evidence
   */
  private async collectEvidence(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    if (state.error) {
      return state;
    }

    try {
      // Use AI integration to collect evidence
      const evidence = await this.aiIntegration.collectEnhancedEvidence(
        {
          taskId: `prp-${Date.now()}`,
          claim: state.prp?.goal || '',
          sources: []
        },
        {
          maxContentLength: 5000,
          confidenceThreshold: 0.7
        }
      );

      return {
        evidence: evidence.originalEvidence ? [evidence.originalEvidence] : []
      };
    } catch (error) {
      console.warn('Evidence collection failed, continuing without evidence:', error);
      return { evidence: [] };
    }
  }

  /**
   * Generate insights from all gates
   */
  private async generateInsights(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    if (state.error) {
      return state;
    }

    try {
      // Aggregate results from all gates
      const gateResults = Object.entries(state.gates)
        .filter(([_, gate]) => gate.status === 'passed')
        .map(([gateId, gate]) => ({
          gate: gateId,
          result: gate.result
        }));

      // Generate insights using AI
      const insights = {
        summary: `PRP processed through ${gateResults.length} gates`,
        passedGates: gateResults.map(g => g.gate),
        totalGates: this.gates.length,
        evidenceCount: state.evidence.length,
        recommendations: []
      };

      return { insights };
    } catch (error) {
      console.warn('Insight generation failed:', error);
      return { insights: {} };
    }
  }

  /**
   * Complete workflow
   */
  private async complete(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    const endTime = new Date().toISOString();
    const executionTime = state.startTime
      ? new Date(endTime).getTime() - new Date(state.startTime).getTime()
      : 0;

    const allPassed = this.gates.every(gateId =>
      state.gates[gateId]?.status === 'passed'
    );

    return {
      currentGate: undefined,
      phase: 'completed',
      status: allPassed ? 'completed' : 'failed',
      endTime,
      totalExecutionTime: executionTime
    };
  }

  /**
   * Handle errors
   */
  private async handleError(state: PRPWorkflowState): Promise<Partial<PRPWorkflowState>> {
    console.error('PRP workflow error:', state.error);
    return state;
  }

  /**
   * Determine if should continue to next gate
   */
  private shouldContinueToNextGate(state: PRPWorkflowState): string {
    if (state.error) {
      return 'error';
    }

    const currentIndex = this.gates.indexOf(state.currentGate!);
    if (currentIndex === this.gates.length - 1) {
      return 'complete';
    }

    return 'next';
  }

  /**
   * Determine if should retry or abort
   */
  private shouldRetryOrAbort(state: PRPWorkflowState): string {
    const currentGate = state.currentGate!;
    const gateState = state.gates[currentGate];

    // Allow up to 3 retries per gate
    if (gateState && (gateState.retryCount || 0) < 3) {
      return 'retry';
    }

    return 'abort';
  }

  /**
   * Execute PRP workflow
   */
  async execute(prp: any, context: any = {}): Promise<PRPWorkflowState> {
    const initialState: PRPWorkflowState = {
      prp,
      context,
      gates: {},
      status: 'pending',
      evidence: [],
      artifacts: []
    };

    // Create and run workflow
    const app = this.graph.compile();
    const result = await app.invoke(initialState);

    return PRPWorkflowStateSchema.parse(result);
  }

  /**
   * Get workflow visualization
   */
  getGraphVisualization(): string {
    return `
PRP Workflow Graph:
initialize → selectModel → executeGate → validateGate
                                     ↓
collectEvidence → generateInsights → complete → END
    ↓
handleError → retry/abort
    `;
  }
}