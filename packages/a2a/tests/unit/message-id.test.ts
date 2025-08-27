/**
 * @file Message ID generator tests
 * @description Unit tests for deterministic and random ID generation
 */

import { describe, expect, it } from 'vitest';
import { createIdGenerator, defaultIdGenerator } from '../../src/lib/message-id.js';

describe('Message ID Generator', () => {
  describe('createIdGenerator', () => {
    it('generates deterministic IDs with seed', () => {
      const generator = createIdGenerator('test');

      const id1 = generator.generate();
      const id2 = generator.generate();

      expect(id1).toMatch(/^test_1_\d+$/);
      expect(id2).toMatch(/^test_2_\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('generates different sequences for different seeds', () => {
      const gen1 = createIdGenerator('seed1');
      const gen2 = createIdGenerator('seed2');

      const id1 = gen1.generate();
      const id2 = gen2.generate();

      expect(id1.startsWith('seed1_')).toBe(true);
      expect(id2.startsWith('seed2_')).toBe(true);
      expect(id1).not.toBe(id2);
    });

    it('generates random IDs without seed', () => {
      const generator = createIdGenerator();

      const id1 = generator.generate();
      const id2 = generator.generate();

      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('generates no collisions for N=1000 deterministic', () => {
      const generator = createIdGenerator('collision-test');
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const id = generator.generate();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }

      expect(ids.size).toBe(1000);
    });
  });

  describe('defaultIdGenerator', () => {
    it('generates non-deterministic IDs', () => {
      const id1 = defaultIdGenerator.generate();
      const id2 = defaultIdGenerator.generate();

      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
