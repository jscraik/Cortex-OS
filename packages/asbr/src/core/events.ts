/**
 * ASBR Event System
 * Implements SSE and WebSocket transport with heartbeat as per blueprint
 */

import { EventEmitter } from 'events';
import { appendFile } from 'fs/promises';
import type { Response } from 'express';
import type { Server as IOServer, Socket, DefaultEventsMap } from 'socket.io';
import type { Config, Event, EventType } from '../types/index.js';
import { getStatePath } from '../xdg/index.js';
import { loadConfig } from './config.js';

interface SocketData {
  subscriptionId?: string;
}

export interface EventSubscription {
  id: string;
  taskId?: string;
  eventTypes: EventType[];
  callback: (event: Event) => void;
  transport: 'socket' | 'sse';
  lastEventId?: string;
  createdAt: number;
}

export interface EventStreamOptions {
  taskId?: string;
  eventTypes?: EventType[];
  transport?: 'socket' | 'sse';
  lastEventId?: string;
}

export interface EventManager extends EventEmitter {
  attachIO(io: IOServer): void;
  emitEvent(event: Event): Promise<void>;
  subscribe(options: EventStreamOptions, callback: (event: Event) => void): string;
  unsubscribe(subscriptionId: string): void;
  getEvents(options: EventStreamOptions): Event[];
  createSSEStream(res: any, options: EventStreamOptions): string;
  pollEvents(
    options: EventStreamOptions,
    attempt?: number,
  ): Promise<{ events: Event[]; backoffMs?: number }>;
  getStats(): {
    totalEvents: number;
    activeSubscriptions: number;
    bufferSizes: Record<string, number>;
  };
}

/**
 * Event Manager with SSE and WebSocket support
 */
/** @deprecated Use createEventManager instead */
export class EventManagerClass extends EventEmitter {
  private config: Config;
  private subscriptions = new Map<string, EventSubscription>();
  private eventBuffer = new Map<string, Event[]>(); // taskId -> events
  private globalEvents: Event[] = [];
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private cleanupInterval?: NodeJS.Timeout;
  private eventCounter = 0;
  private io?: IOServer;

  constructor(config: Config) {
    super();
    this.config = config;
    this.setupCleanupInterval();
  }

  attachIO(io: IOServer): void {
    this.io = io;
    io.on(
      'connection',
      (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>) => {
        socket.on(
          'subscribe',
          (
            { taskId, eventTypes }: { taskId?: string; eventTypes?: EventType[] },
            ack?: (res: unknown) => void,
          ) => {
            const subId = this.subscribe({ taskId, eventTypes }, (event) => {
              socket.emit(event.type, event);
            });
            socket.data.subscriptionId = subId;
            if (taskId) socket.join(taskId);
            ack?.({ ok: true });
          },
        );

        socket.on(
          'unsubscribe',
          ({ taskId }: { taskId?: string } = {}, ack?: (res: unknown) => void) => {
            const subId = socket.data.subscriptionId;
            if (subId) {
              this.unsubscribe(subId);
              socket.data.subscriptionId = undefined;
            }
            if (taskId) socket.leave(taskId);
            ack?.({ ok: true });
          },
        );

        socket.on('disconnect', () => {
          const subId = socket.data.subscriptionId;
          if (subId) {
            this.unsubscribe(subId);
          }
        });
      },
    );
  }

  /**
   * Emit an event to all subscribers
   */
  async emitEvent(event: Event): Promise<void> {
    // Store event in buffer
    if (!this.eventBuffer.has(event.taskId)) {
      this.eventBuffer.set(event.taskId, []);
    }

    const taskEvents = this.eventBuffer.get(event.taskId)!;
    taskEvents.push(event);

    // Also store in global events
    this.globalEvents.push(event);

    // Keep buffer size manageable
    this.maintainBufferSize(event.taskId);

    // Persist to NDJSON ledger
    await this.persistEvent(event);

    // Notify subscribers
    this.notifySubscribers(event);

    // Emit to EventEmitter for internal use
    this.emit('event', event);
    this.emit(`event:${event.type}`, event);
    this.emit(`task:${event.taskId}`, event);
    if (this.io) {
      this.io.to(event.taskId).emit(event.type, event);
    }
  }

  /**
   * Subscribe to events with SSE or poll transport
   */
  subscribe(options: EventStreamOptions, callback: (event: Event) => void): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const subscription: EventSubscription = {
      id: subscriptionId,
      taskId: options.taskId,
      eventTypes: options.eventTypes || [
        'PlanStarted',
        'StepCompleted',
        'AwaitingApproval',
        'Canceled',
        'Resumed',
        'DeliverableReady',
        'Failed',
      ],
      callback,
      transport: options.transport || this.config.events.transport,
      lastEventId: options.lastEventId,
      createdAt: Date.now(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send existing events if requested
    if (subscription.lastEventId) {
      this.sendMissedEvents(subscription);
    }

    // Set up heartbeat for SSE
    if (subscription.transport === 'sse') {
      this.setupHeartbeat(subscriptionId);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);

    // Clear heartbeat if exists
    const heartbeat = this.heartbeatIntervals.get(subscriptionId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeatIntervals.delete(subscriptionId);
    }
  }

  /**
   * Create SSE stream for Express response
   */
  createSSEStream(res: Response, options: EventStreamOptions): string {
    const subscriptionId = this.subscribe(options, (event) => {
      this.writeSSEEvent(res, event);
    });

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial heartbeat
    this.writeSSEHeartbeat(res);

    // Handle client disconnect
    const cleanup = () => {
      this.unsubscribe(subscriptionId);
    };

    res.on('close', cleanup);
    res.on('error', cleanup);

    return subscriptionId;
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number;
    activeSubscriptions: number;
    bufferSizes: Record<string, number>;
  } {
    const bufferSizes: Record<string, number> = {};
    for (const [taskId, events] of this.eventBuffer) {
      bufferSizes[taskId] = events.length;
    }

    return {
      totalEvents: this.globalEvents.length,
      activeSubscriptions: this.subscriptions.size,
      bufferSizes,
    };
  }

  private notifySubscribers(event: Event): void {
    for (const subscription of this.subscriptions.values()) {
      // Check if subscription matches this event
      if (this.shouldNotifySubscription(subscription, event)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      }
    }
  }

  private shouldNotifySubscription(subscription: EventSubscription, event: Event): boolean {
    // Check task filter
    if (subscription.taskId && subscription.taskId !== event.taskId) {
      return false;
    }

    // Check event type filter
    if (!subscription.eventTypes.includes(event.type)) {
      return false;
    }

    return true;
  }

  private setupHeartbeat(subscriptionId: string): void {
    const interval = setInterval(() => {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        clearInterval(interval);
        this.heartbeatIntervals.delete(subscriptionId);
        return;
      }

      // Heartbeat is handled in SSE stream creation
    }, this.config.events.heartbeat_ms);

    this.heartbeatIntervals.set(subscriptionId, interval);
  }

  private writeSSEEvent(res: Response, event: Event): void {
    const eventId = this.eventCounter++;
    const data = JSON.stringify(event);

    res.write(`id: ${eventId}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${data}\n\n`);
  }

  private writeSSEHeartbeat(res: Response): void {
    res.write('event: heartbeat\n');
    res.write('data: {}\n\n');
  }

  private sendMissedEvents(subscription: EventSubscription): void {
    let events = subscription.taskId
      ? this.eventBuffer.get(subscription.taskId) || []
      : this.globalEvents;

    events = events.filter((e) => subscription.eventTypes.includes(e.type));

    if (subscription.lastEventId) {
      const lastIndex = events.findIndex((e) => e.id === subscription.lastEventId);
      if (lastIndex >= 0) {
        events = events.slice(lastIndex + 1);
      }
    }

    for (const event of events) {
      subscription.callback(event);
    }
  }

  private maintainBufferSize(taskId: string): void {
    const events = this.eventBuffer.get(taskId);
    if (events && events.length > 1000) {
      // Keep only the last 1000 events per task
      events.splice(0, events.length - 1000);
    }

    // Also maintain global events buffer
    if (this.globalEvents.length > 5000) {
      this.globalEvents.splice(0, this.globalEvents.length - 5000);
    }
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();
  }

  private async persistEvent(event: Event): Promise<void> {
    try {
      const ledgerPath = getStatePath('ledger.ndjson');
      const eventLine = JSON.stringify(event) + '\n';
      await appendFile(ledgerPath, eventLine, 'utf-8');
    } catch (error) {
      console.error('Failed to persist event:', error);
    }
  }

  private setupCleanupInterval(): void {
    // Clean up expired subscriptions every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const idleTimeout = this.config.events.idle_timeout_ms;

      for (const [id, subscription] of this.subscriptions) {
        if (now - subscription.createdAt > idleTimeout) {
          this.unsubscribe(id);
        }
      }
    }, 60000);
  }
}

/**
 * Create event manager singleton
 */
export function createEventManager(config: Config): EventManager {
  return new EventManagerClass(config) as EventManager;
}

let eventManagerInstance: EventManager | null = null;

export async function getEventManager(): Promise<EventManager> {
  if (!eventManagerInstance) {
    const config = await loadConfig();
    eventManagerInstance = createEventManager(config);
  }
  return eventManagerInstance;
}

export function stopEventManager(): void {
  if (eventManagerInstance) {
    eventManagerInstance.stop();
    eventManagerInstance = null;
  }
}

/**
 * Utility function to create accessibility-aware events
 */
export function createA11yEvent(
  type: EventType,
  taskId: string,
  data: Partial<Event> = {},
): Omit<Event, 'id' | 'timestamp'> {
  const ariaLiveHints: Record<EventType, string> = {
    PlanStarted: 'Planning has started',
    StepCompleted: 'Step completed successfully',
    AwaitingApproval: 'Waiting for approval',
    Canceled: 'Task has been canceled',
    Resumed: 'Task has been resumed',
    DeliverableReady: 'Deliverable is ready',
    Failed: 'Task has failed',
  };

  return {
    type,
    taskId,
    ariaLiveHint: ariaLiveHints[type],
    ...data,
  };
}
