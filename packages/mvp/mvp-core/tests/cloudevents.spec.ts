import { describe, it, expect } from 'vitest';
import { createCloudEvent } from '../src/cloudevents.js';

describe('createCloudEvent', () => {
  it('builds a CloudEvent envelope with defaults', () => {
    const event = createCloudEvent({
      type: 'com.example.test',
      source: '/test',
      data: { foo: 'bar' }
    });
    expect(event.specversion).toBe('1.0');
    expect(event.type).toBe('com.example.test');
    expect(event.source).toBe('/test');
    expect(event.id).toBeDefined();
    expect(event.time).toBeDefined();
    expect(event.data).toEqual({ foo: 'bar' });
  });
});
