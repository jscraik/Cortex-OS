import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createEnvelope } from '../../a2a-contracts/src/envelope.js';
import {
  createInputValidator,
  createSchemaValidator,
  type InputValidator,
  type SchemaValidator,
  ValidationError,
} from '../src/validation/input-validator.js';

describe('Input Validation', () => {
  let validator: InputValidator;
  let schemaValidator: SchemaValidator;

  beforeEach(() => {
    validator = createInputValidator({
      maxPayloadSize: 1024, // 1KB for testing
      allowedTypes: ['task.create', 'task.update'],
      requireSource: true,
    });

    schemaValidator = createSchemaValidator();
  });

  describe('Size Validation', () => {
    it('should reject oversized payloads', () => {
      const hugePayload = 'x'.repeat(2048); // 2KB > 1KB limit

      const envelope = createEnvelope({
        type: 'data.process',
        source: 'urn:cortex:agent:sender',
        data: { content: hugePayload },
      });

      expect(() => validator.validateEnvelope(envelope)).toThrow(ValidationError);
    });

    it('should accept normal-sized payloads', () => {
      const normalPayload = 'normal content';

      const envelope = createEnvelope({
        type: 'task.create',
        source: 'urn:cortex:agent:sender',
        data: { content: normalPayload },
      });

      expect(() => validator.validateEnvelope(envelope)).not.toThrow();
    });
  });

  describe('Content Sanitization', () => {
    it('should sanitize SQL-like inputs', () => {
      const maliciousInput = {
        query: "'; DROP TABLE tasks; --",
        comment: '<script>alert("xss")</script>',
      };

      const envelope = createEnvelope({
        type: 'task.create',
        source: 'urn:cortex:agent:sender',
        data: maliciousInput,
      });

      // Validation should pass but data should be sanitized
      validator.validateEnvelope(envelope);

      // Check that dangerous content was removed
      const sanitizedData = envelope.data as { query: string; comment: string };
      expect(sanitizedData.query).not.toContain('DROP TABLE');
      expect(sanitizedData.query).not.toContain('--');
      expect(sanitizedData.comment).not.toContain('<script>');
    });

    it('should handle nested object sanitization', () => {
      const nestedMaliciousInput = {
        user: {
          name: "admin'; DELETE FROM users; --",
          profile: {
            bio: '<script>steal_cookies()</script>Bio content',
          },
        },
      };

      const envelope = createEnvelope({
        type: 'task.create',
        source: 'urn:cortex:agent:sender',
        data: nestedMaliciousInput,
      });

      validator.validateEnvelope(envelope);

      const sanitizedData = envelope.data as typeof nestedMaliciousInput;
      expect(sanitizedData.user.name).not.toContain('DELETE FROM users');
      expect(sanitizedData.user.profile.bio).not.toContain('<script>');
    });
  });

  describe('Type Validation', () => {
    it('should allow permitted message types', () => {
      const envelope = createEnvelope({
        type: 'task.create', // Allowed type
        source: 'urn:cortex:agent:sender',
        data: { task: 'test' },
      });

      expect(() => validator.validateEnvelope(envelope)).not.toThrow();
    });

    it('should reject non-permitted message types', () => {
      const envelope = createEnvelope({
        type: 'forbidden.operation', // Not in allowedTypes
        source: 'urn:cortex:agent:sender',
        data: { task: 'test' },
      });

      expect(() => validator.validateEnvelope(envelope)).toThrow(
        "Message type 'forbidden.operation' not allowed",
      );
    });
  });

  describe('Source Validation', () => {
    it('should require source when configured', () => {
      const envelope = createEnvelope({
        type: 'task.create',
        source: '', // Empty source
        data: { task: 'test' },
      });

      expect(() => validator.validateEnvelope(envelope)).toThrow('Source is required');
    });

    it('should validate source URI format', () => {
      const envelope = createEnvelope({
        type: 'task.create',
        source: 'invalid-uri-format',
        data: { task: 'test' },
      });

      expect(() => validator.validateEnvelope(envelope)).toThrow('Invalid source URI');
    });
  });

  describe('Schema Validation', () => {
    it('should validate against registered schema', () => {
      const TaskSchema = z.object({
        id: z.string().uuid(),
        priority: z.enum(['low', 'medium', 'high']),
        timeout: z.number().int().positive().max(3600),
      });

      schemaValidator.registerSchema('task.create', TaskSchema);

      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        priority: 'high' as const,
        timeout: 300,
      };

      expect(() => schemaValidator.validateData('task.create', validData)).not.toThrow();
    });

    it('should reject data that fails schema validation', () => {
      const TaskSchema = z.object({
        id: z.string().uuid(),
        priority: z.enum(['low', 'medium', 'high']),
        timeout: z.number().int().positive().max(3600),
      });

      schemaValidator.registerSchema('task.create', TaskSchema);

      const invalidData = {
        id: 'not-a-uuid',
        priority: 'urgent', // Invalid enum value
        timeout: -1, // Negative number
      };

      expect(() => schemaValidator.validateData('task.create', invalidData)).toThrow(
        ValidationError,
      );
    });

    it('should provide detailed validation error messages', () => {
      const TaskSchema = z.object({
        name: z.string().min(1),
        count: z.number().positive(),
      });

      schemaValidator.registerSchema('task.validate', TaskSchema);

      const invalidData = {
        name: '',
        count: -5,
      };

      try {
        schemaValidator.validateData('task.validate', invalidData);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toBeDefined();
        expect(validationError.details).toHaveLength(2);
      }
    });

    it('should skip validation when no schema is registered', () => {
      // No schema registered for this type
      const data = { anything: 'goes' };

      expect(() => schemaValidator.validateData('unregistered.type', data)).not.toThrow();
    });
  });

  describe('Custom Validators', () => {
    it('should run custom validation rules', () => {
      const customValidator = createInputValidator({
        customValidators: [
          (envelope) => {
            if (
              typeof envelope.data === 'object' &&
              envelope.data &&
              'forbidden' in envelope.data
            ) {
              return 'Forbidden field detected';
            }
            return null;
          },
        ],
      });

      const envelope = createEnvelope({
        type: 'task.create',
        source: 'urn:cortex:agent:sender',
        data: { forbidden: 'value' },
      });

      expect(() => customValidator.validateEnvelope(envelope)).toThrow('Forbidden field detected');
    });

    it('should pass when custom validators return null', () => {
      const customValidator = createInputValidator({
        customValidators: [
          () => null, // Always pass
        ],
      });

      const envelope = createEnvelope({
        type: 'task.create',
        source: 'urn:cortex:agent:sender',
        data: { anything: 'goes' },
      });

      expect(() => customValidator.validateEnvelope(envelope)).not.toThrow();
    });
  });
});
