import semver from 'semver';
import { z } from 'zod';
import { loadSkills, type LoadedSkill, type LoadSkillsOptions } from './fs-loader.js';
import { brandMessage, SkillsRegistryError, stripBrandPrefix } from './brand.js';
import type { SkillIOField, SkillMetadata } from './index.js';

const registryErrorMap: z.ZodErrorMap = (issue, ctx) => {
  const path = issue.path.join('.');
  const suffix = path ? `${path}: ${ctx.defaultError}` : ctx.defaultError;
  return { message: brandMessage(suffix) };
};

type StoredSkill = LoadedSkill & { inputSchema?: z.ZodObject<any> };

type SkillMap = Map<string, StoredSkill[]>;

const ensureSkills = (map: SkillMap, name: string): StoredSkill[] => {
  const entries = map.get(name);
  if (!entries || entries.length === 0) {
    throw new SkillsRegistryError(`skill ${name} is not registered`);
  }

  return entries;
};

const stringSchemaForField = (field: SkillIOField, key: string): z.ZodTypeAny => {
  let schema = z.string({
    required_error: brandMessage(`inputs.${key} is required`),
    invalid_type_error: brandMessage(`inputs.${key} must be a string`)
  });

  if (typeof field.minLength === 'number') {
    schema = schema.min(field.minLength, brandMessage(`inputs.${key} must be at least ${field.minLength} characters`));
  }

  if (typeof field.maxLength === 'number') {
    schema = schema.max(field.maxLength, brandMessage(`inputs.${key} must be at most ${field.maxLength} characters`));
  }

  if (field.format === 'email') {
    schema = schema.email(brandMessage(`inputs.${key} must be a valid email`));
  }

  if (field.enum && field.enum.length > 0) {
    const values = Array.from(new Set(field.enum));
    schema = z.union(values.map((value) => z.literal(value))) as z.ZodTypeAny;
  }

  return schema;
};

const numberSchemaForField = (field: SkillIOField, key: string, integer: boolean): z.ZodTypeAny => {
  let schema = z.number({
    required_error: brandMessage(`inputs.${key} is required`),
    invalid_type_error: brandMessage(`inputs.${key} must be a number`)
  });

  if (integer) {
    schema = schema.int(brandMessage(`inputs.${key} must be an integer`));
  }

  if (typeof field.minimum === 'number') {
    schema = schema.min(field.minimum, brandMessage(`inputs.${key} must be >= ${field.minimum}`));
  }

  if (typeof field.maximum === 'number') {
    schema = schema.max(field.maximum, brandMessage(`inputs.${key} must be <= ${field.maximum}`));
  }

  if (field.enum && field.enum.length > 0) {
    const values = Array.from(new Set(field.enum.filter((value): value is number => typeof value === 'number')));
    if (values.length > 0) {
      schema = z.union(values.map((value) => z.literal(value))) as z.ZodTypeAny;
    }
  }

  return schema;
};

const booleanSchemaForField = (key: string): z.ZodTypeAny =>
  z.boolean({
    required_error: brandMessage(`inputs.${key} is required`),
    invalid_type_error: brandMessage(`inputs.${key} must be a boolean`)
  });

const arraySchemaForField = (): z.ZodTypeAny => z.array(z.unknown(), { errorMap: registryErrorMap });

const buildFieldSchema = (field: SkillIOField, key: string): z.ZodTypeAny => {
  switch (field.type) {
    case 'string':
      return stringSchemaForField(field, key);
    case 'integer':
      return numberSchemaForField(field, key, true);
    case 'number':
      return numberSchemaForField(field, key, false);
    case 'boolean':
      return booleanSchemaForField(key);
    case 'array':
      return arraySchemaForField();
    case 'object':
      return z.record(z.unknown(), { errorMap: registryErrorMap });
    default:
      return z.unknown();
  }
};

const applyOptionality = (schema: z.ZodTypeAny, field: SkillIOField): z.ZodTypeAny => {
  let result = schema;

  if (!field.required) {
    result = result.optional();
  }

  if (field.default !== undefined) {
    // Safely cast default value based on field type
    switch (field.type) {
      case 'string':
        result = result.default(String(field.default));
        break;
      case 'integer':
      case 'number':
        result = result.default(Number(field.default));
        break;
      case 'boolean':
        result = result.default(Boolean(field.default));
        break;
      case 'array':
        result = result.default(Array.isArray(field.default) ? field.default : []);
        break;
      case 'object':
        result = result.default(
          typeof field.default === 'object' && field.default !== null ? field.default : {}
        );
        break;
      default:
        result = result.default(field.default);
        break;
    }
  }

  return result;
};

const buildInputSchema = (metadata: SkillMetadata): z.ZodObject<any> => {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(metadata.inputs ?? {})) {
    const schema = buildFieldSchema(field, key);
    shape[key] = applyOptionality(schema, field);
  }

  return z.object(shape, { errorMap: registryErrorMap });
};

const sortSkills = (skills: StoredSkill[]): StoredSkill[] =>
  [...skills].sort((a, b) => semver.rcompare(a.metadata.version, b.metadata.version));

export class SkillRegistry {
  private readonly skills: SkillMap;

  private constructor(skills: LoadedSkill[]) {
    const grouped: SkillMap = new Map();
    for (const skill of skills) {
      const existing = grouped.get(skill.metadata.name) ?? [];
      existing.push({ ...skill });
      grouped.set(skill.metadata.name, sortSkills(existing));
    }
    this.skills = grouped;
  }

  static async fromDirectory(options: LoadSkillsOptions = {}): Promise<SkillRegistry> {
    const skills = await loadSkills(options);
    return new SkillRegistry(skills);
  }

  list(): LoadedSkill[] {
    return Array.from(this.skills.values()).flat().map((skill) => ({
      metadata: skill.metadata,
      body: skill.body,
      filePath: skill.filePath,
      relativePath: skill.relativePath
    }));
  }

  has(name: string): boolean {
    const entries = this.skills.get(name);
    return Boolean(entries && entries.length > 0);
  }

  get(name: string, versionRange?: string): StoredSkill {
    const entries = ensureSkills(this.skills, name);

    if (!versionRange) {
      return entries[0];
    }

    const normalized = versionRange.trim();
    if (!semver.validRange(normalized)) {
      throw new SkillsRegistryError(`invalid version range for ${name}: ${normalized}`);
    }

    const match = entries.find((skill) =>
      semver.satisfies(skill.metadata.version, normalized, { includePrerelease: true })
    );

    if (!match) {
      throw new SkillsRegistryError(`${name} has no version matching ${normalized}`);
    }

    return match;
  }

  validateInputs(name: string, payload: unknown, versionRange?: string): Record<string, unknown> {
    const skill = this.get(name, versionRange);
    if (!skill.inputSchema) {
      skill.inputSchema = buildInputSchema(skill.metadata);
    }

    const result = skill.inputSchema.safeParse((payload as Record<string, unknown>) ?? {});
    if (!result.success) {
      throw new SkillsRegistryError(stripBrandPrefix(result.error.message));
    }

    return result.data as Record<string, unknown>;
  }
}
