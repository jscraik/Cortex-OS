import * as path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { beforeAll, describe, expect, it } from 'vitest';
import { SchemaRegistry } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Schema Registry', () => {
  let registry: SchemaRegistry;
  let app: any;

  beforeAll(() => {
    const contractsPath = path.join(__dirname, 'fixtures', 'contracts');
    registry = new SchemaRegistry({
      port: 3002, // Different port for testing
      contractsPath,
      corsOrigin: '*',
    });
    app = registry.getApp(); // We'll need to add this method
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Schema Listing', () => {
    it('should list all available schemas', async () => {
      const response = await request(app).get('/schemas').expect(200);

      expect(response.body).toMatchObject({
        schemas: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(response.body.schemas.length).toBeGreaterThan(0);
    });

    it('should include schema metadata', async () => {
      const response = await request(app).get('/schemas').expect(200);

      const firstSchema = response.body.schemas[0];
      expect(firstSchema).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        category: expect.any(String),
      });
    });
  });

  describe('Schema Retrieval', () => {
    it('should get specific schema by ID', async () => {
      const response = await request(app).get('/schemas/user-created').expect(200);

      expect(response.body).toMatchObject({
        schema: expect.any(Object),
        schemaId: 'user-created',
        timestamp: expect.any(String),
      });

      expect(response.body.schema.$id).toBe('user-created');
    });

    it('should return 404 for non-existent schema', async () => {
      const response = await request(app).get('/schemas/non-existent').expect(404);

      expect(response.body).toMatchObject({
        error: 'Schema not found',
        schemaId: 'non-existent',
      });
    });
  });

  describe('Category Filtering', () => {
    it('should get schemas by category', async () => {
      const response = await request(app).get('/categories/events').expect(200);

      expect(response.body).toMatchObject({
        category: 'events',
        schemas: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should return empty array for non-existent category', async () => {
      const response = await request(app).get('/categories/non-existent').expect(200);

      expect(response.body).toMatchObject({
        category: 'non-existent',
        schemas: [],
        count: 0,
      });
    });
  });

  describe('Event Validation', () => {
    const validUserCreatedEvent = {
      specversion: '1.0',
      type: 'com.cortex.user.created',
      source: '/user-service',
      id: 'test-event-123',
      time: '2025-08-27T10:00:00Z',
      data: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2025-08-27T10:00:00Z',
      },
    };

    it('should validate valid event', async () => {
      const response = await request(app)
        .post('/validate/user-created')
        .send(validUserCreatedEvent)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        schemaId: 'user-created',
        timestamp: expect.any(String),
      });
    });

    it('should reject invalid event', async () => {
      const invalidEvent = { ...validUserCreatedEvent };
      delete invalidEvent.data;

      const response = await request(app)
        .post('/validate/user-created')
        .send(invalidEvent)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: false,
        schemaId: 'user-created',
      });
    });

    it('should return 400 for missing event data', async () => {
      const response = await request(app).post('/validate/user-created').send({}).expect(400);

      expect(response.body).toMatchObject({
        error: 'No event data provided',
      });
    });

    it('should return 404 for non-existent schema', async () => {
      const response = await request(app)
        .post('/validate/non-existent')
        .send(validUserCreatedEvent)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Schema not found',
        schemaId: 'non-existent',
      });
    });
  });
});
