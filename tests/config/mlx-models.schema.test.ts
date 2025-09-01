import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { mlxModelsSchema } from '../../schemas/mlx-models.schema';

describe('mlx-models.json', () => {
  it('matches schema', () => {
    const data = JSON.parse(readFileSync(join(process.cwd(), 'config', 'mlx-models.json'), 'utf8'));
    const result = mlxModelsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
