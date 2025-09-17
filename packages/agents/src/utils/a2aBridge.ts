import { createLogger } from '@voltagent/logger';
import { z } from 'zod';

const logger = createLogger('A2ABridge');

// CloudEvent schema
const CloudEventSchema = z.object({
  specversion: z.string().default('1.0'),
  id: z.string(),
  source: z.string().url(),
  type: z.string(),
  time: z.string().datetime(),
  datacontenttype: z.string().optional(),
  dataschema: z.string().url().optional(),
  subject: z.string().optional(),
  data: z.any().optional(),
});

export type CloudEvent = z.infer<typeof CloudEventSchema>;

export interface A2ABridgeConfig {
  /**
   * Event bus configuration
   */
  eventBus?: {
    type: 'memory' | 'redis' | 'kafka';
    config?: Record<string, any>;
  };
  /**
   * Agent registry
   */
  registry?: {
    type: 'memory' | 'discovery';
    config?: Record<string, any>;
  };
}

export function createA2ABridge(config?: A2ABridgeConfig) {
  // Simple in-memory event bus for now
  const eventBus: Map<string, CloudEvent[]> = new Map();
  const subscriptions: Map<string, ((event: CloudEvent) => void)[]> = new Map();

  // Agent registry
  const agentRegistry = new Map<string, {
    id: string;
    name: string;
    capabilities: string[];
    endpoint?: string;
  }>();

  return {
    /**
     * Send a CloudEvent to the event bus
     */
    async sendEvent(event: Omit<CloudEvent, 'id' | 'time'> & {
      id?: string;
      time?: string;
    }): Promise<string> {
      const cloudEvent: CloudEvent = {
        specversion: '1.0',
        id: event.id || generateEventId(),
        time: event.time || new Date().toISOString(),
        ...event,
      };

      // Validate event
      const validated = CloudEventSchema.parse(cloudEvent);

      // Store in event bus
      if (!eventBus.has(validated.type)) {
        eventBus.set(validated.type, []);
      }
      eventBus.get(validated.type)!.push(validated);

      // Notify subscribers
      const subs = subscriptions.get(validated.type) || [];
      subs.forEach(callback => {
        try {
          callback(validated);
        } catch (error) {
          logger.error('Error in event subscription:', error);
        }
      });

      logger.info(`Event sent: ${validated.type} (${validated.id})`);
      return validated.id;
    },

    /**
     * Receive events from the event bus
     */
    async receiveEvent(
      eventType: string,
      options?: {
        limit?: number;
        since?: string;
        filter?: (event: CloudEvent) => boolean;
      }
    ): Promise<CloudEvent[]> {
      const events = eventBus.get(eventType) || [];

      let filtered = events;

      // Filter by time
      if (options?.since) {
        const sinceTime = new Date(options.since);
        filtered = filtered.filter(e => new Date(e.time) >= sinceTime);
      }

      // Apply custom filter
      if (options?.filter) {
        filtered = filtered.filter(options.filter);
      }

      // Limit results
      if (options?.limit) {
        filtered = filtered.slice(-options.limit);
      }

      return filtered;
    },

    /**
     * Subscribe to events
     */
    async subscribe(
      eventType: string,
      callback: (event: CloudEvent) => void
    ): Promise<string> {
      if (!subscriptions.has(eventType)) {
        subscriptions.set(eventType, []);
      }

      const subs = subscriptions.get(eventType)!;
      subs.push(callback);

      const subscriptionId = generateEventId();
      logger.info(`Subscribed to ${eventType} (${subscriptionId})`);
      return subscriptionId;
    },

    /**
     * Unsubscribe from events
     */
    async unsubscribe(
      eventType: string,
      subscriptionId: string
    ): Promise<boolean> {
      const subs = subscriptions.get(eventType);
      if (!subs) return false;

      // Remove the subscription
      const index = subs.findIndex((_, i) =>
        generateEventId(`${eventType}-${i}`) === subscriptionId
      );
      if (index === -1) return false;

      subs.splice(index, 1);
      if (subs.length === 0) {
        subscriptions.delete(eventType);
      }

      logger.info(`Unsubscribed from ${eventType} (${subscriptionId})`);
      return true;
    },

    /**
     * Register an agent
     */
    async registerAgent(agent: {
      id: string;
      name: string;
      capabilities: string[];
      endpoint?: string;
    }): Promise<void> {
      agentRegistry.set(agent.id, agent);
      logger.info(`Agent registered: ${agent.name} (${agent.id})`);

      // Emit registration event
      await this.sendEvent({
        source: 'urn:cortex:agents:registry',
        type: 'cortex.agent.registered',
        data: agent,
      });
    },

    /**
     * Discover agents
     */
    async discoverAgents(
      filter?: {
        capability?: string;
        type?: string;
      }
    ): Promise<Array<{
      id: string;
      name: string;
      capabilities: string[];
      endpoint?: string;
    }>> {
      let agents = Array.from(agentRegistry.values());

      if (filter?.capability) {
        agents = agents.filter(a => a.capabilities.includes(filter.capability));
      }

      return agents;
    },

    /**
     * Send message to specific agent
     */
    async sendToAgent(
      agentId: string,
      message: {
        type: string;
        data: any;
        correlationId?: string;
      }
    ): Promise<string> {
      const agent = agentRegistry.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      // Send via event bus
      return this.sendEvent({
        source: 'urn:cortex:agents:bridge',
        type: message.type,
        data: {
          ...message.data,
          to: agentId,
          correlationId: message.correlationId,
        },
      });
    },

    /**
     * Get event statistics
     */
    getStats() {
      return {
        totalEvents: Array.from(eventBus.values()).reduce((sum, events) => sum + events.length, 0),
        eventTypes: eventBus.size,
        subscriptions: subscriptions.size,
        registeredAgents: agentRegistry.size,
      };
    },
  };
}

function generateEventId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}