import { describe, expect, it } from 'vitest';
import { hasSlugCollision, sanitizeMdxContent } from '../sync-docs';

describe('sanitizeMdxContent signature normalization', () => {
  it('wraps only Promise generic portion when pre-wrapped (current behavior)', () => {
    const input = '## runGate(config, deps): Promise<Result<Ok,Err>>';
    const protectedInput = input.replace('Promise<Result<Ok,Err>>', '`Promise<Result<Ok,Err>>`');
    const out = sanitizeMdxContent(protectedInput);
    // Sanitizer escapes angle brackets inside inline code spans -> &lt; &gt;
  // Current sanitizer splits nested generic into separate backticked segments around inner generic.
  expect(out).toMatch(/## runGate\(config, deps\): `Promise&lt;`Result<Ok,Err>`&gt;`/);
  });

  it('leaves existing split code spans for function name + Promise (current behavior)', () => {
    const input = '### `fetchData(args)`: `Promise<Response<Data>>`';
    const out = sanitizeMdxContent(input);
  expect(out).toMatch(/### `fetchData\(args\)`: `Promise&lt;`Response<Data>`&gt;`/);
  });
});

describe('hasSlugCollision (post security rename policy)', () => {
  it('detects only README + base collisions (index + base no longer treated as collision)', () => {
    expect(hasSlugCollision(['README.md', 'package.md'], 'package')).toBe(true);
    expect(hasSlugCollision(['index.md', 'package.md'], 'package')).toBe(false);
  });
});
