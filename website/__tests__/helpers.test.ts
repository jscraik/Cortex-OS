import { describe, it, expect } from 'vitest';
import {
  unwrapSuperFence,
  upgradeDoubleBacktickFences,
  escapePseudoJsx,
  escapeInlineAnglesInCode,
  normalizeWhitespace,
  isMermaidContentLine,
} from '../src/sanitize-mdx';

describe('sanitize-mdx helpers', () => {
  it('unwrapSuperFence: removes whole-doc ````markdown wrapper around valid doc', () => {
    const raw = '````markdown\n---\ntitle: Test\n---\n\n# H\n\nBody\n````\n';
    const out = unwrapSuperFence(raw);
    expect(out.startsWith('---')).toBe(true);
    expect(out).not.toMatch(/````/);
    expect(out).toMatch(/# H/);
  });

  it('upgradeDoubleBacktickFences: promotes ``lang to ```lang and closes properly', () => {
    const raw = '``ts\nconst a = 1;\n``';
    const out = upgradeDoubleBacktickFences(raw);
    expect(out).toMatch(/```ts\nconst a = 1;\n```/);
  });

  it('escapePseudoJsx: escapes capitalized tag-like tokens but keeps safe html lowercase', () => {
    expect(escapePseudoJsx('See <Widget> demo.')).toContain('&lt;Widget&gt;');
    expect(escapePseudoJsx('<div>ok</div>')).toContain('<div>ok</div>');
  });

  it('escapeInlineAnglesInCode: encodes < > inside inline code spans', () => {
    const raw = 'Use `Promise<Result>` here';
    const out = escapeInlineAnglesInCode(raw);
    expect(out).toContain('Promise&lt;Result&gt;');
  });

  it('normalizeWhitespace: collapses excessive blank lines and trims trailing spaces', () => {
    const raw = 'Line 1   \n\n\n\nLine 2  \t\n';
    const out = normalizeWhitespace(raw);
    expect(out).toBe('Line 1\n\n\nLine 2');
  });

  it('isMermaidContentLine: recognizes simple arrow and participant lines', () => {
    expect(isMermaidContentLine('participant A')).toBe(true);
    expect(isMermaidContentLine('A-->>B: msg')).toBe(true);
    expect(isMermaidContentLine('normal prose')).toBe(false);
  });
});
