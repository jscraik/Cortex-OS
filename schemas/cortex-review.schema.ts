import { z } from 'zod';

// Evidence schema with file path and hash validation
export const Evidence = z.object({
  path: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  claim: z.string().min(1),
  hash: z.string().min(8),
  neuron: z.enum(['planner', 'fixer', 'runner', 'reviewer']).optional(),
  timestamp: z.string().datetime().optional(),
});

// Finding with severity and category classification
export const Finding = z.object({
  id: z.string(),
  severity: z.enum(['blocker', 'major', 'minor', 'nit']),
  category: z.enum(['a11y', 'tests', 'security', 'perf', 'style', 'docs', 'tdd']),
  message: z.string(),
  evidence: z.array(Evidence).min(1),
  neuron_responsible: z.enum(['planner', 'fixer', 'runner', 'reviewer']).optional(),
  remediation_steps: z.array(z.string()).optional(),
});

// Validation gate results
export const ValidationGate = z.object({
  name: z.string(),
  status: z.enum(['pass', 'fail', 'skip']),
  command: z.string(),
  output: z.string().optional(),
  duration_ms: z.number().optional(),
  timestamp: z.string().datetime(),
});

// Neuron-specific evidence collection
export const NeuronEvidence = z.object({
  neuron: z.enum(['planner', 'fixer', 'runner', 'reviewer']),
  symbol: z.enum(['◆', '●', '■', '#']),
  tasks_completed: z.array(z.string()),
  artifacts_produced: z.array(z.string()),
  validation_results: z.array(ValidationGate).optional(),
  notes: z.string().optional(),
});

// Main review report following Cortex-OS patterns
export const CortexReviewReport = z.object({
  mode: z.enum(['ship', 'research']),
  cerebrum_flow: z.object({
    plan_presented: z.boolean(),
    cost_estimated: z.boolean(),
    approval_received: z.boolean(),
    changes_applied: z.boolean(),
    validation_completed: z.boolean(),
    summary_provided: z.boolean(),
  }),
  findings: z.array(Finding),
  neuron_evidence: z.array(NeuronEvidence),
  validation_gates: z.array(ValidationGate),
  tdd_compliance: z.object({
    tests_written_first: z.boolean(),
    minimal_implementation: z.boolean(),
    refactoring_completed: z.boolean(),
  }),
  accessibility: z.object({
    wcag_22_aa_compliant: z.boolean(),
    keyboard_accessible: z.boolean(),
    screen_reader_compatible: z.boolean(),
    color_contrast_validated: z.boolean(),
  }),
  summary: z.string(),
  timestamp: z.string().datetime(),
  prp_id: z.string().optional(),
});

// Context query schema for external context
export const ContextQuery = z.object({
  type: z.enum(['mcp_server', 'documentation', 'codebase_pattern', 'example']),
  target: z.string(),
  purpose: z.string(),
  priority: z.enum(['critical', 'important', 'optional']),
});

// INITIAL.md schema for structured requirements
export const InitialRequirements = z.object({
  title: z.string(),
  context: z.string(),
  requirements: z.array(z.string()),
  constraints: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
  tests: z.array(z.string()),
  acceptance_criteria: z.array(z.string()),
});

export type Evidence = z.infer<typeof Evidence>;
export type Finding = z.infer<typeof Finding>;
export type ValidationGate = z.infer<typeof ValidationGate>;
export type NeuronEvidence = z.infer<typeof NeuronEvidence>;
export type CortexReviewReport = z.infer<typeof CortexReviewReport>;
export type ContextQuery = z.infer<typeof ContextQuery>;
export type InitialRequirements = z.infer<typeof InitialRequirements>;
