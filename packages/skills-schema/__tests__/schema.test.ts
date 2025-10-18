import { describe, expect, it } from 'vitest';
import { SkillMetadataSchema } from '../src/index.js';

describe('SkillMetadataSchema', () => {
  it('accepts valid skill metadata', () => {
    const metadata = SkillMetadataSchema.parse({
      name: 'SendEmail',
      version: '1.2.0',
      category: 'comms',
      description: 'Sends a transactional email via the configured provider.',
      impl: './skills/send-email.ts',
      inputs: {
        to: { type: 'string', format: 'email', required: true },
        subject: { type: 'string', minLength: 1, required: true },
        bodyHtml: { type: 'string', required: true }
      },
      outputs: {
        messageId: { type: 'string' }
      },
      preconditions: ['hasSecret:EMAIL_API_KEY'],
      sideEffects: ['writes:EmailProvider'],
      estimatedCost: '~40ms',
      calls: [],
      requiresContext: ['tenantId'],
      providesContext: ['lastEmailMessageId'],
      monitoring: true,
      deprecated: false,
      i18n: {
        'en-US': {
          description: 'Sends a transactional email via the configured provider.'
        }
      }
    });

    expect(metadata.name).toBe('SendEmail');
    expect(metadata.version).toBe('1.2.0');
    expect(metadata.inputs.to.required).toBe(true);
    expect(metadata.deprecated).toBe(false);
  });

  it('rejects invalid semver versions with branded error messaging', () => {
    expect(() =>
      SkillMetadataSchema.parse({
        name: 'SendEmail',
        version: '1.0',
        category: 'comms',
        description: 'Invalid semver',
        impl: './skills/send-email.ts',
        inputs: { foo: { type: 'string' } },
        outputs: {},
        preconditions: [],
        sideEffects: [],
        estimatedCost: '~40ms'
      })
    ).toThrow(/brAInwav.+semver/i);
  });

  it('requires inputs and outputs fields to declare a type', () => {
    expect(() =>
      SkillMetadataSchema.parse({
        name: 'SendEmail',
        version: '1.0.0',
        category: 'comms',
        description: 'Missing type for output field',
        impl: './skills/send-email.ts',
        inputs: { foo: { type: 'string' } },
        outputs: {
          bar: { description: 'No type provided' }
        },
        preconditions: [],
        sideEffects: [],
        estimatedCost: '~40ms'
      })
    ).toThrow(/brAInwav.+outputs\.bar/i);
  });

  it('enforces deprecation metadata requirements', () => {
    expect(() =>
      SkillMetadataSchema.parse({
        name: 'LegacySkill',
        version: '1.0.0',
        category: 'legacy',
        description: 'Deprecated skill missing sunsetDate',
        impl: './skills/legacy.ts',
        inputs: { foo: { type: 'string' } },
        outputs: {},
        preconditions: [],
        sideEffects: [],
        estimatedCost: '~10ms',
        deprecated: true
      })
    ).toThrow(/brAInwav.+sunsetDate/i);
  });

  it('enforces ISO-8601 formatting for sunsetDate', () => {
    expect(() =>
      SkillMetadataSchema.parse({
        name: 'LegacySkill',
        version: '1.0.0',
        category: 'legacy',
        description: 'Deprecated skill with invalid date',
        impl: './skills/legacy.ts',
        inputs: { foo: { type: 'string' } },
        outputs: {},
        preconditions: [],
        sideEffects: [],
        estimatedCost: '~10ms',
        deprecated: true,
        sunsetDate: '10-18-2025'
      })
    ).toThrow(/brAInwav.+ISO-8601/i);
  });

  it('rejects duplicate dependency calls', () => {
    expect(() =>
      SkillMetadataSchema.parse({
        name: 'CompositeSkill',
        version: '1.0.0',
        category: 'composite',
        description: 'Duplicate calls array entries',
        impl: './skills/composite.ts',
        inputs: { foo: { type: 'string' } },
        outputs: {},
        preconditions: [],
        sideEffects: [],
        estimatedCost: '~25ms',
        calls: ['send-email', 'send-email']
      })
    ).toThrow(/brAInwav.+calls/i);
  });
});
