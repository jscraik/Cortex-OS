import { describe, expect, it } from 'vitest';
import { isValidNeo4jIdentifier, Neo4j } from '../src/adapters/neo4j.js';

describe('Neo4j identifier guard', () => {
  it('regex validator behaves as expected', () => {
    expect(isValidNeo4jIdentifier('Good_Label_123')).toBe(true);
    expect(isValidNeo4jIdentifier('Bad-Label')).toBe(false);
    expect(isValidNeo4jIdentifier('1bad')).toBe(false);
  });

  it('rejects unsafe labels at runtime', async () => {
    const n = new Neo4j('bolt://ignored', 'u', 'p');
    // Expect an error from invalid label when running query (no connection is attempted yet)
    await expect(n.upsertNode({ id: '1', label: 'Bad-Label', props: {} })).rejects.toThrow(
      /invalid_identifier/,
    );
  });
});
