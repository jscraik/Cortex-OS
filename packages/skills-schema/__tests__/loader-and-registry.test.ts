import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadSkills } from '../src/fs-loader.js';
import { SkillRegistry } from '../src/registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = (...segments: string[]) => join(__dirname, 'fixtures', ...segments);

describe('loadSkills', () => {
  it('loads and validates markdown front-matter deterministically', async () => {
    const skills = await loadSkills({ root: fixtures('skills-valid') });

    expect(skills.map((skill) => skill.metadata.name)).toEqual([
      'LegacyEmail',
      'SendEmail',
      'SummarizeNote'
    ]);

    const sendEmail = skills.find((skill) => skill.metadata.name === 'SendEmail');
    expect(sendEmail?.metadata.version).toBe('1.2.0');
    expect(sendEmail?.metadata.inputs.to.format).toBe('email');
    expect(sendEmail?.metadata.providesContext).toEqual(['lastEmailMessageId']);

    const legacy = skills.find((skill) => skill.metadata.name === 'LegacyEmail');
    expect(legacy?.metadata.deprecated).toBe(true);
    expect(legacy?.metadata.sunsetDate).toBe('2026-03-31T00:00:00.000Z');
    expect(legacy?.metadata.supersededBy).toBe('SendEmail');
  });

  it('throws branded errors when a skill fails validation', async () => {
    await expect(loadSkills({ root: fixtures('skills-invalid') })).rejects.toThrow(/brAInwav.+MissingOutputs/i);
  });
});

describe('SkillRegistry', () => {
  it('builds an index and resolves versions', async () => {
    const registry = await SkillRegistry.fromDirectory({ root: fixtures('skills-valid') });

    expect(registry.has('SendEmail')).toBe(true);
    expect(registry.has('UnknownSkill')).toBe(false);

    const latest = registry.get('SendEmail');
    expect(latest?.metadata.version).toBe('1.2.0');

    const legacy = registry.get('LegacyEmail');
    expect(legacy?.metadata.deprecated).toBe(true);

    expect(() => registry.get('SendEmail', '^2.0.0')).toThrow(/brAInwav.+SendEmail/i);
  });

  it('validates inputs using generated zod schemas', async () => {
    const registry = await SkillRegistry.fromDirectory({ root: fixtures('skills-valid') });

    const payload = registry.validateInputs('SendEmail', {
      to: 'user@example.com',
      subject: 'Hello there',
      bodyHtml: '<p>Hi!</p>'
    });

    expect(payload).toEqual({
      to: 'user@example.com',
      subject: 'Hello there',
      bodyHtml: '<p>Hi!</p>'
    });

    expect(() =>
      registry.validateInputs('SendEmail', {
        to: 'user@example.com'
      })
    ).toThrow(/brAInwav.+subject/i);

    expect(() =>
      registry.validateInputs('SummarizeNote', {
        content: 'This is a note that needs summarization.',
        language: 'de'
      })
    ).toThrow(/brAInwav.+language/i);
  });
});
