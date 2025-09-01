import { z } from 'zod';

export const FunctionManifest = z.object({
  id: z.string().min(1),
  version: z.string().default('0.1.0'),
  input: z.any().optional(),
  output: z.any().optional(),
  caps: z
    .object({ net: z.boolean().default(false), fs: z.boolean().default(false) })
    .default({ net: false, fs: false })
});

export type FunctionManifest = z.infer<typeof FunctionManifest>;
