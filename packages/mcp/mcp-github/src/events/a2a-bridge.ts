import {
  type A2AEventEnvelope,
  createA2AEventEnvelope,
  DEFAULT_GITHUB_ROUTING_CONFIG,
  type GitHubEvent,
  GitHubEventRouter,
  type RouteMatch,
  type RoutingConfiguration,
} from '@cortex-os/a2a-events';
import { EventEmitter } from 'events';
import type { A2AConfig } from '../config/schema.js';
import { CorrelationManager, createStructuredLogger } from '../utils/logger.js';

const logger = createStructuredLogger('a2a-bridge');

// A2A Event Bridge errors
export class A2AEventBridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'A2AEventBridgeError';
  }
}

// Event publishing statistics
interface PublishingStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  retriedEvents: number;
  eventsByType: Record<string, number>;
  averageProcessingTime: number;
  lastEventTime: Date | null;
}

// Event processing result
interface EventProcessingResult {
  success: boolean;
  eventId: string;
  routes: RouteMatch[];
  processingTime: number;
  error?: Error;
}

// A2A Event Bridge - Connects GitHub MCP server to A2A event system
export class A2AEventBridge extends EventEmitter {
  private config: A2AConfig;
  private router: GitHubEventRouter;
  private isConnected = false;
  private stats: PublishingStats;
  private eventQueue: Array<{ envelope: A2AEventEnvelope; resolve: Function; reject: Function }> =
    [];
  private processingQueue = false;
  private connectionRetries = 0;
  private maxRetries = 5;
  private retryDelay = 1000; // Start with 1 second

  constructor(config: A2AConfig, routingConfig?: RoutingConfiguration) {
    super();
    this.config = config;
    this.router = new GitHubEventRouter(routingConfig || DEFAULT_GITHUB_ROUTING_CONFIG);
    this.stats = this.initializeStats();

    this.setupEventListeners();
  }

  private initializeStats(): PublishingStats {
    return {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      retriedEvents: 0,
      eventsByType: {},
      averageProcessingTime: 0,
      lastEventTime: null,
    };
  }

  private setupEventListeners(): void {
    // Handle process termination
    process.on('SIGINT', () => this.disconnect());
    process.on('SIGTERM', () => this.disconnect());

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection in A2A bridge', reason as Error, {
        promise: promise.toString(),
      });
    });
  }

  // Connect to A2A event bus
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('A2A Event Bridge already connected');
      return;
    }

    if (!this.config.enabled) {
      logger.info('A2A events are disabled, skipping connection');
      return;
    }

    logger.info('Connecting to A2A event bus', {
      eventBusUrl: this.config.eventBusUrl,
      publisherId: this.config.publisherId,
    });

    try {
      // In a real implementation, this would establish connection to the event bus
      // For now, we'll simulate the connection
      await this.establishConnection();

      this.isConnected = true;
      this.connectionRetries = 0;

      logger.info('Successfully connected to A2A event bus');
      this.emit('connected');

      // Start processing queued events
      this.processEventQueue();
    } catch (error) {
      this.connectionRetries++;
      logger.error('Failed to connect to A2A event bus', error as Error, {
        attempt: this.connectionRetries,
        maxRetries: this.maxRetries,
      });

      if (this.connectionRetries < this.maxRetries) {
        const delay = this.retryDelay * 2 ** (this.connectionRetries - 1);
        logger.info(`Retrying connection in ${delay}ms`);

        setTimeout(() => {
          this.connect().catch((retryError) => {
            logger.error('Connection retry failed', retryError as Error);
          });
        }, delay);
      } else {
        throw new A2AEventBridgeError(
          'Failed to connect to A2A event bus after maximum retries',
          'CONNECTION_FAILED',
          error as Error,
        );
      }
    }
  }

  private async establishConnection(): Promise<void> {
    // Simulate connection establishment
    // In a real implementation, this would:
    // 1. Connect to the event bus (Redis, RabbitMQ, etc.)
    // 2. Authenticate with the event bus
    // 3. Set up subscriptions if needed
    // 4. Verify the connection is working

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.config.eventBusUrl) {
          resolve();
        } else {
          reject(new Error('Event bus URL is required'));
        }
      }, 100);
    });
  }

  // Disconnect from A2A event bus
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    logger.info('Disconnecting from A2A event bus');

    try {
      // Process remaining events in queue
      if (this.eventQueue.length > 0) {
        logger.info(`Processing ${this.eventQueue.length} remaining events before disconnect`);
        await this.processEventQueue();
      }

      // Close connection
      await this.closeConnection();

      this.isConnected = false;
      logger.info('Disconnected from A2A event bus');
      this.emit('disconnected');
    } catch (error) {
      logger.error('Error during A2A event bus disconnect', error as Error);
      throw error;
    }
  }

  private async closeConnection(): Promise<void> {
    // Simulate connection cleanup
    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Publish a GitHub event to the A2A event bus
  async publishEvent(
    event: GitHubEvent,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      correlationId?: string;
      metadata?: Record<string, string>;
    },
  ): Promise<EventProcessingResult> {
    const startTime = Date.now();
    const correlationId = options?.correlationId || CorrelationManager.generateCorrelationId();

    logger.debug('Publishing GitHub event', {
      eventType: event.event_type,
      correlationId,
      priority: options?.priority || 'normal',
    });

    try {
      // Create A2A envelope
      const envelope = createA2AEventEnvelope(event as any, {
        priority: options?.priority || 'normal',
        correlation: {
          correlation_id: correlationId,
        },
        metadata: {
          labels: {
            source: 'github-mcp-server',
            publisher: this.config.publisherId,
            ...options?.metadata,
          },
        },
      });

      // Find matching routes
      const routes = this.router.findRoutes(envelope);

      if (routes.length === 0) {
        logger.warn('No routes found for GitHub event', {
          eventType: event.event_type,
          correlationId,
        });
      }

      // Publish the event
      const result = await this.publishEnvelope(envelope, routes);

      // Update statistics
      this.updateStats(event, startTime, true);

      logger.info('Successfully published GitHub event', {
        eventId: envelope.envelope_id,
        eventType: event.event_type,
        routes: routes.length,
        processingTime: Date.now() - startTime,
        correlationId,
      });

      return {
        success: true,
        eventId: envelope.envelope_id,
        routes,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.updateStats(event, startTime, false);

      logger.error('Failed to publish GitHub event', error as Error, {
        eventType: event.event_type,
        correlationId,
        processingTime: Date.now() - startTime,
      });

      return {
        success: false,
        eventId: correlationId,
        routes: [],
        processingTime: Date.now() - startTime,
        error: error as Error,
      };
    }
  }

  private async publishEnvelope(envelope: A2AEventEnvelope, routes: RouteMatch[]): Promise<void> {
    if (!this.isConnected) {
      // Queue the event for later processing
      return new Promise((resolve, reject) => {
        this.eventQueue.push({ envelope, resolve, reject });
        logger.debug('Queued event for later processing', {
          eventId: envelope.envelope_id,
          queueSize: this.eventQueue.length,
        });
      });
    }

    // In a real implementation, this would:
    // 1. Serialize the envelope
    // 2. Send to each destination based on routes
    // 3. Handle delivery confirmation
    // 4. Manage retries for failed deliveries

    // Simulate event publishing
    await this.simulateEventPublishing(envelope, routes);
  }

  private async simulateEventPublishing(
    envelope: A2AEventEnvelope,
    routes: RouteMatch[],
  ): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new A2AEventBridgeError('Simulated event publishing failure', 'PUBLISH_FAILED');
    }

    logger.debug('Event published successfully', {
      eventId: envelope.envelope_id,
      routes: routes.length,
      destinations: routes.flatMap((r) => r.destinations.map((d) => d.service)),
    });
  }

  private async processEventQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    logger.info(`Processing ${this.eventQueue.length} queued events`);

    try {
      while (this.eventQueue.length > 0) {
        const queueItem = this.eventQueue.shift();
        if (!queueItem) break;

        const { envelope, resolve, reject } = queueItem;

        try {
          const routes = this.router.findRoutes(envelope);
          await this.publishEnvelope(envelope, routes);
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  private updateStats(event: GitHubEvent, startTime: number, success: boolean): void {
    const processingTime = Date.now() - startTime;

    this.stats.totalEvents++;
    this.stats.lastEventTime = new Date();

    if (success) {
      this.stats.successfulEvents++;
    } else {
      this.stats.failedEvents++;
    }

    // Update event type stats
    const eventType = event.event_type;
    this.stats.eventsByType[eventType] = (this.stats.eventsByType[eventType] || 0) + 1;

    // Update average processing time
    this.stats.averageProcessingTime =
      (this.stats.averageProcessingTime * (this.stats.totalEvents - 1) + processingTime) /
      this.stats.totalEvents;
  }

  // Batch publish multiple events
  async publishEvents(
    events: GitHubEvent[],
    options?: {
      batchSize?: number;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      metadata?: Record<string, string>;
    },
  ): Promise<EventProcessingResult[]> {
    const batchSize = options?.batchSize || this.config.batchSize;
    const results: EventProcessingResult[] = [];

    logger.info(`Publishing ${events.length} events in batches of ${batchSize}`);

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((event) => this.publishEvent(event, options)),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            eventId: 'unknown',
            routes: [],
            processingTime: 0,
            error: result.reason,
          });
        }
      }

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < events.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // Update routing configuration
  updateRouting(config: RoutingConfiguration): void {
    this.router.updateConfiguration(config);
    logger.info('Updated A2A event routing configuration', {
      rules: config.rules.length,
      services: Object.keys(config.service_registry).length,
    });
  }

  // Get publishing statistics
  getStats(): PublishingStats {
    return { ...this.stats };
  }

  // Reset statistics
  resetStats(): void {
    this.stats = this.initializeStats();
    logger.info('Reset A2A event bridge statistics');
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      queueSize: number;
      stats: PublishingStats;
      lastEventAge?: number;
    };
  }> {
    const lastEventAge = this.stats.lastEventTime
      ? Date.now() - this.stats.lastEventTime.getTime()
      : undefined;

    const isHealthy = this.isConnected && this.eventQueue.length < 1000;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        connected: this.isConnected,
        queueSize: this.eventQueue.length,
        stats: this.getStats(),
        lastEventAge,
      },
    };
  }

  // Test connectivity
  async testConnection(): Promise<boolean> {
    try {
      // Create a test event
      const testEvent = {
        event_id: CorrelationManager.generateCorrelationId(),
        event_type: 'github.test' as const,
        source: 'github-client' as const,
        timestamp: new Date().toISOString(),
      };

      const envelope = createA2AEventEnvelope(testEvent as any, {
        priority: 'low',
        metadata: {
          labels: {
            test: 'true',
          },
        },
      });

      await this.publishEnvelope(envelope, []);
      return true;
    } catch (error) {
      logger.error('A2A connection test failed', error as Error);
      return false;
    }
  }

  // Configuration getters
  getConfig(): A2AConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isReady(): boolean {
    return this.isConnected && !this.processingQueue;
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }
}
