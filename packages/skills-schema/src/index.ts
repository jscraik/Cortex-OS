import semver from 'semver';
import { z } from 'zod';
import { SKILLS_BRAND, brandMessage } from './brand.js';

const brandErrorMap: z.ZodErrorMap = (issue, ctx) => {
  const path = issue.path.join('.');
  const suffix = path ? `${path}: ${ctx.defaultError}` : ctx.defaultError;
  return { message: brandMessage(suffix) };
};
type JsonSchemaValue = string | number | boolean | null | JsonSchemaValue[] | { [key: string]: JsonSchemaValue };

const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null()
]);

const JsonSchema: z.ZodType<JsonSchemaValue> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.array(JsonSchema),
    z.record(JsonSchema)
  ])
);

const SkillIOFieldSchema = z.object(
  {
    type: z.string({
      required_error: brandMessage('type is required'),
      invalid_type_error: brandMessage('type must be a string')
    }).min(1, brandMessage('type must be non-empty')),
    description: z.string().min(1, brandMessage('description must be non-empty')).optional(),
    required: z.boolean().optional(),
    format: z.string().min(1, brandMessage('format must be non-empty')).optional(),
    enum: z.array(JsonPrimitiveSchema, {
      invalid_type_error: brandMessage('enum must be an array of primitives')
    }).optional(),
    minLength: z.number().int().min(0, brandMessage('minLength must be >= 0')).optional(),
    maxLength: z.number().int().min(1, brandMessage('maxLength must be >= 1')).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    default: JsonPrimitiveSchema.optional(),
    examples: z.array(JsonSchema).optional()
  },
  { errorMap: brandErrorMap }
).superRefine((field, ctx) => {
  if (typeof field.minLength === 'number' && typeof field.maxLength === 'number' && field.maxLength < field.minLength) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: brandMessage('maxLength must be greater than or equal to minLength'),
      path: ['maxLength']
    });
  }
});

const SkillIOMapSchema = z.record(SkillIOFieldSchema, { errorMap: brandErrorMap });

const LifecycleSchema = z.object(
  {
    deprecated: z.boolean().optional(),
    deprecatedSince: z.string().datetime({ message: brandMessage('deprecatedSince must be ISO-8601 datetime') }).optional(),
    sunsetDate: z.string().datetime({ message: brandMessage('sunsetDate must be ISO-8601 datetime') }).optional(),
    supersededBy: z.string().min(1, brandMessage('supersededBy must be non-empty')).optional()
  },
  { errorMap: brandErrorMap }
);

const ContextArraySchema = z.array(z.string().min(1, brandMessage('context entries must be non-empty')), {
  errorMap: brandErrorMap
}).optional();

const CallsArraySchema = z.array(z.string().min(1, brandMessage('calls entries must be non-empty')), {
  errorMap: brandErrorMap
}).optional();

const SkillI18nSchema = z.record(
  z
    .object({
      description: z.string().min(1, brandMessage('i18n.description must be non-empty')).optional(),
      summary: z.string().min(1, brandMessage('i18n.summary must be non-empty')).optional()
    })
    .refine(
      (value) => Boolean(value.description || value.summary),
      brandMessage('i18n entries require at least description or summary')
    ),
  { errorMap: brandErrorMap }
).optional();

export const SkillMetadataSchema = z
  .object(
    {
      name: z
        .string({
          required_error: brandMessage('name is required'),
          invalid_type_error: brandMessage('name must be a string')
        })
        .min(1, brandMessage('name must be non-empty'))
        .max(120, brandMessage('name must be ≤ 120 characters'))
        .regex(/^[A-Za-z0-9][A-Za-z0-9\-_. ]*$/, brandMessage('name must be alphanumeric with optional separators')),
      version: z
        .string({
          required_error: brandMessage('version is required'),
          invalid_type_error: brandMessage('version must be a string')
        })
        .refine((value) => semver.valid(value) !== null, brandMessage('version must be valid semver')),
      category: z
        .string({
          required_error: brandMessage('category is required'),
          invalid_type_error: brandMessage('category must be a string')
        })
        .min(2, brandMessage('category must be at least 2 characters'))
        .max(60, brandMessage('category must be ≤ 60 characters')),
      description: z
        .string({
          required_error: brandMessage('description is required'),
          invalid_type_error: brandMessage('description must be a string')
        })
        .min(10, brandMessage('description must be at least 10 characters'))
        .max(500, brandMessage('description must be ≤ 500 characters')),
      impl: z
        .string({
          required_error: brandMessage('impl is required'),
          invalid_type_error: brandMessage('impl must be a string')
        })
        .min(1, brandMessage('impl must be non-empty')),
      inputs: SkillIOMapSchema,
      outputs: SkillIOMapSchema,
      preconditions: z
        .array(z.string().min(1, brandMessage('preconditions entries must be non-empty')), {
          errorMap: brandErrorMap
        })
        .default([]),
      sideEffects: z
        .array(z.string().min(1, brandMessage('sideEffects entries must be non-empty')), {
          errorMap: brandErrorMap
        })
        .default([]),
      estimatedCost: z.string().min(1, brandMessage('estimatedCost must be non-empty')),
      calls: CallsArraySchema,
      requiresContext: ContextArraySchema,
      providesContext: ContextArraySchema,
      monitoring: z.boolean().optional(),
      lifecycle: LifecycleSchema.optional(),
      deprecated: z.boolean().optional(),
      deprecatedSince: LifecycleSchema.shape.deprecatedSince.optional(),
      sunsetDate: LifecycleSchema.shape.sunsetDate.optional(),
      supersededBy: LifecycleSchema.shape.supersededBy.optional(),
      estimatedDuration: z.string().min(1, brandMessage('estimatedDuration must be non-empty')).optional(),
      i18n: SkillI18nSchema
    },
    { errorMap: brandErrorMap }
  )
  .superRefine((value, ctx) => {
    const deprecatedFlag = value.deprecated ?? value.lifecycle?.deprecated ?? false;
    const sunset = value.sunsetDate ?? value.lifecycle?.sunsetDate;
    if (deprecatedFlag && !sunset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: brandMessage('deprecated skills must define sunsetDate'),
        path: ['sunsetDate']
      });
    }

    if (sunset && Number.isNaN(Date.parse(sunset))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: brandMessage('sunsetDate must be ISO-8601 compliant'),
        path: ['sunsetDate']
      });
    }

    const calls = value.calls ?? [];
    const duplicates = new Set<string>();
    const seen = new Set<string>();
    for (const call of calls) {
      const normalized = call.trim();
      if (seen.has(normalized)) {
        duplicates.add(normalized);
      }
      seen.add(normalized);
    }

    if (duplicates.size > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: brandMessage(`calls must be unique. Duplicate entries: ${Array.from(duplicates).join(', ')}`),
        path: ['calls']
      });
    }
  })
  .transform((value) => ({
    ...value,
    deprecated: value.deprecated ?? value.lifecycle?.deprecated ?? false
  }));

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;
export type SkillIOField = z.infer<typeof SkillIOFieldSchema>;
export { SKILLS_BRAND, brandMessage };
