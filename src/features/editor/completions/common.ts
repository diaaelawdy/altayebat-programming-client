import {
  completeAnyWord,
  completeFromList,
  ifNotIn,
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionSource,
} from '@codemirror/autocomplete';
import type { Language } from '@codemirror/language';
import type { Extension } from '@codemirror/state';

/** Space-separated names that share one completion type (and optional detail). */
export function names(type: string, list: string, detail?: string): Completion[] {
  return list
    .trim()
    .split(/\s+/)
    .map((label) => (detail ? { label, type, detail } : { label, type }));
}

/**
 * A snippet. `${name}` marks a field (same name = same field), `${}` the final cursor spot, and
 * literal braces need a backslash: `\\{`.
 */
export function snip(label: string, detail: string, template: string): Completion {
  return snippetCompletion(template, { label, detail, type: 'snippet' });
}

/** Classes LeetCode puts in its starter code for linked-list and tree problems. */
export const LEETCODE = names('class', 'ListNode TreeNode', 'LeetCode');

/** Typing right after `obj.`, `ns::` or `ptr->`. */
const AFTER_MEMBER = /(?:\.|::|->)\w*$/;

/** Wraps a source so it stays quiet right after a member separator (memberSource handles that). */
function notAfterMember(source: CompletionSource): CompletionSource {
  return (ctx) => (ctx.matchBefore(AFTER_MEMBER) ? null : source(ctx));
}

/** Keywords, types, snippets… offered for the word being typed. */
export function listSource(options: readonly Completion[]): CompletionSource {
  return notAfterMember(completeFromList(options));
}

/** Words already in the file (identifiers, table names…), like LeetCode's word suggestions. */
export const wordSource: CompletionSource = notAfterMember(completeAnyWord);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Completes after a member separator. A known namespace (`Math.`, `heapq.`, `std::`) gets its own
 * members; any other object gets the language's common methods, since there is no type info.
 */
export function memberSource(opts: {
  members: readonly Completion[];
  namespaces?: Record<string, readonly Completion[]>;
  separators?: readonly string[];
}): CompletionSource {
  const seps = opts.separators ?? ['.'];
  const re = new RegExp(`(\\w*)(${seps.map(escapeRe).join('|')})\\w*$`);
  return (ctx: CompletionContext) => {
    const match = ctx.matchBefore(re);
    if (!match) return null;
    const [, obj = '', sep = ''] = re.exec(match.text) ?? [];
    const from = match.from + obj.length + sep.length;
    const known = opts.namespaces?.[obj + sep];
    if (known) return { from, options: known, validFor: /^\w*$/ };
    // `::` only has members for known namespaces; skip numbers (`1.5`) and `self.` / `this.`.
    if (sep === '::' || /^\d/.test(obj) || obj === 'self' || obj === 'this') return null;
    // `.` after a call or index (`s.strip().`, `a[0].`) is still a member access.
    if (!obj && !/[)\]]$/.test(ctx.state.sliceDoc(Math.max(0, match.from - 1), match.from)))
      return null;
    return { from, options: opts.members, validFor: /^\w*$/ };
  };
}

/** Registers sources on a language, skipping strings and comments (`skip` = their node names). */
export function languageCompletions(
  language: Language,
  skip: readonly string[],
  sources: readonly CompletionSource[],
): Extension {
  return sources.map((s) => language.data.of({ autocomplete: ifNotIn(skip, s) }));
}

/** Drops repeated labels, keeping the first. */
export function unique(list: readonly Completion[]): Completion[] {
  const seen = new Set<string>();
  return list.filter((c) => !seen.has(c.label) && (seen.add(c.label), true));
}
