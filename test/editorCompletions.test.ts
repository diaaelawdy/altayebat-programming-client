import {
  CompletionContext,
  completeFromList,
  type Completion,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { cpp, cppLanguage } from '@codemirror/lang-cpp';
import { go, goLanguage } from '@codemirror/lang-go';
import { java, javaLanguage } from '@codemirror/lang-java';
import { javascript, javascriptLanguage, typescriptLanguage } from '@codemirror/lang-javascript';
import { python, pythonLanguage } from '@codemirror/lang-python';
import { MySQL, sql } from '@codemirror/lang-sql';
import { EditorState, type Extension } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import cppCompletions from '@/features/editor/completions/cpp';
import goCompletions from '@/features/editor/completions/go';
import javaCompletions from '@/features/editor/completions/java';
import javascriptCompletions from '@/features/editor/completions/javascript';
import pythonCompletions from '@/features/editor/completions/python';
import sqlCompletions from '@/features/editor/completions/sql';

// Same pairing as EXTENSIONS in CodeEditor.tsx.
const LANGS = {
  python: [python(), pythonCompletions(pythonLanguage)],
  javascript: [javascript(), javascriptCompletions(javascriptLanguage)],
  typescript: [javascript({ typescript: true }), javascriptCompletions(typescriptLanguage)],
  java: [java(), javaCompletions(javaLanguage)],
  cpp: [cpp(), cppCompletions(cppLanguage)],
  go: [go(), goCompletions(goLanguage)],
  sql: [sql({ dialect: MySQL, upperCaseKeywords: true }), sqlCompletions(MySQL.language)],
} satisfies Record<string, Extension>;

/**
 * Labels every completion source offers at `|`, narrowed to what was typed (the editor does the
 * same narrowing, fuzzily, before showing the list).
 */
async function suggest(lang: keyof typeof LANGS, code: string): Promise<string[]> {
  const pos = code.indexOf('|');
  const doc = code.slice(0, pos) + code.slice(pos + 1);
  const state = EditorState.create({ doc, selection: { anchor: pos }, extensions: LANGS[lang] });
  const ctx = new CompletionContext(state, pos, false);
  const labels: string[] = [];
  const sources = state.languageDataAt<CompletionSource | readonly (string | Completion)[]>(
    'autocomplete',
    pos,
  );
  for (const src of sources) {
    const result = await (typeof src === 'function' ? src : completeFromList(src))(ctx);
    if (!result) continue;
    const typed = state.sliceDoc(result.from, pos).toLowerCase();
    for (const o of result.options)
      if (o.label.toLowerCase().startsWith(typed)) labels.push(o.label);
  }
  return labels;
}

describe('Java', () => {
  it('suggests collection types', async () => {
    expect(await suggest('java', 'Map<Integer, Integer> m = new Has|')).toEqual(
      expect.arrayContaining(['HashMap', 'HashSet']),
    );
  });
  it('offers only Math members after Math.', async () => {
    const labels = await suggest('java', 'int x = Math.|');
    expect(labels).toEqual(expect.arrayContaining(['max', 'min', 'abs', 'floorMod']));
    expect(labels).not.toContain('add');
    expect(labels).not.toContain('HashMap');
  });
  it('suggests methods on other objects', async () => {
    expect(await suggest('java', 'list.ad|')).toEqual(
      expect.arrayContaining(['add', 'addAll', 'addFirst', 'addLast']),
    );
  });
  it('suggests names already in the file', async () => {
    expect(await suggest('java', 'int answerCount = 0;\nreturn ans|')).toContain('answerCount');
  });
  it('has loop snippets', async () => {
    expect(await suggest('java', 'fo|')).toEqual(
      expect.arrayContaining(['for', 'fori', 'foreach']),
    );
  });
});

describe('C++', () => {
  it('suggests container methods', async () => {
    expect(await suggest('cpp', 'v.push|')).toContain('push_back');
  });
  it('suggests node fields after ->', async () => {
    expect(await suggest('cpp', 'node = node->ne|')).toContain('next');
  });
  it('completes std:: names only', async () => {
    const labels = await suggest('cpp', 'std::unordered|');
    expect(labels).toEqual(['unordered_map', 'unordered_set']);
  });
  it('offers nothing after an unknown ::', async () => {
    expect(await suggest('cpp', 'Solution::ba|')).toEqual([]);
  });
  it('completes directives and header names', async () => {
    expect(await suggest('cpp', '#inc|')).toEqual(
      expect.arrayContaining(['#include', '#include <bits/stdc++.h>']),
    );
    expect(await suggest('cpp', '#include <unord|')).toEqual(['unordered_map', 'unordered_set']);
  });
});

describe('Python', () => {
  it('offers heapq members after heapq.', async () => {
    const labels = await suggest('python', 'heapq.heap|');
    expect(labels).toEqual(expect.arrayContaining(['heappush', 'heappop', 'heapify']));
    expect(labels).not.toContain('append');
  });
  it('suggests list and deque methods', async () => {
    expect(await suggest('python', 'q.app|')).toEqual(
      expect.arrayContaining(['append', 'appendleft']),
    );
  });
  it('suggests collections names', async () => {
    expect(await suggest('python', 'd = defa|')).toContain('defaultdict');
  });
});

describe('JavaScript / TypeScript', () => {
  it('offers Math members', async () => {
    expect(await suggest('javascript', 'Math.fl|')).toEqual(['floor']);
  });
  it('suggests array methods', async () => {
    expect(await suggest('javascript', 'nums.fi|')).toEqual(
      expect.arrayContaining(['filter', 'find', 'findIndex', 'fill']),
    );
  });
  it('works in TypeScript too', async () => {
    expect(await suggest('typescript', 'let n = Number.MAX|')).toContain('MAX_SAFE_INTEGER');
  });
});

describe('Go', () => {
  it('offers strings members', async () => {
    expect(await suggest('go', 'strings.Has|')).toEqual(['HasPrefix', 'HasSuffix']);
  });
  it('suggests LeetCode node fields', async () => {
    expect(await suggest('go', 'head = head.Ne|')).toContain('Next');
  });
});

describe('SQL', () => {
  it('suggests functions', async () => {
    expect(await suggest('sql', 'SELECT cou|')).toContain('COUNT');
  });
  it('suggests table and column names already typed', async () => {
    expect(await suggest('sql', 'SELECT employee_id FROM Employees WHERE emp|')).toEqual(
      expect.arrayContaining(['employee_id', 'Employees']),
    );
  });
});

describe('inside strings and comments', () => {
  it.each([
    ['java', 'String s = "Has|";'],
    ['java', '// new Has|'],
    ['cpp', 'string s = "v.push|";'],
    ['cpp', '// v.push|'],
    ['python', 'x = "heapq.heap|"'],
    ['python', '# d = defa|'],
    ['javascript', 'const s = "Math.fl|";'],
    ['javascript', '// nums.fi|'],
    ['go', 's := "strings.Has|"'],
    ['go', '// strings.Has|'],
    ['sql', "SELECT * FROM t WHERE name = 'cou|'"],
    ['sql', 'SELECT 1 -- cou|'],
  ] as const)('%s: %s offers nothing', async (lang, code) => {
    expect(await suggest(lang, code)).toEqual([]);
  });
});
