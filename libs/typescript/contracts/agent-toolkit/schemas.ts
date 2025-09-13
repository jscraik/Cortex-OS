import { z } from 'zod';

// Base tool result schema
export const baseToolResultSchema = z.object({
  tool: z.string(),
  op: z.string(),
  inputs: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});

// Search tools schemas
export const searchInputSchema = z.object({
  pattern: z.string(),
  path: z.string(),
});

export const searchMatchSchema = z.object({
  file: z.string(),
  line: z.number(),
  text: z.string(),
  column: z.number().optional(),
});

export const searchResultSchema = baseToolResultSchema.extend({
  tool: z.literal('ripgrep').or(z.literal('semgrep')).or(z.literal('ast-grep')),
  op: z.literal('search'),
  inputs: searchInputSchema,
  results: z.array(searchMatchSchema),
  error: z.string().optional(),
});

// Code modification schemas
export const codemodInputSchema = z.object({
  find: z.string(),
  replace: z.string(),
  path: z.string(),
});

export const codemodChangeSchema = z.object({
  file: z.string(),
  changes: z.number(),
  preview: z.string().optional(),
});

export const codemodResultSchema = baseToolResultSchema.extend({
  tool: z.literal('comby'),
  op: z.literal('rewrite'),
  inputs: codemodInputSchema,
  results: z.array(codemodChangeSchema),
  error: z.string().optional(),
});

// Validation schemas
export const validationInputSchema = z.object({
  files: z.array(z.string()),
});

export const validationIssueSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string(),
  rule: z.string().optional(),
});

export const validationResultSchema = baseToolResultSchema.extend({
  tool: z.literal('eslint').or(z.literal('ruff')).or(z.literal('cargo')).or(z.literal('pytest')),
  op: z.literal('validate'),
  inputs: validationInputSchema,
  results: z.array(validationIssueSchema),
  summary: z.object({
    total: z.number(),
    errors: z.number(),
    warnings: z.number(),
  }),
  error: z.string().optional(),
});

// Diff schemas
export const diffInputSchema = z.object({
  before: z.string(),
  after: z.string(),
  context: z.number().optional(),
});

export const diffResultSchema = baseToolResultSchema.extend({
  tool: z.literal('difftastic'),
  op: z.literal('diff'),
  inputs: diffInputSchema,
  results: z.object({
    diff: z.string(),
    stats: z.object({
      additions: z.number(),
      deletions: z.number(),
      files: z.number(),
    }),
  }),
  error: z.string().optional(),
});

// Tree-sitter query schemas
export const treesitterQueryInputSchema = z.object({
  query: z.string(),
  path: z.string(),
});

export const treesitterMatchSchema = z.object({
  file: z.string(),
  matches: z.array(z.object({
    name: z.string().optional(),
    text: z.string(),
    start: z.object({ row: z.number(), column: z.number() }),
    end: z.object({ row: z.number(), column: z.number() }),
  })),
});

export const treesitterQueryResultSchema = baseToolResultSchema.extend({
  tool: z.literal('tree-sitter'),
  op: z.literal('query'),
  inputs: treesitterQueryInputSchema,
  results: z.array(treesitterMatchSchema),
  error: z.string().optional(),
});

// Union types
export const toolInputSchema = z.union([
  searchInputSchema,
  codemodInputSchema,
  validationInputSchema,
  diffInputSchema,
  treesitterQueryInputSchema,
]);

export const toolResultSchema = z.union([
  searchResultSchema,
  codemodResultSchema,
  validationResultSchema,
  diffResultSchema,
  treesitterQueryResultSchema,
]);

// Type exports
export type SearchInput = z.infer<typeof searchInputSchema>;
export type SearchMatch = z.infer<typeof searchMatchSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;

export type CodemodInput = z.infer<typeof codemodInputSchema>;
export type CodemodChange = z.infer<typeof codemodChangeSchema>;
export type CodemodResult = z.infer<typeof codemodResultSchema>;

export type ValidationInput = z.infer<typeof validationInputSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;

export type DiffInput = z.infer<typeof diffInputSchema>;
export type DiffResult = z.infer<typeof diffResultSchema>;

export type TreesitterQueryInput = z.infer<typeof treesitterQueryInputSchema>;
export type TreesitterMatch = z.infer<typeof treesitterMatchSchema>;
export type TreesitterQueryResult = z.infer<typeof treesitterQueryResultSchema>;

export type ToolInput = z.infer<typeof toolInputSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;