import { z, ZodArray, ZodObject, ZodTypeAny } from 'zod';

/**
 * Recursively remove fields marked with description 'redact' in the given Zod schema.
 * Returns a new object with sensitive fields omitted.
 */
export function redact<T extends ZodTypeAny>(schema: T, data: unknown): unknown {
  return _redact(schema, data);
}

function _redact(schema: ZodTypeAny, value: any): any {
  if (schema instanceof ZodObject && value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    const shape = schema.shape;
    for (const key of Object.keys(shape)) {
      const fieldSchema = shape[key] as ZodTypeAny;
      if (fieldSchema._def.description === 'redact') {
        continue;
      }
      const child = _redact(fieldSchema, value[key]);
      if (child !== undefined) {
        result[key] = child;
      }
    }
    return result;
  }

  if (schema instanceof ZodArray && Array.isArray(value)) {
    return value.map((item) => _redact(schema.element, item));
  }

  return value;
}
