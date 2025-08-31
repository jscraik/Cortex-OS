import { z } from 'zod';

export const PipelineManifest = z.object({
  id: z.string().min(1),
  version: z.string(),
  entry: z.string(),
  caps: z.object({
    net: z.boolean(),
    fs: z.boolean(),
    gpu: z.boolean().optional()
  }),
  sha256: z.string(),
  signature: z.string().optional()
});

export type PipelineManifest = z.infer<typeof PipelineManifest>;
