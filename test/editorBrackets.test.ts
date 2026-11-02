import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorState, type Extension } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { bracketDepths } from '@/features/editor/brackets';

const marks = (doc: string, lang: Extension = []) =>
  bracketDepths(EditorState.create({ doc, extensions: lang }));

describe('bracketDepths', () => {
  it('gives each pair its nesting depth', () => {
    expect(marks('((a)[b])').map((m) => m.depth)).toEqual([0, 1, 1, 1, 1, 0]);
    expect(marks('f(x) {g[0]}').map((m) => m.depth)).toEqual([0, 0, 0, 1, 1, 0]);
  });

  it('ignores brackets inside strings and comments', () => {
    const code = 'f("(x", \')\') # (\n';
    expect(marks(code, python()).map((m) => code[m.pos])).toEqual(['(', ')']);
    const js = 'g(`(${a}`, /[(]/) // {';
    expect(marks(js, javascript()).map((m) => js[m.pos])).toEqual(['(', ')']);
  });

  it("counts Java's array brackets, which its grammar doesn't mark", () => {
    const code = 'class A { int f(int[] a) { return a[0]; } }';
    expect(marks(code, java()).filter((m) => code[m.pos] === '[')).toHaveLength(2);
  });

  it('flags closing brackets with no opener', () => {
    expect(marks('a)')).toEqual([{ pos: 1, depth: 0, unmatched: true }]);
    expect(marks('(]').map((m) => m.unmatched)).toEqual([false, true]);
  });

  it('leaves unclosed openers alone while typing', () => {
    expect(marks('f(a, [b').every((m) => !m.unmatched)).toBe(true);
  });
});
