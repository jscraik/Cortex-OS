import { workflowZ } from './schemas/workflow.zod.js';
import { createHash } from 'crypto';

// Validation cache to avoid re-validating identical workflows
const validationCache = new Map<string, { valid: boolean; result?: any; error?: Error }>();

// Maximum workflow depth to prevent stack overflow
const MAX_WORKFLOW_DEPTH = 1000;

// Cache cleanup interval (10 minutes)
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000;
let cacheCleanupTimer: NodeJS.Timeout | null = null;

interface ValidationResult {
  workflow: any;
  stats: {
    totalSteps: number;
    unreachableSteps: string[];
    maxDepth: number;
    cycleDetected: boolean;
  };
}

/**
 * Create a hash key for workflow caching
 */
function createWorkflowHash(workflow: any): string {
  // Create a hash based on the workflow structure for caching
  const structureData = JSON.stringify({
    entry: workflow.entry,
    steps: Object.keys(workflow.steps).sort(),
    connections: Object.fromEntries(
      Object.entries(workflow.steps).map(([id, step]: [string, any]) => [
        id,
        {
          next: step.next,
          branches: step.branches?.map((b: any) => b.to).sort(),
        }
      ])
    ),
  });
  
  return createHash('md5').update(structureData, 'utf8').digest('hex');
}

/**
 * Initialize cache cleanup if not already started
 */
function initializeCacheCleanup(): void {
  if (cacheCleanupTimer) return;
  
  cacheCleanupTimer = setInterval(() => {
    // Clear cache periodically to prevent memory leaks
    validationCache.clear();
  }, CACHE_CLEANUP_INTERVAL);
  
  // Don't keep the process alive
  if (cacheCleanupTimer.unref) {
    cacheCleanupTimer.unref();
  }
}

/**
 * Validate a workflow definition and ensure it forms a DAG with performance optimizations.
 */
export function validateWorkflow(input: unknown): ValidationResult {
  // Parse and validate schema first
  const wf = workflowZ.parse(input);
  
  // Create cache key for performance optimization
  const cacheKey = createWorkflowHash(wf);
  
  // Check cache first
  if (validationCache.has(cacheKey)) {
    const cached = validationCache.get(cacheKey)!;
    if (cached.valid) {
      return cached.result;
    } else {
      throw cached.error;
    }
  }

  // Initialize cache cleanup on first use
  initializeCacheCleanup();

  try {
    const result = validateWorkflowStructure(wf);
    
    // Cache successful validation
    validationCache.set(cacheKey, { valid: true, result });
    
    return result;
  } catch (error) {
    // Cache validation error
    validationCache.set(cacheKey, { valid: false, error: error as Error });
    throw error;
  }
}

/**
 * Optimized workflow structure validation
 */
function validateWorkflowStructure(wf: any): ValidationResult {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const unreachableSteps = new Set(Object.keys(wf.steps));
  let maxDepth = 0;
  let cycleDetected = false;

  // Pre-validate all step references
  const stepIds = new Set(Object.keys(wf.steps));
  
  // Validate entry point exists
  if (!stepIds.has(wf.entry)) {
    throw new Error(`Entry step '${wf.entry}' does not exist`);
  }

  // Pre-validate all next/branch references
  for (const [stepId, step] of Object.entries(wf.steps) as [string, any][]) {
    if (step.next && !stepIds.has(step.next)) {
      throw new Error(`Step '${stepId}' references non-existent next step: ${step.next}`);
    }
    
    if (step.branches) {
      for (const branch of step.branches) {
        if (!stepIds.has(branch.to)) {
          throw new Error(`Step '${stepId}' references non-existent branch target: ${branch.to}`);
        }
      }
    }
  }

  // Optimized DFS with path tracking and early termination
  const visit = (stepId: string, depth: number = 0, path: string[] = []): void => {
    // Prevent infinite recursion
    if (depth > MAX_WORKFLOW_DEPTH) {
      throw new Error(`Workflow depth exceeds maximum (${MAX_WORKFLOW_DEPTH}). Possible infinite loop involving: ${path.slice(-5).join(' -> ')}`);
    }

    // Track maximum depth
    maxDepth = Math.max(maxDepth, depth);

    // Cycle detection
    if (stack.has(stepId)) {
      cycleDetected = true;
      const cycleStart = path.indexOf(stepId);
      const cycle = path.slice(cycleStart).concat(stepId).join(' -> ');
      throw new Error(`Cycle detected: ${cycle}`);
    }

    // Skip if already processed
    if (visited.has(stepId)) {
      unreachableSteps.delete(stepId);
      return;
    }

    // Mark as reachable and being processed
    stack.add(stepId);
    visited.add(stepId);
    unreachableSteps.delete(stepId);

    const step = wf.steps[stepId];
    const currentPath = [...path, stepId];

    // Visit next step
    if (step.next) {
      visit(step.next, depth + 1, currentPath);
    }

    // Visit branch targets
    if (step.branches) {
      for (const branch of step.branches) {
        visit(branch.to, depth + 1, currentPath);
      }
    }

    // Remove from current processing stack
    stack.delete(stepId);
  };

  // Start validation from entry point
  visit(wf.entry);

  const stats = {
    totalSteps: Object.keys(wf.steps).length,
    unreachableSteps: Array.from(unreachableSteps),
    maxDepth,
    cycleDetected,
  };

  // Warn about unreachable steps (don't fail, just warn)
  if (stats.unreachableSteps.length > 0) {
    console.warn(`Workflow contains ${stats.unreachableSteps.length} unreachable steps: ${stats.unreachableSteps.join(', ')}`);
  }

  return {
    workflow: wf,
    stats,
  };
}

/**
 * Validate workflow with detailed performance metrics
 */
export function validateWorkflowWithMetrics(input: unknown): {
  result: ValidationResult;
  metrics: {
    validationTimeMs: number;
    cacheHit: boolean;
    stepCount: number;
    complexity: 'low' | 'medium' | 'high';
  };
} {
  const startTime = performance.now();
  const wf = workflowZ.parse(input);
  const cacheKey = createWorkflowHash(wf);
  const cacheHit = validationCache.has(cacheKey);
  
  const result = validateWorkflow(input);
  const endTime = performance.now();
  
  const stepCount = result.stats.totalSteps;
  let complexity: 'low' | 'medium' | 'high';
  
  if (stepCount <= 10) {
    complexity = 'low';
  } else if (stepCount <= 50) {
    complexity = 'medium';
  } else {
    complexity = 'high';
  }

  return {
    result,
    metrics: {
      validationTimeMs: endTime - startTime,
      cacheHit,
      stepCount,
      complexity,
    },
  };
}

/**
 * Clear validation cache (useful for testing or memory management)
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

/**
 * Get validation cache statistics
 */
export function getValidationCacheStats(): {
  size: number;
  hitRate: number;
  memoryUsage: number;
} {
  // This is a simplified approximation
  const memoryUsage = JSON.stringify(Array.from(validationCache.entries())).length;
  
  return {
    size: validationCache.size,
    hitRate: 0, // Would need separate tracking for actual hit rate
    memoryUsage,
  };
}

/**
 * Optimized validation for batch processing
 */
export function validateWorkflows(inputs: unknown[]): Array<{
  index: number;
  success: boolean;
  result?: ValidationResult;
  error?: Error;
  fromCache: boolean;
}> {
  return inputs.map((input, index) => {
    try {
      const wf = workflowZ.parse(input);
      const cacheKey = createWorkflowHash(wf);
      const fromCache = validationCache.has(cacheKey);
      
      const result = validateWorkflow(input);
      
      return {
        index,
        success: true,
        result,
        fromCache,
      };
    } catch (error) {
      return {
        index,
        success: false,
        error: error as Error,
        fromCache: false,
      };
    }
  });
}

/**
 * Check if workflow is likely to be expensive to validate
 */
export function estimateValidationCost(input: unknown): {
  estimatedCost: 'low' | 'medium' | 'high';
  stepCount: number;
  branchingFactor: number;
  estimatedTimeMs: number;
} {
  try {
    const wf = workflowZ.parse(input);
    const stepCount = Object.keys(wf.steps).length;
    
    let totalBranches = 0;
    for (const step of Object.values(wf.steps) as any[]) {
      if (step.branches) {
        totalBranches += step.branches.length;
      }
      if (step.next) {
        totalBranches += 1;
      }
    }
    
    const branchingFactor = stepCount > 0 ? totalBranches / stepCount : 0;
    
    // Rough estimation based on step count and branching
    let estimatedTimeMs: number;
    let estimatedCost: 'low' | 'medium' | 'high';
    
    if (stepCount <= 10) {
      estimatedTimeMs = 1;
      estimatedCost = 'low';
    } else if (stepCount <= 50) {
      estimatedTimeMs = stepCount * 0.5;
      estimatedCost = 'medium';
    } else {
      estimatedTimeMs = stepCount * branchingFactor * 2;
      estimatedCost = 'high';
    }
    
    return {
      estimatedCost,
      stepCount,
      branchingFactor,
      estimatedTimeMs,
    };
  } catch {
    return {
      estimatedCost: 'high',
      stepCount: 0,
      branchingFactor: 0,
      estimatedTimeMs: 100,
    };
  }
}
