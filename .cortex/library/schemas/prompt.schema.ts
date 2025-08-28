import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

export const BlockKeys = [
  'task_context',
  'tone_context',
  'background',
  'rules',
  'examples',
  'conversation_history',
  'immediate_request',
  'deliberation',
  'output_format',
  'prefill',
] as const;

const BlockKeyEnum = z.enum(BlockKeys);

export const BlocksSchema = z.array(
  z
    .object({
      // enforce order by name + index in validator
      [BlockKeyEnum.enum.task_context]: z.string().optional(),
      [BlockKeyEnum.enum.tone_context]: z.string().optional(),
      [BlockKeyEnum.enum.background]: z.string().optional(),
      [BlockKeyEnum.enum.rules]: z.string().optional(),
      [BlockKeyEnum.enum.examples]: z.string().optional(),
      [BlockKeyEnum.enum.conversation_history]: z.string().optional(),
      [BlockKeyEnum.enum.immediate_request]: z.string().optional(),
      [BlockKeyEnum.enum.deliberation]: z.string().optional(),
      [BlockKeyEnum.enum.output_format]: z.string().optional(),
      [BlockKeyEnum.enum.prefill]: z.string().optional(),
    })
    .refine(
      (o) => Object.keys(o).length === 1,
      "Each blocks[] entry must have exactly one known key",
    ),
);

const schemaPath = z
  .string()
  .min(1)
  .refine((p) => {
    const fullPath = path.resolve(p);
    if (!fs.existsSync(fullPath)) {
      return false;
    }
    if (p.endsWith(".schema.json")) {
      try {
        JSON.parse(fs.readFileSync(fullPath, "utf8"));
      } catch {
        return false;
      }
      return true;
    }
    return p.endsWith(".ts");
  }, {
    message:
      "schema paths must reference existing .ts or .schema.json files with valid JSON for .schema.json",
  });

export const PromptMetaSchema = z.object({
  id: z.string().min(1),
  persona: z.string().min(1),
  role: z.string().min(1),
  version: z.string().min(1),
  model_targets: z.array(z.string()).optional(),
  stack_tags: z.array(z.string()).optional(),
  risk_flags: z.array(z.string()).optional(),
  a11y_flags: z.array(z.string()).optional(),
  inputs_schema: schemaPath,
  outputs_schema: schemaPath,
});

export const PromptPackSchema = z.object({
  meta: PromptMetaSchema,
  blocks: BlocksSchema,
});

export type PromptPack = z.infer<typeof PromptPackSchema>;

export const REQUIRED_ORDER = [...BlockKeys];
