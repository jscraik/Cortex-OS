import { z } from 'zod';

export const evidenceSchema = z.record(z.any());
export const evidenceArraySchema = z.array(evidenceSchema);
export { z };
