/**
 * Multi-modal input processing system
 * Handles text, image, audio, and video inputs with appropriate preprocessing
 */

import { EventEmitter } from 'node:events';
import type {
  MultiModalInput,
  TextInput,
  ImageInput,
  AudioInput,
  VideoInput,
  AgentInput,
  ConversationContext,
  ProcessedInput,
  AgentError
} from '../types';

export interface InputProcessorConfig {
  maxTextLength?: number;
  maxImageSize?: number; // in bytes
  maxAudioDuration?: number; // in seconds
  maxVideoDuration?: number; // in seconds
  supportedImageFormats?: string[];
  supportedAudioFormats?: string[];
  supportedVideoFormats?: string[];
  enablePIIDetection?: boolean;
  enableContentValidation?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  processedInput: ProcessedInput;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    processingTime: number;
    inputSize: number;
    extractedFeatures?: Record<string, unknown>;
  };
}

/**
 * Multi-modal input processor
 */
export class InputProcessor extends EventEmitter {
  private config: InputProcessorConfig;

  constructor(config: InputProcessorConfig = {}) {
    super();
    this.config = {
      maxTextLength: config.maxTextLength || 100000,
      maxImageSize: config.maxImageSize || 10 * 1024 * 1024, // 10MB
      maxAudioDuration: config.maxAudioDuration || 300, // 5 minutes
      maxVideoDuration: config.maxVideoDuration || 600, // 10 minutes
      supportedImageFormats: config.supportedImageFormats || ['jpeg', 'png', 'gif', 'webp'],
      supportedAudioFormats: config.supportedAudioFormats || ['mp3', 'wav', 'ogg'],
      supportedVideoFormats: config.supportedVideoFormats || ['mp4', 'webm', 'mov'],
      enablePIIDetection: config.enablePIIDetection ?? true,
      enableContentValidation: config.enableContentValidation ?? true,
      ...config
    };
  }

  /**
   * Process multi-modal input
   */
  async process(input: AgentInput): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedInputs: ProcessedInput[] = [];

    try {
      // Validate input structure
      this.validateInputStructure(input);

      // Process each input item
      for (const inputItem of input.inputs) {
        try {
          const processed = await this.processInputItem(inputItem);
          processedInputs.push(processed);

          // Emit processing event
          this.emit('input_processed', {
            type: inputItem.type,
            id: processed.id,
            timestamp: Date.now()
          });

        } catch (error) {
          errors.push(`Failed to process ${inputItem.type} input: ${error}`);
        }
      }

      // Create final processed input
      const processedInput: ProcessedInput = {
        id: this.generateId(),
        originalInput: input,
        processedInputs,
        context: await this.enrichContext(input.context),
        timestamp: new Date().toISOString()
      };

      // Calculate processing metadata
      const processingTime = Date.now() - startTime;
      const inputSize = this.calculateInputSize(input.inputs);

      const result: ProcessingResult = {
        success: errors.length === 0,
        processedInput,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          processingTime,
          inputSize,
          extractedFeatures: this.extractFeatures(processedInputs)
        }
      };

      // Emit completion event
      this.emit('processing_complete', {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      const processingError = error instanceof Error ? error : new Error(String(error));
      this.emit('processing_error', {
        error: processingError,
        timestamp: Date.now()
      });

      return {
        success: false,
        processedInput: {
          id: this.generateId(),
          originalInput: input,
          processedInputs: [],
          context: input.context,
          timestamp: new Date().toISOString()
        },
        errors: [processingError.message]
      };
    }
  }

  /**
   * Process a single input item
   */
  private async processInputItem(input: MultiModalInput): Promise<ProcessedInput> {
    switch (input.type) {
      case 'text':
        return await this.processTextInput(input);
      case 'image':
        return await this.processImageInput(input);
      case 'audio':
        return await this.processAudioInput(input);
      case 'video':
        return await this.processVideoInput(input);
      default:
        throw new Error(`Unsupported input type: ${(input as any).type}`);
    }
  }

  /**
   * Process text input
   */
  private async processTextInput(input: TextInput): Promise<ProcessedInput> {
    // Validate text length
    if (input.content.length > this.config.maxTextLength!) {
      throw new Error(`Text exceeds maximum length of ${this.config.maxTextLength} characters`);
    }

    // Detect and redact PII if enabled
    let content = input.content;
    if (this.config.enablePIIDetection) {
      content = this.redactPII(content);
    }

    // Extract text features
    const features = await this.extractTextFeatures(content);

    return {
      id: this.generateId(),
      type: 'text',
      original: input,
      processed: { content },
      confidence: 1.0,
      features,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process image input
   */
  private async processImageInput(input: ImageInput): Promise<ProcessedInput> {
    // Validate image format
    if (input.url) {
      const format = this.getImageFormat(input.url);
      if (!this.config.supportedImageFormats!.includes(format)) {
        throw new Error(`Unsupported image format: ${format}`);
      }
    }

    // If base64 is provided, validate size
    if (input.base64) {
      const size = Buffer.byteLength(input.base64, 'base64');
      if (size > this.config.maxImageSize!) {
        throw new Error(`Image exceeds maximum size of ${this.config.maxImageSize} bytes`);
      }
    }

    // Extract image features (would use vision models in production)
    const features = await this.extractImageFeatures(input);

    return {
      id: this.generateId(),
      type: 'image',
      original: input,
      processed: {
        description: input.description || 'Image content',
        features: features.visionFeatures
      },
      confidence: features.confidence,
      features,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process audio input
   */
  private async processAudioInput(input: AudioInput): Promise<ProcessedInput> {
    // Validate duration if provided
    if (input.duration && input.duration > this.config.maxAudioDuration!) {
      throw new Error(`Audio exceeds maximum duration of ${this.config.maxAudioDuration} seconds`);
    }

    // Extract audio features
    const features = await this.extractAudioFeatures(input);

    return {
      id: this.generateId(),
      type: 'audio',
      original: input,
      processed: {
        transcript: input.transcript || 'Audio transcript not available',
        duration: input.duration,
        features: features.audioFeatures
      },
      confidence: features.confidence,
      features,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process video input
   */
  private async processVideoInput(input: VideoInput): Promise<ProcessedInput> {
    // Validate duration if provided
    if (input.duration && input.duration > this.config.maxVideoDuration!) {
      throw new Error(`Video exceeds maximum duration of ${this.config.maxVideoDuration} seconds`);
    }

    // Extract video features
    const features = await this.extractVideoFeatures(input);

    return {
      id: this.generateId(),
      type: 'video',
      original: input,
      processed: {
        description: input.description || 'Video content',
        duration: input.duration,
        frameCount: input.frames?.length || 0,
        features: features.videoFeatures
      },
      confidence: features.confidence,
      features,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate input structure
   */
  private validateInputStructure(input: AgentInput): void {
    if (!input.inputs || !Array.isArray(input.inputs) || input.inputs.length === 0) {
      throw new Error('Input must contain at least one input item');
    }

    // Validate each input item
    for (const item of input.inputs) {
      if (!item.type || !['text', 'image', 'audio', 'video'].includes(item.type)) {
        throw new Error(`Invalid input type: ${item.type}`);
      }
    }
  }

  /**
   * Enrich context with additional information
   */
  private async enrichContext(context?: ConversationContext): Promise<ConversationContext | undefined> {
    if (!context) return undefined;

    // Add processing timestamp
    const enriched = {
      ...context,
      processedAt: new Date().toISOString(),
      inputCount: this.config.enableContentValidation ? 'validated' : 'raw'
    };

    return enriched;
  }

  /**
   * PII redaction for text content
   */
  private redactPII(text: string): string {
    // Simple PII detection patterns
    const piiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED-SSN]' },
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[REDACTED-CARD]' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[REDACTED-EMAIL]' },
      { pattern: /\b\d{10}\b/g, replacement: '[REDACTED-PHONE]' }
    ];

    let redactedText = text;
    for (const { pattern, replacement } of piiPatterns) {
      redactedText = redactedText.replace(pattern, replacement);
    }

    return redactedText;
  }

  /**
   * Extract text features
   */
  private async extractTextFeatures(content: string): Promise<Record<string, unknown>> {
    return {
      length: content.length,
      wordCount: content.split(/\s+/).length,
      language: this.detectLanguage(content),
      sentiment: this.analyzeSentiment(content),
      complexity: this.calculateComplexity(content),
      keywords: this.extractKeywords(content)
    };
  }

  /**
   * Extract image features
   */
  private async extractImageFeatures(input: ImageInput): Promise<{
    confidence: number;
    visionFeatures: Record<string, unknown>;
  }> {
    // In production, this would use actual vision models
    return {
      confidence: 0.8,
      visionFeatures: {
        hasDescription: !!input.description,
        format: input.url ? this.getImageFormat(input.url) : 'base64',
        estimatedObjects: input.description ? ['described'] : ['unknown']
      }
    };
  }

  /**
   * Extract audio features
   */
  private async extractAudioFeatures(input: AudioInput): Promise<{
    confidence: number;
    audioFeatures: Record<string, unknown>;
  }> {
    return {
      confidence: input.transcript ? 0.9 : 0.5,
      audioFeatures: {
        hasTranscript: !!input.transcript,
        duration: input.duration,
        quality: 'unknown'
      }
    };
  }

  /**
   * Extract video features
   */
  private async extractVideoFeatures(input: VideoInput): Promise<{
    confidence: number;
    videoFeatures: Record<string, unknown>;
  }> {
    return {
      confidence: input.description ? 0.7 : 0.4,
      videoFeatures: {
        hasDescription: !!input.description,
        duration: input.duration,
        frameCount: input.frames?.length || 0,
        hasKeyframes: !!input.frames
      }
    };
  }

  /**
   * Extract features from all processed inputs
   */
  private extractFeatures(processedInputs: ProcessedInput[]): Record<string, unknown> {
    const features: Record<string, unknown> = {
      inputTypes: processedInputs.map(pi => pi.type),
      totalConfidence: processedInputs.reduce((sum, pi) => sum + pi.confidence, 0) / processedInputs.length
    };

    // Add modality-specific features
    for (const input of processedInputs) {
      switch (input.type) {
        case 'text':
          features.textFeatures = input.features;
          break;
        case 'image':
          features.imageFeatures = input.features;
          break;
        case 'audio':
          features.audioFeatures = input.features;
          break;
        case 'video':
          features.videoFeatures = input.features;
          break;
      }
    }

    return features;
  }

  /**
   * Calculate total input size
   */
  private calculateInputSize(inputs: MultiModalInput[]): number {
    let totalSize = 0;

    for (const input of inputs) {
      switch (input.type) {
        case 'text':
          totalSize += input.content.length * 2; // UTF-16 encoding
          break;
        case 'image':
          if (input.base64) {
            totalSize += Buffer.byteLength(input.base64, 'base64');
          }
          break;
        case 'audio':
        case 'video':
          if (input.base64) {
            totalSize += Buffer.byteLength(input.base64, 'base64');
          }
          break;
      }
    }

    return totalSize;
  }

  // ===== Helper Methods =====

  private getImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || 'unknown';
    return extension;
  }

  private detectLanguage(text: string): string {
    // Simple language detection (would use proper library in production)
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
    const hasKorean = /[\uac00-\ud7af]/.test(text);

    if (hasChinese) return 'zh';
    if (hasJapanese) return 'ja';
    if (hasKorean) return 'ko';
    return 'en';
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate'];

    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    return sentences > 0 ? words / sentences : 0;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private generateId(): string {
    return `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}