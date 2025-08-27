/**
 * @file Semantic Message Validator
 * @description AI-enhanced validation and anomaly detection for A2A messages
 */

import { z } from 'zod';
import { AIRequest, EmbeddingRequest } from './adapter.js';
import { AICapability } from './config.js';
import { AIModelManager } from './manager.js';

/**
 * Validation result schema
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  confidence: z.number().min(0).max(1),
  score: z.number().min(0).max(1),
  anomalies: z.array(
    z.object({
      type: z.enum(['structure', 'content', 'security', 'format', 'semantic']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      location: z.string().optional(),
      suggestion: z.string().optional(),
    }),
  ),
  metadata: z.object({
    processingTime: z.number(),
    modelUsed: z.string(),
    validationMethod: z.enum(['ai', 'rule-based', 'hybrid']),
    embedding: z
      .object({
        similarity: z.number().optional(),
        dimension: z.number().optional(),
      })
      .optional(),
  }),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Validation context schema
 */
export const ValidationContextSchema = z.object({
  expectedFormat: z.enum(['json', 'xml', 'text', 'binary']).default('json'),
  requiredFields: z.array(z.string()).default([]),
  securityChecks: z.boolean().default(true),
  semanticChecks: z.boolean().default(true),
  referenceMessages: z.array(z.string()).default([]),
  maxSize: z.number().default(1024 * 1024), // 1MB default
  allowedSources: z.array(z.string()).default([]),
  contentPolicies: z.array(z.string()).default([]),
});

export type ValidationContext = z.infer<typeof ValidationContextSchema>;

/**
 * Semantic Message Validator
 */
export class SemanticMessageValidator {
  private readonly aiManager: AIModelManager;
  private readonly validationHistory: Map<string, ValidationResult[]> = new Map();
  private readonly knownGoodEmbeddings: number[][] = [];
  private readonly anomalyThreshold = 0.7;

  constructor(aiManager: AIModelManager) {
    this.aiManager = aiManager;
  }

  /**
   * Validate message with AI-enhanced analysis
   */
  async validateMessage(
    message: string,
    context: ValidationContext = {},
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const validatedContext = ValidationContextSchema.parse(context);

    try {
      // Parallel validation approaches
      const [structuralResult, semanticResult, securityResult] = await Promise.allSettled([
        this.validateStructure(message, validatedContext),
        this.validateSemantics(message, validatedContext),
        this.validateSecurity(message, validatedContext),
      ]);

      // Combine results
      const combinedResult = this.combineValidationResults(
        [structuralResult, semanticResult, securityResult],
        startTime,
      );

      // Store in history for learning
      this.addToValidationHistory(message, combinedResult);

      return combinedResult;
    } catch (error) {
      // Fallback to rule-based validation
      console.warn(`AI validation failed, using fallback: ${error}`);
      return this.fallbackValidation(message, validatedContext, startTime);
    }
  }

  /**
   * Validate message structure and format
   */
  private async validateStructure(
    message: string,
    context: ValidationContext,
  ): Promise<Partial<ValidationResult>> {
    const anomalies: ValidationResult['anomalies'] = [];

    // Size check
    if (message.length > context.maxSize) {
      anomalies.push({
        type: 'structure',
        severity: 'high',
        description: `Message size ${message.length} exceeds limit ${context.maxSize}`,
        suggestion: 'Reduce message size or split into multiple messages',
      });
    }

    // Format validation
    if (context.expectedFormat === 'json') {
      try {
        JSON.parse(message);
      } catch {
        anomalies.push({
          type: 'format',
          severity: 'high',
          description: 'Invalid JSON format',
          suggestion: 'Ensure message is valid JSON',
        });
      }
    }

    // Required fields check
    if (context.requiredFields.length > 0 && context.expectedFormat === 'json') {
      try {
        const parsed = JSON.parse(message);
        for (const field of context.requiredFields) {
          if (!(field in parsed)) {
            anomalies.push({
              type: 'structure',
              severity: 'medium',
              description: `Missing required field: ${field}`,
              location: `root.${field}`,
              suggestion: `Add required field ${field}`,
            });
          }
        }
      } catch {
        // Already handled in format validation
      }
    }

    return {
      anomalies,
      isValid:
        anomalies.filter((a) => a.severity === 'high' || a.severity === 'critical').length === 0,
      confidence: anomalies.length === 0 ? 0.95 : 0.7,
    };
  }

  /**
   * Validate message semantics using AI embeddings
   */
  private async validateSemantics(
    message: string,
    context: ValidationContext,
  ): Promise<Partial<ValidationResult>> {
    if (!context.semanticChecks) {
      return { isValid: true, confidence: 1.0, anomalies: [] };
    }

    const adapter = await this.aiManager.getBestAdapter(AICapability.MESSAGE_VALIDATION);

    if (!adapter) {
      return { isValid: true, confidence: 0.5, anomalies: [] };
    }

    try {
      // Generate embedding for the message
      const embeddingRequest: EmbeddingRequest = {
        text: message,
      };

      const embeddingResponse = await adapter.generateEmbedding(embeddingRequest);
      const messageEmbedding = embeddingResponse.embedding;

      // Compare with known good embeddings
      const similarities = this.knownGoodEmbeddings.map((knownEmbedding) =>
        this.cosineSimilarity(messageEmbedding, knownEmbedding),
      );

      const maxSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0.5;
      const anomalies: ValidationResult['anomalies'] = [];

      // Check for semantic anomalies
      if (similarities.length > 0 && maxSimilarity < this.anomalyThreshold) {
        anomalies.push({
          type: 'semantic',
          severity: maxSimilarity < 0.3 ? 'high' : 'medium',
          description: `Message semantically divergent from known patterns (similarity: ${maxSimilarity.toFixed(3)})`,
          suggestion: 'Review message content for unexpected semantic patterns',
        });
      }

      // Use AI for content analysis
      const analysisResult = await this.analyzeMessageContent(message, adapter);
      anomalies.push(...analysisResult.anomalies);

      return {
        isValid:
          anomalies.filter((a) => a.severity === 'high' || a.severity === 'critical').length === 0,
        confidence: Math.min(0.9, maxSimilarity + 0.1),
        anomalies,
        metadata: {
          embedding: {
            similarity: maxSimilarity,
            dimension: messageEmbedding.length,
          },
        },
      };
    } catch (error) {
      console.warn(`Semantic validation failed: ${error}`);
      return { isValid: true, confidence: 0.5, anomalies: [] };
    }
  }

  /**
   * Analyze message content using AI
   */
  private async analyzeMessageContent(
    message: string,
    adapter: any,
  ): Promise<{ anomalies: ValidationResult['anomalies'] }> {
    const analysisPrompt = `Analyze this A2A message for potential issues:

MESSAGE: "${message}"

Look for:
1. Security concerns (injection attempts, suspicious patterns)
2. Content policy violations (inappropriate content, spam)
3. Structural inconsistencies
4. Semantic anomalies

Respond with JSON format:
{
  "anomalies": [
    {
      "type": "security|content|structure|semantic",
      "severity": "low|medium|high|critical",
      "description": "detailed description",
      "suggestion": "how to fix"
    }
  ]
}

JSON Response:`;

    try {
      const request: AIRequest = {
        prompt: analysisPrompt,
        capability: AICapability.MESSAGE_VALIDATION,
        maxTokens: 1024,
        temperature: 0.1,
      };

      const response = await adapter.generateText(request);

      // Parse AI response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(response.content);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { anomalies: parsed.anomalies || [] };
      }

      return { anomalies: [] };
    } catch (error) {
      console.warn(`Content analysis failed: ${error}`);
      return { anomalies: [] };
    }
  }

  /**
   * Validate message security
   */
  private async validateSecurity(
    message: string,
    context: ValidationContext,
  ): Promise<Partial<ValidationResult>> {
    if (!context.securityChecks) {
      return { isValid: true, confidence: 1.0, anomalies: [] };
    }

    const anomalies: ValidationResult['anomalies'] = [];

    // Basic security checks
    const securityPatterns = [
      { pattern: /<script/i, type: 'XSS injection attempt', severity: 'critical' as const },
      { pattern: /union.*select/i, type: 'SQL injection attempt', severity: 'critical' as const },
      { pattern: /\.\.\/|\.\.\\/, type: 'Path traversal attempt', severity: 'high' as const },
      {
        pattern: /eval\s*\(|Function\s*\(/,
        type: 'Code injection attempt',
        severity: 'critical' as const,
      },
      { pattern: /javascript:/i, type: 'JavaScript protocol', severity: 'high' as const },
    ];

    for (const { pattern, type, severity } of securityPatterns) {
      if (pattern.test(message)) {
        anomalies.push({
          type: 'security',
          severity,
          description: `Detected ${type}`,
          suggestion: 'Remove or sanitize suspicious content',
        });
      }
    }

    // Check content policies
    for (const policy of context.contentPolicies) {
      if (message.toLowerCase().includes(policy.toLowerCase())) {
        anomalies.push({
          type: 'content',
          severity: 'medium',
          description: `Content policy violation: ${policy}`,
          suggestion: 'Review content against policies',
        });
      }
    }

    return {
      isValid: anomalies.filter((a) => a.severity === 'critical').length === 0,
      confidence: anomalies.length === 0 ? 0.9 : 0.6,
      anomalies,
    };
  }

  /**
   * Combine multiple validation results
   */
  private combineValidationResults(
    results: PromiseSettledResult<Partial<ValidationResult>>[],
    startTime: number,
  ): ValidationResult {
    const allAnomalies: ValidationResult['anomalies'] = [];
    let minConfidence = 1.0;
    let validationMethod: 'ai' | 'rule-based' | 'hybrid' = 'rule-based';
    let modelUsed = 'rule-based';

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.anomalies) {
          allAnomalies.push(...result.value.anomalies);
        }
        if (result.value.confidence !== undefined) {
          minConfidence = Math.min(minConfidence, result.value.confidence);
        }
        if (result.value.metadata?.modelUsed) {
          modelUsed = result.value.metadata.modelUsed;
          validationMethod = 'ai';
        }
      }
    }

    if (allAnomalies.some((a) => a.type === 'semantic')) {
      validationMethod = 'hybrid';
    }

    const criticalAnomalies = allAnomalies.filter(
      (a) => a.severity === 'critical' || a.severity === 'high',
    );

    return ValidationResultSchema.parse({
      isValid: criticalAnomalies.length === 0,
      confidence: minConfidence,
      score: Math.max(0, 1 - allAnomalies.length * 0.1),
      anomalies: allAnomalies,
      metadata: {
        processingTime: Date.now() - startTime,
        modelUsed,
        validationMethod,
      },
    });
  }

  /**
   * Fallback validation using only rule-based checks
   */
  private fallbackValidation(
    message: string,
    context: ValidationContext,
    startTime: number,
  ): ValidationResult {
    const anomalies: ValidationResult['anomalies'] = [];

    // Basic checks
    if (message.length === 0) {
      anomalies.push({
        type: 'structure',
        severity: 'high',
        description: 'Empty message',
        suggestion: 'Provide message content',
      });
    }

    if (message.length > context.maxSize) {
      anomalies.push({
        type: 'structure',
        severity: 'high',
        description: `Message too large: ${message.length} > ${context.maxSize}`,
        suggestion: 'Reduce message size',
      });
    }

    return ValidationResultSchema.parse({
      isValid:
        anomalies.filter((a) => a.severity === 'high' || a.severity === 'critical').length === 0,
      confidence: 0.7,
      score: anomalies.length === 0 ? 1.0 : 0.5,
      anomalies,
      metadata: {
        processingTime: Date.now() - startTime,
        modelUsed: 'fallback',
        validationMethod: 'rule-based',
      },
    });
  }

  /**
   * Add message embedding to known good patterns
   */
  async addKnownGoodMessage(message: string): Promise<void> {
    const adapter = await this.aiManager.getBestAdapter(AICapability.MESSAGE_VALIDATION);

    if (!adapter) return;

    try {
      const embeddingRequest: EmbeddingRequest = { text: message };
      const response = await adapter.generateEmbedding(embeddingRequest);

      this.knownGoodEmbeddings.push(response.embedding);

      // Keep only last 100 known good embeddings
      if (this.knownGoodEmbeddings.length > 100) {
        this.knownGoodEmbeddings.shift();
      }
    } catch (error) {
      console.warn(`Failed to add known good message: ${error}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Add validation result to history
   */
  private addToValidationHistory(message: string, result: ValidationResult): void {
    const messageKey = this.getMessageKey(message);

    if (!this.validationHistory.has(messageKey)) {
      this.validationHistory.set(messageKey, []);
    }

    const history = this.validationHistory.get(messageKey);
    if (!history) return;

    history.push(result);

    // Keep only last 20 validation results per message pattern
    if (history.length > 20) {
      history.shift();
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    validationRate: number;
    averageConfidence: number;
    anomalyDistribution: Record<string, number>;
    averageProcessingTime: number;
  } {
    let totalValidations = 0;
    let successfulValidations = 0;
    let totalConfidence = 0;
    let totalProcessingTime = 0;
    const anomalyDistribution: Record<string, number> = {};

    for (const [, results] of this.validationHistory) {
      for (const result of results) {
        totalValidations++;
        if (result.isValid) successfulValidations++;
        totalConfidence += result.confidence;
        totalProcessingTime += result.metadata.processingTime;

        for (const anomaly of result.anomalies) {
          const key = `${anomaly.type}-${anomaly.severity}`;
          anomalyDistribution[key] = (anomalyDistribution[key] || 0) + 1;
        }
      }
    }

    return {
      totalValidations,
      validationRate: totalValidations > 0 ? successfulValidations / totalValidations : 0,
      averageConfidence: totalValidations > 0 ? totalConfidence / totalValidations : 0,
      anomalyDistribution,
      averageProcessingTime: totalValidations > 0 ? totalProcessingTime / totalValidations : 0,
    };
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory.clear();
  }

  /**
   * Clear known good embeddings
   */
  clearKnownGoodPatterns(): void {
    this.knownGoodEmbeddings.length = 0;
  }

  /**
   * Generate message key for grouping
   */
  private getMessageKey(message: string): string {
    const normalized = message
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized.substring(0, 50);
  }
}
