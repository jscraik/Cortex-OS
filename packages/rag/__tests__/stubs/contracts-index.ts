import { z } from 'zod';

// Minimal stub to satisfy a2a-contracts dependency in tests without building contracts package
export const evidenceSchema = z.record(z.any());
export const evidenceArraySchema = z.array(evidenceSchema);
export type EvidenceArray = z.infer<typeof evidenceArraySchema>;
