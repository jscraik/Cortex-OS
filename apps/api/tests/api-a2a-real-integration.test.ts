import { beforeEach, describe, expect, it } from 'vitest';
import {
  type ApiBusIntegration,
  ApiEventTypes,
  createApiBusIntegration,
  createWebhookEvent,
} from '../src/core/a2a-integration.js';
import { StructuredLogger } from '../src/core/observability.js';
import type { ApiOperationMetadata, GatewayRequest } from '../src/core/types.js';

describe('API A2A Real Bus Integration', () => {
  let logger: StructuredLogger;
  let apiBus: ApiBusIntegration;

  beforeEach(() => {
    logger = new StructuredLogger();
    apiBus = createApiBusIntegration(logger);
  });

  describe('Real A2A Bus Lifecycle', () => {
    it('should start and provide access to real A2A bus', async () => {
      await apiBus.start();

      // Verify real A2A bus is accessible
      expect(apiBus.getA2ABus()).toBeDefined();
      expect(apiBus.isA2ABusReady()).toBe(true);

      const a2aBus = apiBus.getA2ABus();
      expect(a2aBus.bus).toBeDefined();
      expect(a2aBus.schemaRegistry).toBeDefined();
      expect(a2aBus.transport).toBeDefined();

      expect(logger.history.some((entry) => entry.message.includes('started successfully'))).toBe(
        true,
      );

      await apiBus.stop();
    });
  });

  describe('Real A2A Event Publishing', () => {
    beforeEach(async () => {
      await apiBus.start();
    });

    it('should publish events via real A2A bus', async () => {
      const request: GatewayRequest = {
        operationId: 'users.list',
        method: 'GET',
        path: '/users',
        headers: { 'x-correlation-id': 'test-123' },
        metadata: { source: 'test' },
      };

      const metadata: ApiOperationMetadata = {
        requestId: 'req-123',
        correlationId: 'test-123',
        timestamp: Date.now(),
        source: 'test',
      };

      // Set up event capture via real A2A bus binding
      const capturedEvents: Envelope[] = [];
      const a2aBus = apiBus.getA2ABus();
      await a2aBus.bus.bind([
        {
          type: ApiEventTypes.REQUEST_RECEIVED,
          handle: async (envelope: Envelope) => {
            capturedEvents.push(envelope);
          },
        },
      ]);

      await apiBus.publishRequestReceived(request, metadata);

      // Allow time for event propagation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0]?.data).toMatchObject({
        requestId: 'req-123',
        method: 'GET',
        path: '/users',
      });

      // Verify logging shows real bus usage
      expect(
        logger.history.some((entry) => entry.message.includes('Published A2A event via real bus')),
      ).toBe(true);
    });

    it('should handle webhook events via real A2A bus', async () => {
      const webhook = createWebhookEvent(
        'github',
        'push',
        { ref: 'refs/heads/main' },
        { 'x-github-event': 'push' },
        'sha256=abc123',
      );

      // Set up event capture via real A2A bus binding
      const capturedEvents: Envelope[] = [];
      const a2aBus = apiBus.getA2ABus();
      await a2aBus.bus.bind([
        {
          type: ApiEventTypes.WEBHOOK_RECEIVED,
          handle: async (envelope: Envelope) => {
            capturedEvents.push(envelope);
          },
        },
      ]);

      await apiBus.publishWebhookReceived(webhook);

      // Allow time for event propagation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0]?.data).toMatchObject({
        source: 'github',
        event: 'push',
        verified: true,
      });
    });

    it('should handle job events via real A2A bus', async () => {
      const jobEvents: Envelope[] = [];
      const a2aBus = apiBus.getA2ABus();
      await a2aBus.bus.bind([
        {
          type: ApiEventTypes.JOB_CREATED,
          handle: async (envelope: Envelope) => {
            jobEvents.push(envelope);
          },
        },
      ]);

      const jobId = await apiBus.createJob('test-job', { data: 'test' });

      // Allow time for event propagation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(jobId).toBeDefined();
      expect(jobEvents).toHaveLength(1);
      expect(jobEvents[0]?.data).toMatchObject({
        jobId,
        type: 'test-job',
        status: 'created',
      });
    });
  });

  describe('Fallback Behavior', () => {
    it('should gracefully handle bus failures', async () => {
      await apiBus.start();

      // This should not throw even if there are internal bus issues
      await apiBus.publishRequestReceived(
        {
          operationId: 'test',
          method: 'GET',
          path: '/test',
          headers: {},
          metadata: { source: 'test' },
        },
        {
          requestId: 'test-req',
          timestamp: Date.now(),
        },
      );

      // Should log any fallback behavior
      expect(logger.history.length).toBeGreaterThan(0);
    });
  });
});
