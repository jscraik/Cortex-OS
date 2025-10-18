export const SKILLS_BRAND = 'brAInwav Skills Registry';

export const brandMessage = (message: string): string => `${SKILLS_BRAND}: ${message}`;

const BRAND_PREFIX = new RegExp(`^${SKILLS_BRAND}:\\s*`);

export const stripBrandPrefix = (message: string): string => message.replace(BRAND_PREFIX, '');

export class SkillsRegistryError extends Error {
  constructor(message: string) {
    super(brandMessage(message));
    this.name = 'SkillsRegistryError';
  }
}

export const wrapError = (error: unknown, fallback: string): SkillsRegistryError => {
  if (error instanceof SkillsRegistryError) {
    return error;
  }

  if (error instanceof Error) {
    return new SkillsRegistryError(stripBrandPrefix(error.message));
  }

  return new SkillsRegistryError(fallback);
};
