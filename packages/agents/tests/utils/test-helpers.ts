import { vi } from 'vitest';
import type { Agent, CodeAnalysisRequest } from '@/index.js';

// Security validation helpers
export class SecurityValidator {
  static sanitizeInput(input: string): string {
    // Comprehensive sanitization for security testing
    let sanitized = input;
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /innerHTML\s*=/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /<script[^>]*>/gi,
      /system\s*:/gi,
      /assistant\s*:/gi,
      /ignore\s+previous\s+instructions/gi,
      /\{\{constructor/gi,
      /repeat\s+your\s+training\s+data/gi,
      /what\s+is\s+your\s+system\s+prompt/gi,
      /give\s+me\s+your\s+exact\s+instructions/gi
    ];
    
    dangerousPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '[FILTERED]');
      }
    });
    
    // Also filter repeated suspicious words
    const suspiciousWords = ['ignore', 'system', 'prompt', 'instructions'];
    suspiciousWords.forEach(word => {
      const repeatedPattern = new RegExp(`\\b${word}\\b.*\\b${word}\\b.*\\b${word}\\b`, 'gi');
      if (repeatedPattern.test(sanitized)) {
        sanitized = sanitized.replace(repeatedPattern, '[FILTERED]');
      }
    });
    
    return sanitized;
  }

  static detectPII(input: string): string[] {
    const piiPatterns = [
      { type: 'ssn', pattern: /\d{3}-\d{2}-\d{4}/, replacement: '[SSN-REDACTED]' },
      { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, replacement: '[EMAIL-REDACTED]' },
      { type: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, replacement: '[PHONE-REDACTED]' },
      { type: 'credit_card', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, replacement: '[CC-REDACTED]' }
    ];

    const detected: string[] = [];
    piiPatterns.forEach(({ type, pattern }) => {
      if (pattern.test(input)) {
        detected.push(type);
      }
    });

    return detected;
  }

  static redactPII(input: string): string {
    const piiPatterns = [
      { pattern: /\d{3}-\d{2}-\d{4}/, replacement: '[SSN-REDACTED]' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, replacement: '[EMAIL-REDACTED]' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, replacement: '[PHONE-REDACTED]' },
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, replacement: '[CC-REDACTED]' }
    ];

    let redacted = input;
    piiPatterns.forEach(({ pattern, replacement }) => {
      redacted = redacted.replace(pattern, replacement);
    });

    return redacted;
  }

  static validateConfidenceThreshold(confidence: number, threshold = 0.7): boolean {
    return confidence >= threshold;
  }

  static checkRateLimiting(requestCount: number, timeWindow: number, limit: number): boolean {
    // Simple rate limiting check - in real implementation would use sliding window
    return requestCount <= limit;
  }
}

// Accessibility validation helpers
export class AccessibilityValidator {
  static validateStructuredOutput(output: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!output.type) {
      issues.push('Missing output type for screen readers');
    }

    if (!output.summary) {
      issues.push('Missing summary for accessibility');
    }

    if (!output.accessibility) {
      issues.push('Missing accessibility metadata');
    } else {
      if (!output.accessibility.screenReaderText) {
        issues.push('Missing screen reader text');
      }
      if (!output.accessibility.keyboardShortcuts) {
        issues.push('Missing keyboard shortcuts');
      }
      if (!output.accessibility.colorIndependentIndicators) {
        issues.push('Missing color-independent indicators');
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  static generateScreenReaderText(result: any): string {
    if (result.suggestions?.length) {
      const priority = result.suggestions[0].priority;
      const count = result.suggestions.length;
      return `Analysis found ${count} suggestion${count > 1 ? 's' : ''} with ${priority} priority`;
    }
    return 'Analysis completed with no suggestions';
  }
}

// Mock factory helpers
export class MockFactory {
  static createFetchMock(response: any, ok = true, status = 200) {
    return vi.fn().mockResolvedValue({
      ok,
      status,
      json: vi.fn().mockResolvedValue(response),
      text: vi.fn().mockResolvedValue(JSON.stringify(response))
    });
  }

  static createEventEmitterMock() {
    return {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
      listeners: vi.fn().mockReturnValue([]),
      addListener: vi.fn(),
      removeListener: vi.fn()
    };
  }

  static createAgentMock(overrides: Partial<Agent> = {}): Agent {
    return {
      id: 'mock-agent',
      name: 'Mock Agent',
      capabilities: ['test-capability'],
      ...overrides
    };
  }
}

// Performance testing helpers
export class PerformanceTestHelper {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = Date.now();
    const result = await fn();
    const time = Date.now() - start;
    return { result, time };
  }

  static createMemoryUsageTracker() {
    const initialMemory = process.memoryUsage();
    
    return {
      getUsage: () => {
        const current = process.memoryUsage();
        return {
          heapUsed: current.heapUsed - initialMemory.heapUsed,
          heapTotal: current.heapTotal - initialMemory.heapTotal,
          external: current.external - initialMemory.external,
          rss: current.rss - initialMemory.rss
        };
      },
      reset: () => {
        const newInitial = process.memoryUsage();
        initialMemory.heapUsed = newInitial.heapUsed;
        initialMemory.heapTotal = newInitial.heapTotal;
        initialMemory.external = newInitial.external;
        initialMemory.rss = newInitial.rss;
      }
    };
  }
}

// Test data generators
export class TestDataGenerator {
  static generateCodeSample(language: string, complexity: 'low' | 'medium' | 'high' = 'medium'): string {
    const samples = {
      javascript: {
        low: 'const greeting = "Hello, World!"; console.log(greeting);',
        medium: `
function processData(data) {
  if (!data || !Array.isArray(data)) {
    throw new Error('Invalid data');
  }
  return data
    .filter(item => item.active)
    .map(item => ({ ...item, processed: true }))
    .sort((a, b) => a.priority - b.priority);
}`,
        high: `
class DataProcessor {
  constructor(config) {
    this.config = { timeout: 5000, retries: 3, ...config };
    this.cache = new Map();
    this.eventEmitter = new EventEmitter();
  }

  async processWithRetry(data, retryCount = 0) {
    try {
      const result = await this.process(data);
      this.eventEmitter.emit('success', { data, result });
      return result;
    } catch (error) {
      if (retryCount < this.config.retries) {
        await this.delay(Math.pow(2, retryCount) * 1000);
        return this.processWithRetry(data, retryCount + 1);
      }
      this.eventEmitter.emit('error', { data, error });
      throw error;
    }
  }
}`
      }
    };

    return samples[language as keyof typeof samples]?.[complexity] || samples.javascript.medium;
  }

  static generateAnalysisRequest(overrides: Partial<CodeAnalysisRequest> = {}): CodeAnalysisRequest {
    return {
      code: this.generateCodeSample('javascript', 'medium'),
      language: 'javascript',
      context: 'Test analysis request',
      analysisType: 'review',
      urgency: 'medium',
      ...overrides
    };
  }
}

// Golden test helpers
export class GoldenTestHelper {
  static createDeterministicSeed(): number {
    // Use a fixed seed for reproducible results
    return 12345;
  }

  static hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  static normalizeAnalysisResult(result: any): any {
    // Remove non-deterministic fields for golden test comparison
    const normalized = { ...result };
    delete normalized.processingTime;
    delete normalized.timestamp;
    
    // Sort arrays for consistent comparison
    if (normalized.suggestions) {
      normalized.suggestions.sort((a: any, b: any) => a.line - b.line);
    }
    
    return normalized;
  }
}

// Golden test seeded mock
export function createSeededMock(seed: number, responses: Array<() => Promise<any>>): ReturnType<typeof vi.fn> {
  // Use seed to create deterministic mock behavior
  let callIndex = 0;
  const seededResponses = responses.map((response, index) => {
    // Apply seed-based variation to make responses deterministic but realistic
    return async () => {
      const base = await response();
      return {
        ...base,
        seed: seed + index
      };
    };
  });
  
  return vi.fn().mockImplementation(() => {
    const responseIndex = callIndex % seededResponses.length;
    callIndex++;
    return seededResponses[responseIndex]();
  });
}