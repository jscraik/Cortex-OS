import { z } from 'zod';

export const ActionPoint = z.object({
  task_id: z.string().min(1), // stable id: hash(file+lines+title)
  title: z.string().min(3),
  description: z.string().optional(),
  severity: z.enum(['blocker', 'major', 'minor']).default('minor'),
  category: z
    .enum(['security', 'a11y', 'perf', 'correctness', 'style', 'docs', 'test'])
    .default('correctness'),
  file: z.string().optional(),
  start_line: z.number().int().optional(),
  end_line: z.number().int().optional(),
  evidence_url: z.string().url().optional(),
  labels: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
});

export const ActionPoints = z.object({
  pr_number: z.number().int(),
  source_comment_url: z.string().url(),
  items: z.array(ActionPoint),
});

export type ActionPoint = z.infer<typeof ActionPoint>;
export type ActionPoints = z.infer<typeof ActionPoints>;
