/**
 * @file_path tests/phase2/unit/a2a-message-bus.test.ts
 * @description RED PHASE: Enhanced A2A Message Bus TDD Tests
 * @requirement P2-REQ-004 - Enhanced A2A Message Bus
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @tdd_phase RED - These tests WILL FAIL until implementation is created
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  EnhancedA2AMessageBus,
  A2AMessage,
  MessageDeliveryGuarantee,
  ConversationThread,
  MessageBusError,
  NetworkPartitionError,
  MessageOrderingError,
  DeliveryConfirmation,
  MessagePersistence,
  ReplayManager,
  MessageRouting,
  PriorityQueue,
  BackpressureManager,
} from '../../../apps/cortex-os/packages/orchestration/src/messaging/enhanced-a2a-message-bus';
import { NeuronContext, NeuronEvent } from '@cortex-os/agents';

// Extend jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data factories
const createMockA2AMessage = (overrides: Partial<A2AMessage> = {}): A2AMessage => ({
  messageId: 'msg-001',
  conversationId: 'conv-123',
  threadId: 'thread-456',
  fromNeuronId: 'neuron-sender-001',
  toNeuronId: 'neuron-receiver-001',
  messageType: 'task_request',
  priority: 'normal',
  payload: {
    type: 'code_generation_request',
    data: {
      prompt: 'Generate TypeScript interface for user profile',
      context: { language: 'typescript', domain: 'user-management' },
      requirements: ['type-safety', 'documentation'],
    },
    metadata: {
      requestId: 'req-123',
      expectedResponseType: 'code_artifact',
    },
  },
  deliveryGuarantee: 'exactly_once',
  orderingRequirement: 'conversation_order',
  timestamp: new Date(),
  ttl: 300000, // 5 minutes
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 1000,
    exponential: true,
  },
  routing: {
    strategy: 'direct',
    fallbackNeurons: ['neuron-fallback-001'],
    routingHints: { capability: 'code', priority: 'high' },
  },
  tracing: {
    traceId: 'trace-123',
    spanId: 'span-456',
    parentSpanId: 'span-parent-789',
  },
  persistence: {
    enabled: true,
    durability: 'session',
    replayable: true,
  },
  ...overrides,
});

const createMockConversationThread = (
  overrides: Partial<ConversationThread> = {},
): ConversationThread => ({
  threadId: 'thread-123',
  conversationId: 'conv-456',
  participants: ['neuron-001', 'neuron-002', 'neuron-003'],
  initiator: 'neuron-001',
  threadType: 'multi_neuron_collaboration',
  createdAt: new Date(),
  lastActivity: new Date(),
  status: 'active',
  messageCount: 5,
  ordering: {
    strategy: 'causal_ordering',
    vectorClock: new Map([
      ['neuron-001', 3],
      ['neuron-002', 2],
      ['neuron-003', 1],
    ]),
    lamportClock: 6,
  },
  metadata: {
    topic: 'collaborative_code_generation',
    priority: 'high',
    tags: ['development', 'typescript'],
    context: {
      projectId: 'project-123',
      taskId: 'task-456',
    },
  },
  persistence: {
    enabled: true,
    archivalPolicy: 'retain_30_days',
    compressionEnabled: false,
  },
  ...overrides,
});

const createMockNeuronContext = (overrides: Partial<NeuronContext> = {}): NeuronContext => ({
  runId: 'a2a-run-123',
  tenantId: 'tenant-test',
  seed: 'a2a-seed',
  abortSignal: new AbortController().signal,
  deadlineMs: Date.now() + 300000,
  budgets: {
    tokens: 15000,
    usd: 3.0,
    timeMs: 60000,
    steps: 15,
    toolCalls: 8,
  },
  spent: {
    tokens: 0,
    usd: 0,
    timeMs: 0,
    steps: 0,
    toolCalls: 0,
  },
  security: {
    capability: 'messaging',
    riskScore: 0.1,
    reviewRequired: false,
    allowedTools: ['message', 'subscribe', 'publish'],
    allowedDomains: ['localhost', 'internal'],
  },
  tracing: {
    spanId: 'a2a-span-123',
    traceId: 'a2a-trace-123',
  },
  ...overrides,
});

describe('Enhanced A2A Message Bus - RED Phase', () => {
  let messageBus: EnhancedA2AMessageBus;
  let mockContext: NeuronContext;
  let mockMessage: A2AMessage;
  let mockThread: ConversationThread;

  beforeEach(() => {
    // RED PHASE: These will fail until implementation exists
    messageBus = new EnhancedA2AMessageBus();
    mockContext = createMockNeuronContext();
    mockMessage = createMockA2AMessage();
    mockThread = createMockConversationThread();
  });

  afterEach(async () => {
    await messageBus?.shutdown();
  });

  describe('Message Delivery Guarantees', () => {
    it('should deliver messages with exactly-once semantics', async () => {
      // RED PHASE: Will fail - sendMessage method doesn't exist
      const exactlyOnceMessage = createMockA2AMessage({
        messageId: 'exactly-once-001',
        deliveryGuarantee: 'exactly_once',
      });

      const deliveryConfirmation = await messageBus.sendMessage(exactlyOnceMessage, mockContext);

      expect(deliveryConfirmation).toMatchObject({
        messageId: 'exactly-once-001',
        deliveryGuarantee: 'exactly_once',
        status: 'delivered',
        deliveredAt: expect.any(Date),
        deliveryAttempts: 1,
        deduplicationKey: expect.any(String),
        acknowledgment: expect.objectContaining({
          fromNeuronId: 'neuron-receiver-001',
          acknowledgedAt: expect.any(Date),
          processingStatus: 'received',
        }),
      });

      // Verify exactly-once: sending the same message again should be deduplicated
      const duplicateDelivery = await messageBus.sendMessage(exactlyOnceMessage, mockContext);

      expect(duplicateDelivery.status).toBe('deduplicated');
      expect(duplicateDelivery.originalDeliveryId).toBe(deliveryConfirmation.deliveryId);
    });

    it('should handle at-least-once delivery with idempotency', async () => {
      const atLeastOnceMessage = createMockA2AMessage({
        messageId: 'at-least-once-001',
        deliveryGuarantee: 'at_least_once',
        retryPolicy: {
          maxAttempts: 5,
          backoffMs: 500,
          exponential: true,
        },
      });

      // Mock intermittent delivery failures
      let attemptCount = 0;
      const originalSend = messageBus.sendMessage.bind(messageBus);
      vi.spyOn(messageBus, 'sendMessage').mockImplementation(async (message, context) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary delivery failure');
        }
        return originalSend(message, context);
      });

      const deliveryConfirmation = await messageBus.sendMessage(atLeastOnceMessage, mockContext);

      expect(deliveryConfirmation.status).toBe('delivered');
      expect(deliveryConfirmation.deliveryAttempts).toBe(3);
      expect(deliveryConfirmation.retryHistory).toHaveLength(2); // 2 failed attempts before success
    });

    it('should support best-effort delivery for low-priority messages', async () => {
      const bestEffortMessage = createMockA2AMessage({
        messageId: 'best-effort-001',
        deliveryGuarantee: 'best_effort',
        priority: 'low',
        ttl: 5000, // Short TTL for best-effort
      });

      const deliveryConfirmation = await messageBus.sendMessage(bestEffortMessage, mockContext);

      expect(deliveryConfirmation.deliveryGuarantee).toBe('best_effort');

      // Best-effort may not guarantee acknowledgment
      if (deliveryConfirmation.status === 'delivered') {
        expect(deliveryConfirmation.deliveredAt).toBeInstanceOf(Date);
      } else {
        expect(deliveryConfirmation.status).toMatch(/expired|unreachable/);
      }
    });

    it('should implement message deduplication across restarts', async () => {
      const persistentMessage = createMockA2AMessage({
        messageId: 'persistent-001',
        deliveryGuarantee: 'exactly_once',
        persistence: {
          enabled: true,
          durability: 'persistent',
          replayable: true,
        },
      });

      // Send message and get confirmation
      const firstDelivery = await messageBus.sendMessage(persistentMessage, mockContext);
      expect(firstDelivery.status).toBe('delivered');

      // Simulate message bus restart
      await messageBus.shutdown();
      messageBus = new EnhancedA2AMessageBus();

      // Try to send the same message after restart
      const duplicateAfterRestart = await messageBus.sendMessage(persistentMessage, mockContext);

      expect(duplicateAfterRestart.status).toBe('deduplicated');
      expect(duplicateAfterRestart.originalDeliveryId).toBe(firstDelivery.deliveryId);
    });

    it('should handle delivery failures with appropriate error handling', async () => {
      const failingMessage = createMockA2AMessage({
        messageId: 'failing-001',
        toNeuronId: 'non-existent-neuron',
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 100,
          exponential: false,
        },
      });

      await expect(messageBus.sendMessage(failingMessage, mockContext)).rejects.toThrow(
        MessageBusError,
      );

      // Should track failed delivery attempts
      const deliveryHistory = await messageBus.getDeliveryHistory(failingMessage.messageId);
      expect(deliveryHistory.attempts).toHaveLength(2);
      expect(deliveryHistory.finalStatus).toBe('failed');
      expect(deliveryHistory.failureReason).toMatch(/neuron not found|unreachable/);
    });
  });

  describe('Message Ordering and Conversation Threads', () => {
    beforeEach(async () => {
      // Initialize conversation thread for ordering tests
      await messageBus.createConversationThread(mockThread);
    });

    it('should maintain message ordering within conversation threads', async () => {
      const orderedMessages = [
        createMockA2AMessage({
          messageId: 'msg-seq-1',
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'conversation_order',
          payload: { sequenceNumber: 1, data: 'First message' },
        }),
        createMockA2AMessage({
          messageId: 'msg-seq-2',
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'conversation_order',
          payload: { sequenceNumber: 2, data: 'Second message' },
        }),
        createMockA2AMessage({
          messageId: 'msg-seq-3',
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'conversation_order',
          payload: { sequenceNumber: 3, data: 'Third message' },
        }),
      ];

      // Send messages in random order to test ordering enforcement
      const shuffledOrder = [2, 0, 1]; // Send second, first, third
      const deliveryPromises = shuffledOrder.map((index) =>
        messageBus.sendMessage(orderedMessages[index], mockContext),
      );

      await Promise.all(deliveryPromises);

      // Verify messages were delivered in correct order
      const conversationHistory = await messageBus.getConversationHistory(
        mockThread.conversationId,
      );

      expect(conversationHistory.messages).toHaveLength(3);
      expect(conversationHistory.messages[0].payload.sequenceNumber).toBe(1);
      expect(conversationHistory.messages[1].payload.sequenceNumber).toBe(2);
      expect(conversationHistory.messages[2].payload.sequenceNumber).toBe(3);

      // Verify ordering metadata
      expect(conversationHistory.orderingMetadata).toMatchObject({
        strategy: 'conversation_order',
        messagesReordered: true,
        reorderingCount: expect.any(Number),
      });
    });

    it('should implement causal ordering with vector clocks', async () => {
      const causalMessages = [
        createMockA2AMessage({
          messageId: 'causal-1',
          fromNeuronId: 'neuron-001',
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'causal_ordering',
          causality: {
            vectorClock: { 'neuron-001': 1, 'neuron-002': 0, 'neuron-003': 0 },
            happensBefore: [],
          },
        }),
        createMockA2AMessage({
          messageId: 'causal-2',
          fromNeuronId: 'neuron-002',
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'causal_ordering',
          causality: {
            vectorClock: { 'neuron-001': 1, 'neuron-002': 1, 'neuron-003': 0 },
            happensBefore: ['causal-1'],
          },
        }),
        createMockA2AMessage({
          messageId: 'causal-3',
          fromNeuronId: 'neuron-003',
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'causal_ordering',
          causality: {
            vectorClock: { 'neuron-001': 1, 'neuron-002': 1, 'neuron-003': 1 },
            happensBefore: ['causal-1', 'causal-2'],
          },
        }),
      ];

      // Send messages out of causal order
      await messageBus.sendMessage(causalMessages[2], mockContext); // causal-3 first
      await messageBus.sendMessage(causalMessages[0], mockContext); // causal-1 second
      await messageBus.sendMessage(causalMessages[1], mockContext); // causal-2 last

      const history = await messageBus.getConversationHistory(mockThread.conversationId);

      // Should be delivered in causal order despite send order
      expect(history.messages[0].messageId).toBe('causal-1');
      expect(history.messages[1].messageId).toBe('causal-2');
      expect(history.messages[2].messageId).toBe('causal-3');

      // Verify causal relationships were preserved
      expect(history.causalityAnalysis).toMatchObject({
        orderingStrategy: 'causal_ordering',
        causalViolations: 0,
        reorderingRequired: true,
        vectorClockConsistent: true,
      });
    });

    it('should handle concurrent message arrival with proper buffering', async () => {
      const concurrentMessages = Array.from({ length: 10 }, (_, i) =>
        createMockA2AMessage({
          messageId: `concurrent-${i}`,
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'arrival_order',
          timestamp: new Date(Date.now() + i * 100), // Spaced timestamps
        }),
      );

      // Send all messages concurrently
      const concurrentDeliveries = concurrentMessages.map((message) =>
        messageBus.sendMessage(message, mockContext),
      );

      const deliveryResults = await Promise.all(concurrentDeliveries);

      // All should be delivered successfully
      deliveryResults.forEach((result) => {
        expect(result.status).toBe('delivered');
      });

      // Messages should be buffered and ordered correctly
      const history = await messageBus.getConversationHistory(mockThread.conversationId);
      expect(history.messages).toHaveLength(10);

      // Verify arrival order was preserved
      for (let i = 1; i < history.messages.length; i++) {
        expect(history.messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history.messages[i - 1].timestamp.getTime(),
        );
      }
    });

    it('should support message threading and branching conversations', async () => {
      // Create a branched conversation
      const mainThreadMessage = createMockA2AMessage({
        messageId: 'main-thread-1',
        conversationId: mockThread.conversationId,
        threadId: mockThread.threadId,
        messageType: 'discussion_point',
      });

      const branchThreadMessage = createMockA2AMessage({
        messageId: 'branch-thread-1',
        conversationId: mockThread.conversationId,
        threadId: 'branch-thread-789',
        messageType: 'side_discussion',
        threading: {
          parentMessageId: 'main-thread-1',
          branchReason: 'detailed_exploration',
          branchType: 'temporary',
        },
      });

      await messageBus.sendMessage(mainThreadMessage, mockContext);
      await messageBus.sendMessage(branchThreadMessage, mockContext);

      const conversationStructure = await messageBus.getConversationStructure(
        mockThread.conversationId,
      );

      expect(conversationStructure).toMatchObject({
        conversationId: mockThread.conversationId,
        threads: expect.arrayContaining([
          expect.objectContaining({
            threadId: mockThread.threadId,
            threadType: 'main',
            messageCount: 1,
            branches: expect.arrayContaining([
              expect.objectContaining({
                threadId: 'branch-thread-789',
                parentMessage: 'main-thread-1',
                branchType: 'temporary',
                messageCount: 1,
              }),
            ]),
          }),
        ]),
        totalMessages: 2,
        branchingFactor: 1,
      });
    });

    it('should detect and handle message ordering violations', async () => {
      const violatingMessages = [
        createMockA2AMessage({
          messageId: 'ordered-1',
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'strict_sequence',
          sequenceNumber: 1,
        }),
        createMockA2AMessage({
          messageId: 'ordered-3', // Missing sequence 2
          conversationId: mockThread.conversationId,
          threadId: mockThread.threadId,
          orderingRequirement: 'strict_sequence',
          sequenceNumber: 3,
        }),
      ];

      await messageBus.sendMessage(violatingMessages[0], mockContext);

      // Sending message with sequence 3 when 2 is missing should trigger violation handling
      await expect(messageBus.sendMessage(violatingMessages[1], mockContext)).rejects.toThrow(
        MessageOrderingError,
      );

      const orderingDiagnostics = await messageBus.getOrderingDiagnostics(mockThread.threadId);
      expect(orderingDiagnostics.violations).toContainEqual(
        expect.objectContaining({
          type: 'sequence_gap',
          expectedSequence: 2,
          receivedSequence: 3,
          missingMessages: [2],
        }),
      );
    });
  });

  describe('Network Partitions and Recovery', () => {
    it('should handle network partitions gracefully', async () => {
      const partitionMessage = createMockA2AMessage({
        messageId: 'partition-test-001',
        toNeuronId: 'neuron-remote-001',
        deliveryGuarantee: 'exactly_once',
        networkTolerance: {
          partitionDetection: true,
          bufferDuringPartition: true,
          maxBufferSize: 100,
        },
      });

      // Simulate network partition
      await messageBus.simulateNetworkPartition(['neuron-remote-001']);

      // Message should be buffered, not failed
      const deliveryPromise = messageBus.sendMessage(partitionMessage, mockContext);

      // Verify message is in partition buffer
      const partitionStatus = await messageBus.getPartitionStatus();
      expect(partitionStatus.partitionedNeurons).toContain('neuron-remote-001');
      expect(partitionStatus.bufferedMessages).toHaveLength(1);

      // Heal partition
      await messageBus.healNetworkPartition(['neuron-remote-001']);

      // Message should now be delivered
      const deliveryResult = await deliveryPromise;
      expect(deliveryResult.status).toBe('delivered');
      expect(deliveryResult.partitionRecovery).toMatchObject({
        wasPartitioned: true,
        bufferDuration: expect.any(Number),
        deliveredAfterRecovery: true,
      });
    });

    it('should implement split-brain detection and resolution', async () => {
      const splitBrainMessages = [
        createMockA2AMessage({
          messageId: 'split-brain-1',
          conversationId: 'split-conv-001',
          fromNeuronId: 'neuron-partition-a',
          networkPartition: 'partition-a',
        }),
        createMockA2AMessage({
          messageId: 'split-brain-2',
          conversationId: 'split-conv-001',
          fromNeuronId: 'neuron-partition-b',
          networkPartition: 'partition-b',
        }),
      ];

      // Simulate split-brain scenario
      await messageBus.simulateSplitBrain(['partition-a', 'partition-b']);

      const deliveryResults = await Promise.allSettled([
        messageBus.sendMessage(splitBrainMessages[0], mockContext),
        messageBus.sendMessage(splitBrainMessages[1], mockContext),
      ]);

      // Both partitions should detect the split-brain
      const splitBrainStatus = await messageBus.getSplitBrainStatus();
      expect(splitBrainStatus.detected).toBe(true);
      expect(splitBrainStatus.partitions).toHaveLength(2);

      // Heal split-brain with conflict resolution
      const resolutionResult = await messageBus.resolveSplitBrain({
        strategy: 'latest_timestamp',
        authorityPartition: 'partition-a',
      });

      expect(resolutionResult).toMatchObject({
        resolutionStrategy: 'latest_timestamp',
        conflictsResolved: expect.any(Number),
        messagesReconciled: expect.any(Number),
        duplicatesRemoved: expect.any(Number),
      });
    });

    it('should provide automatic retry with exponential backoff during partition recovery', async () => {
      const retryMessage = createMockA2AMessage({
        messageId: 'retry-recovery-001',
        toNeuronId: 'neuron-recovering-001',
        retryPolicy: {
          maxAttempts: 5,
          backoffMs: 100,
          exponential: true,
          partitionAware: true,
        },
      });

      // Simulate intermittent connectivity during recovery
      let recoveryAttempts = 0;
      vi.spyOn(messageBus, 'sendMessage').mockImplementation(async (message, context) => {
        recoveryAttempts++;
        if (recoveryAttempts < 4) {
          throw new NetworkPartitionError('Intermittent connectivity during recovery');
        }
        return {
          messageId: message.messageId,
          status: 'delivered',
          deliveryAttempts: recoveryAttempts,
          recoveryPhase: 'partition_healing',
        } as DeliveryConfirmation;
      });

      const deliveryResult = await messageBus.sendMessage(retryMessage, mockContext);

      expect(deliveryResult.status).toBe('delivered');
      expect(deliveryResult.deliveryAttempts).toBe(4);
      expect(deliveryResult.recoveryPhase).toBe('partition_healing');
    });

    it('should maintain message ordering across partition boundaries', async () => {
      const crossPartitionMessages = [
        createMockA2AMessage({
          messageId: 'cross-1',
          conversationId: 'cross-conv-001',
          threadId: 'cross-thread-001',
          fromNeuronId: 'neuron-a',
          toNeuronId: 'neuron-b',
          orderingRequirement: 'global_order',
          globalSequence: 1,
        }),
        createMockA2AMessage({
          messageId: 'cross-2',
          conversationId: 'cross-conv-001',
          threadId: 'cross-thread-001',
          fromNeuronId: 'neuron-b',
          toNeuronId: 'neuron-c',
          orderingRequirement: 'global_order',
          globalSequence: 2,
        }),
      ];

      // Send messages across partition boundaries
      await messageBus.simulateNetworkPartition(['neuron-c']);

      await messageBus.sendMessage(crossPartitionMessages[0], mockContext);
      const partitionedPromise = messageBus.sendMessage(crossPartitionMessages[1], mockContext);

      // Heal partition
      await messageBus.healNetworkPartition(['neuron-c']);
      await partitionedPromise;

      // Verify global ordering was maintained
      const globalHistory = await messageBus.getGlobalMessageHistory();
      expect(globalHistory.messages[0].globalSequence).toBe(1);
      expect(globalHistory.messages[1].globalSequence).toBe(2);
      expect(globalHistory.orderingConsistency).toBe('maintained_across_partitions');
    });
  });

  describe('Message Persistence and Replay', () => {
    beforeEach(async () => {
      // Configure persistence for testing
      await messageBus.configurePersistence({
        enabled: true,
        durabilityLevel: 'session',
        compressionEnabled: false,
        retentionPolicy: {
          defaultTTL: 3600000, // 1 hour
          archiveAfter: 86400000, // 24 hours
          maxStorage: '100MB',
        },
      });
    });

    it('should persist messages with configurable durability levels', async () => {
      const persistentMessages = [
        createMockA2AMessage({
          messageId: 'persist-session-001',
          persistence: {
            enabled: true,
            durability: 'session',
            replayable: true,
          },
        }),
        createMockA2AMessage({
          messageId: 'persist-permanent-001',
          persistence: {
            enabled: true,
            durability: 'permanent',
            replayable: true,
          },
        }),
        createMockA2AMessage({
          messageId: 'persist-none-001',
          persistence: {
            enabled: false,
            durability: 'none',
            replayable: false,
          },
        }),
      ];

      for (const message of persistentMessages) {
        await messageBus.sendMessage(message, mockContext);
      }

      // Simulate system restart
      await messageBus.shutdown();
      messageBus = new EnhancedA2AMessageBus();
      await messageBus.configurePersistence({
        enabled: true,
        durabilityLevel: 'session',
        compressionEnabled: false,
      });

      const persistedMessages = await messageBus.getPersistedMessages();

      // Session and permanent messages should survive restart
      const sessionMessage = persistedMessages.find((m) => m.messageId === 'persist-session-001');
      const permanentMessage = persistedMessages.find(
        (m) => m.messageId === 'persist-permanent-001',
      );
      const noneMessage = persistedMessages.find((m) => m.messageId === 'persist-none-001');

      expect(sessionMessage).toBeDefined();
      expect(permanentMessage).toBeDefined();
      expect(noneMessage).toBeUndefined(); // Should not be persisted
    });

    it('should support message replay with temporal consistency', async () => {
      const replayMessages = [
        createMockA2AMessage({
          messageId: 'replay-1',
          conversationId: 'replay-conv-001',
          timestamp: new Date('2025-01-01T10:00:00Z'),
          persistence: { enabled: true, durability: 'session', replayable: true },
        }),
        createMockA2AMessage({
          messageId: 'replay-2',
          conversationId: 'replay-conv-001',
          timestamp: new Date('2025-01-01T10:05:00Z'),
          persistence: { enabled: true, durability: 'session', replayable: true },
        }),
        createMockA2AMessage({
          messageId: 'replay-3',
          conversationId: 'replay-conv-001',
          timestamp: new Date('2025-01-01T10:10:00Z'),
          persistence: { enabled: true, durability: 'session', replayable: true },
        }),
      ];

      for (const message of replayMessages) {
        await messageBus.sendMessage(message, mockContext);
      }

      // Replay messages from specific time point
      const replayResult = await messageBus.replayMessages({
        conversationId: 'replay-conv-001',
        fromTimestamp: new Date('2025-01-01T10:02:00Z'),
        toTimestamp: new Date('2025-01-01T10:08:00Z'),
        replaySpeed: 'normal',
        targetNeuronId: 'neuron-replay-target',
      });

      expect(replayResult).toMatchObject({
        conversationId: 'replay-conv-001',
        messagesReplayed: 1, // Only replay-2 falls in the time range
        replayDuration: expect.any(Number),
        temporalConsistency: 'maintained',
        replayEvents: expect.arrayContaining([
          expect.objectContaining({
            messageId: 'replay-2',
            originalTimestamp: new Date('2025-01-01T10:05:00Z'),
            replayTimestamp: expect.any(Date),
          }),
        ]),
      });
    });

    it('should implement message compression and archival', async () => {
      // Configure compression for large conversations
      await messageBus.configurePersistence({
        enabled: true,
        durabilityLevel: 'permanent',
        compressionEnabled: true,
        compressionThreshold: 10, // Compress after 10 messages
      });

      const largeConversationMessages = Array.from({ length: 15 }, (_, i) =>
        createMockA2AMessage({
          messageId: `large-conv-${i}`,
          conversationId: 'large-conv-001',
          payload: {
            type: 'data_intensive',
            data: {
              content: 'x'.repeat(1000), // Large payload
              metadata: { index: i, size: 'large' },
            },
          },
          persistence: { enabled: true, durability: 'permanent', replayable: true },
        }),
      );

      for (const message of largeConversationMessages) {
        await messageBus.sendMessage(message, mockContext);
      }

      const compressionStats = await messageBus.getCompressionStats('large-conv-001');
      expect(compressionStats).toMatchObject({
        conversationId: 'large-conv-001',
        totalMessages: 15,
        compressedMessages: expect.any(Number),
        compressionRatio: expect.any(Number),
        spaceSavedBytes: expect.any(Number),
        compressionAlgorithm: expect.any(String),
      });

      expect(compressionStats.compressedMessages).toBeGreaterThan(0);
      expect(compressionStats.compressionRatio).toBeGreaterThan(0.1); // Some compression achieved
    });

    it('should handle message archival and retrieval policies', async () => {
      const archivalMessage = createMockA2AMessage({
        messageId: 'archival-001',
        conversationId: 'archival-conv-001',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        persistence: {
          enabled: true,
          durability: 'permanent',
          replayable: true,
          archivalPolicy: 'archive_after_24h',
        },
      });

      await messageBus.sendMessage(archivalMessage, mockContext);

      // Trigger archival process
      const archivalResult = await messageBus.triggerArchival();

      expect(archivalResult.messagesArchived).toBeGreaterThanOrEqual(1);
      expect(archivalResult.archivedMessages).toContainEqual(
        expect.objectContaining({
          messageId: 'archival-001',
          archivedAt: expect.any(Date),
          archivalReason: 'age_based_policy',
        }),
      );

      // Archived messages should still be retrievable but marked as archived
      const retrievedArchive = await messageBus.retrieveArchivedMessage('archival-001');
      expect(retrievedArchive).toMatchObject({
        messageId: 'archival-001',
        status: 'archived',
        retrievalLatency: expect.any(Number),
        compressionApplied: expect.any(Boolean),
      });
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      // Configure for performance testing
      await messageBus.configurePerformance({
        maxConcurrentMessages: 100,
        messageBufferSize: 1000,
        batchProcessing: true,
        batchSize: 50,
        priorityQueueEnabled: true,
      });
    });

    it('should handle high-throughput message processing', async () => {
      const highThroughputMessages = Array.from({ length: 500 }, (_, i) =>
        createMockA2AMessage({
          messageId: `throughput-${i}`,
          priority: i % 3 === 0 ? 'high' : 'normal',
          deliveryGuarantee: 'at_least_once',
        }),
      );

      const startTime = Date.now();

      // Send messages in batches to test throughput
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < highThroughputMessages.length; i += batchSize) {
        const batch = highThroughputMessages.slice(i, i + batchSize);
        batches.push(
          Promise.all(batch.map((message) => messageBus.sendMessage(message, mockContext))),
        );
      }

      await Promise.all(batches);
      const endTime = Date.now();

      const throughputMetrics = await messageBus.getThroughputMetrics();
      const messagesPerSecond = (500 / (endTime - startTime)) * 1000;

      expect(throughputMetrics).toMatchObject({
        messagesProcessed: 500,
        averageLatency: expect.any(Number),
        peakThroughput: expect.any(Number),
        currentThroughput: expect.any(Number),
        batchingEfficiency: expect.any(Number),
      });

      // Should achieve reasonable throughput
      expect(messagesPerSecond).toBeGreaterThan(50); // At least 50 messages/second
    });

    it('should implement priority-based message processing', async () => {
      const priorityMessages = [
        createMockA2AMessage({
          messageId: 'critical-001',
          priority: 'critical',
          timestamp: new Date(Date.now() + 1000), // Future timestamp
        }),
        createMockA2AMessage({
          messageId: 'high-001',
          priority: 'high',
          timestamp: new Date(Date.now() + 500),
        }),
        createMockA2AMessage({
          messageId: 'normal-001',
          priority: 'normal',
          timestamp: new Date(), // Current time
        }),
        createMockA2AMessage({
          messageId: 'low-001',
          priority: 'low',
          timestamp: new Date(Date.now() - 1000), // Past timestamp
        }),
      ];

      // Send in reverse priority order
      for (let i = priorityMessages.length - 1; i >= 0; i--) {
        await messageBus.sendMessage(priorityMessages[i], mockContext);
      }

      const priorityMetrics = await messageBus.getPriorityMetrics();
      expect(priorityMetrics.processingOrder).toEqual([
        'critical-001',
        'high-001',
        'normal-001',
        'low-001',
      ]);

      expect(priorityMetrics.averageLatencyByPriority).toMatchObject({
        critical: expect.any(Number),
        high: expect.any(Number),
        normal: expect.any(Number),
        low: expect.any(Number),
      });

      // Critical messages should have lowest latency
      expect(priorityMetrics.averageLatencyByPriority.critical).toBeLessThan(
        priorityMetrics.averageLatencyByPriority.low,
      );
    });

    it('should implement backpressure management under high load', async () => {
      // Configure aggressive backpressure for testing
      await messageBus.configureBackpressure({
        enabled: true,
        highWatermark: 50,
        lowWatermark: 20,
        strategy: 'drop_low_priority',
        alertThreshold: 80,
      });

      const overloadMessages = Array.from({ length: 100 }, (_, i) =>
        createMockA2AMessage({
          messageId: `overload-${i}`,
          priority: i < 30 ? 'high' : 'low', // 30 high priority, 70 low priority
        }),
      );

      const deliveryPromises = overloadMessages.map((message) =>
        messageBus.sendMessage(message, mockContext).catch((error) => ({
          messageId: message.messageId,
          error: error.message,
          status: 'dropped',
        })),
      );

      const results = await Promise.all(deliveryPromises);

      const backpressureMetrics = await messageBus.getBackpressureMetrics();
      expect(backpressureMetrics).toMatchObject({
        triggered: true,
        strategy: 'drop_low_priority',
        messagesDropped: expect.any(Number),
        highPriorityPreserved: expect.any(Number),
        lowPriorityDropped: expect.any(Number),
      });

      // Most high priority messages should be delivered
      const highPriorityResults = results.filter(
        (r) => !('error' in r) && r.messageId?.includes('overload-'),
      );
      const droppedResults = results.filter((r) => 'error' in r);

      expect(droppedResults.length).toBeGreaterThan(0); // Some messages dropped
      expect(backpressureMetrics.highPriorityPreserved).toBeGreaterThan(20); // Most high priority preserved
    });

    it('should scale message routing across multiple neurons efficiently', async () => {
      const multiNeuronMessages = Array.from({ length: 200 }, (_, i) => {
        const neuronId = `neuron-${i % 10}`; // Distribute across 10 neurons
        return createMockA2AMessage({
          messageId: `multi-neuron-${i}`,
          toNeuronId: neuronId,
          routing: {
            strategy: 'load_balanced',
            fallbackNeurons: [`${neuronId}-backup`],
          },
        });
      });

      const routingStartTime = Date.now();
      const routingPromises = multiNeuronMessages.map((message) =>
        messageBus.sendMessage(message, mockContext),
      );

      await Promise.all(routingPromises);
      const routingEndTime = Date.now();

      const routingMetrics = await messageBus.getRoutingMetrics();
      expect(routingMetrics).toMatchObject({
        totalRoutingDecisions: 200,
        averageRoutingLatency: expect.any(Number),
        routingEfficiency: expect.any(Number),
        loadBalancingMetrics: expect.objectContaining({
          neuronsUtilized: expect.any(Number),
          maxLoadImbalance: expect.any(Number),
          routingStrategy: 'load_balanced',
        }),
      });

      // Routing should be efficient
      const avgRoutingTime = (routingEndTime - routingStartTime) / 200;
      expect(avgRoutingTime).toBeLessThan(10); // Less than 10ms per message on average
    });
  });

  describe('Integration and Compatibility', () => {
    it('should integrate seamlessly with Strategy Execution Engine', async () => {
      const strategyMessage = createMockA2AMessage({
        messageId: 'strategy-integration-001',
        messageType: 'strategy_coordination',
        payload: {
          type: 'strategy_phase_transition',
          data: {
            strategyId: 'strategy-001',
            fromPhase: 'planning',
            toPhase: 'implementation',
            coordinationRequired: true,
          },
        },
        routing: {
          strategy: 'strategy_aware',
          strategyContext: {
            phaseRequirements: ['code', 'reasoning'],
            parallelExecution: true,
          },
        },
      });

      const deliveryResult = await messageBus.sendMessage(strategyMessage, mockContext);

      expect(deliveryResult.strategyIntegration).toMatchObject({
        strategyAware: true,
        phaseTransition: 'planning_to_implementation',
        coordinationHandled: true,
        parallelExecutionEnabled: true,
      });
    });

    it('should support Team Formation System messaging patterns', async () => {
      const teamMessages = [
        createMockA2AMessage({
          messageId: 'team-formation-001',
          messageType: 'team_coordination',
          fromNeuronId: 'team-coordinator',
          toNeuronId: 'broadcast', // Broadcast to team members
          payload: {
            type: 'team_assignment',
            data: {
              teamId: 'team-001',
              assignments: [
                { neuronId: 'neuron-code-001', role: 'primary', capability: 'code' },
                { neuronId: 'neuron-review-001', role: 'reviewer', capability: 'reasoning' },
              ],
            },
          },
          routing: {
            strategy: 'team_broadcast',
            teamContext: {
              teamId: 'team-001',
              broadcastToMembers: true,
            },
          },
        }),
      ];

      const deliveryResult = await messageBus.sendMessage(teamMessages[0], mockContext);

      expect(deliveryResult.teamIntegration).toMatchObject({
        teamAware: true,
        broadcastDelivered: true,
        membersNotified: expect.any(Number),
        teamCoordination: 'successful',
      });
    });

    it('should provide CLI-friendly message monitoring', async () => {
      const cliMessage = createMockA2AMessage({
        messageId: 'cli-monitoring-001',
        metadata: {
          cliCommand: 'cortex message send --neuron neuron-001',
          outputFormat: 'cli_friendly',
        },
      });

      await messageBus.sendMessage(cliMessage, mockContext);

      const cliStatus = await messageBus.getCliStatus();
      expect(cliStatus).toMatchObject({
        format: 'cli_friendly',
        messageStatus: expect.objectContaining({
          'cli-monitoring-001': expect.objectContaining({
            status: 'delivered',
            timestamp: expect.any(Date),
            displayFormat: 'terminal_compatible',
          }),
        }),
        realTimeUpdates: true,
        terminalCompatible: true,
      });
    });
  });

  describe('Accessibility and Monitoring', () => {
    it('should provide accessible message status updates', async () => {
      const accessibilityEvents: any[] = [];

      messageBus.on('accessibleMessageUpdate', (update) => {
        accessibilityEvents.push(update);
      });

      const accessibleMessage = createMockA2AMessage({
        messageId: 'accessible-001',
        accessibility: {
          screenReaderFriendly: true,
          statusAnnouncements: true,
          progressUpdates: 'polite',
        },
      });

      await messageBus.sendMessage(accessibleMessage, mockContext);

      expect(accessibilityEvents.length).toBeGreaterThan(0);
      expect(accessibilityEvents[0]).toMatchObject({
        type: 'message_status_update',
        messageId: 'accessible-001',
        status: 'delivered',
        ariaLabel: expect.any(String),
        ariaLive: 'polite',
        screenReaderText: expect.any(String),
        timestamp: expect.any(Date),
      });
    });

    it('should support keyboard-accessible message management', async () => {
      const keyboardInterface = messageBus.getKeyboardAccessibleInterface();

      expect(keyboardInterface).toMatchObject({
        sendMessage: expect.any(Function),
        viewMessages: expect.any(Function),
        searchMessages: expect.any(Function),
        manageSubscriptions: expect.any(Function),
      });

      // Each interface method should have keyboard accessibility
      expect(keyboardInterface.sendMessage).toHaveProperty('accessKey');
      expect(keyboardInterface.viewMessages).toHaveProperty('keyboardShortcut');
      expect(keyboardInterface.searchMessages).toHaveProperty('ariaLabel');
    });
  });
});

// Helper functions for testing
const validateMessageDelivery = (confirmation: DeliveryConfirmation) => {
  expect(confirmation.status).toMatch(/delivered|deduplicated|buffered/);
  expect(confirmation.deliveredAt).toBeInstanceOf(Date);
  expect(confirmation.deliveryAttempts).toBeGreaterThan(0);
};

const validateConversationOrdering = (history: any) => {
  expect(history.messages).toEqual(expect.any(Array));
  expect(history.orderingMetadata).toBeDefined();

  // Verify chronological ordering
  for (let i = 1; i < history.messages.length; i++) {
    expect(history.messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
      history.messages[i - 1].timestamp.getTime(),
    );
  }
};

// Export types for integration testing
export type {
  EnhancedA2AMessageBus,
  A2AMessage,
  ConversationThread,
  MessageDeliveryGuarantee,
  DeliveryConfirmation,
};
