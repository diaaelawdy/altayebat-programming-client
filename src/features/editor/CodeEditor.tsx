import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  rectangularSelection,
  crosshairCursor,
  tooltips,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  HighlightStyle,
  foldGutter,
} from '@codemirror/language';
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

import { rainbowBrackets } from './brackets';
import { indentGuides } from './indentGuides';
import type { Lang } from './languages';

const spaces = indentUnit.of('    ');

/**
 * Each language pack and its completion lists form their own chunk, loaded only when picked.
 * Indents are 4 spaces like LeetCode, except Go, which uses tabs (gofmt).
 */
const EXTENSIONS: Record<Lang, () => Promise<Extension>> = {
  python: () =>
    Promise.all([import('@codemirror/lang-python'), import('./completions/python')]).then(
      ([m, c]) => [m.python(), c.default(m.pythonLanguage), spaces],
    ),
  javascript: () =>
    Promise.all([import('@codemirror/lang-javascript'), import('./completions/javascript')]).then(
      ([m, c]) => [m.javascript(), c.default(m.javascriptLanguage), spaces],
    ),
  typescript: () =>
    Promise.all([import('@codemirror/lang-javascript'), import('./completions/javascript')]).then(
      ([m, c]) => [m.javascript({ typescript: true }), c.default(m.typescriptLanguage), spaces],
    ),
  java: () =>
    Promise.all([import('@codemirror/lang-java'), import('./completions/java')]).then(([m, c]) => [
      m.java(),
      c.default(m.javaLanguage),
      spaces,
    ]),
  cpp: () =>
    Promise.all([import('@codemirror/lang-cpp'), import('./completions/cpp')]).then(([m, c]) => [
      m.cpp(),
      c.default(m.cppLanguage),
      spaces,
    ]),
  go: () =>
    Promise.all([import('@codemirror/lang-go'), import('./completions/go')]).then(([m, c]) => [
      m.go(),
      c.default(m.goLanguage),
      indentUnit.of('\t'),
    ]),
  // MySQL is LeetCode's default SQL dialect.
  sql: () =>
    Promise.all([import('@codemirror/lang-sql'), import('./completions/sql')]).then(([m, c]) => [
      m.sql({ dialect: m.MySQL, upperCaseKeywords: true }),
      c.default(m.MySQL.language),
      spaces,
    ]),
};

/** Editor theme built on the site's CSS variables, so it follows dark/light and custom colors. */
const theme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--fg)', fontSize: '14px', height: '100%' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.65' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '12px 0' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--subtle)', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--fg) 4%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--fg)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in oklab, var(--accent) 28%, transparent) !important',
  },
  '.cm-placeholder': { color: 'var(--subtle)' },
  '&.cm-focused': { outline: 'none' },

  // Brackets: the pair at the cursor is boxed; pairs are coloured by depth (see ./brackets).
  '&.cm-focused .cm-matchingBracket, .cm-matchingBracket': {
    backgroundColor: 'color-mix(in oklab, var(--accent) 20%, transparent)',
    outline: '1px solid color-mix(in oklab, var(--accent) 70%, transparent)',
    borderRadius: '2px',
  },
  '&.cm-focused .cm-nonmatchingBracket, .cm-nonmatchingBracket': {
    backgroundColor: 'transparent',
    textDecoration: 'underline wavy var(--danger)',
  },
  '.cm-bracket-d0': { color: 'var(--bracket-1) !important' },
  '.cm-bracket-d1': { color: 'var(--bracket-2) !important' },
  '.cm-bracket-d2': { color: 'var(--bracket-3) !important' },
  '.cm-bracket-bad': { color: 'var(--danger) !important' },

  // A guide line every indent step (4 columns; tabs render 4 wide too).
  '.cm-indent-guides': {
    backgroundImage:
      'linear-gradient(to right, color-mix(in oklab, var(--fg) 12%, transparent) 1px, transparent 1px)',
    backgroundSize: '4ch 100%',
  },

  // Other occurrences of the selected word, and search hits.
  '.cm-selectionMatch': { backgroundColor: 'color-mix(in oklab, var(--accent) 14%, transparent)' },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in oklab, var(--medium) 25%, transparent)',
    outline: '1px solid color-mix(in oklab, var(--medium) 55%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in oklab, var(--medium) 45%, transparent)',
  },

  // Find / replace panel (Ctrl+F).
  '.cm-panels': { backgroundColor: 'var(--surface-2)', color: 'var(--fg)' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panel.cm-search': { padding: '6px 10px', fontSize: '13px' },
  '.cm-panel.cm-search label': { fontSize: '12px', color: 'var(--muted)' },
  '.cm-textfield': {
    backgroundColor: 'var(--surface)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '2px 6px',
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--surface)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
  },
  '.cm-panel.cm-search [name=close]': { color: 'var(--muted)' },

  // Suggestion popup. Tooltips render in <body> (see `tooltips` below) but keep these classes.
  '.cm-tooltip': {
    backgroundColor: 'var(--surface)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    maxHeight: '15em',
    minWidth: '14em',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    padding: '3px 10px 3px 6px',
    lineHeight: '1.5',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'color-mix(in oklab, var(--accent) 24%, transparent)',
    color: 'var(--fg)',
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none',
    color: 'var(--accent)',
    fontWeight: '600',
  },
  '.cm-completionDetail': { color: 'var(--subtle)', fontStyle: 'normal', marginInlineStart: '1em' },
  '.cm-completionIcon': { opacity: '0.9', width: '1.1em', paddingRight: '0.5em' },
  '.cm-completionIcon-keyword': { color: 'var(--syn-keyword)' },
  '.cm-completionIcon-function, .cm-completionIcon-method': { color: 'var(--syn-func)' },
  '.cm-completionIcon-class, .cm-completionIcon-type, .cm-completionIcon-interface': {
    color: 'var(--syn-type)',
  },
  '.cm-completionIcon-constant': { color: 'var(--syn-number)' },
  '.cm-completionIcon-namespace, .cm-completionIcon-module': { color: 'var(--syn-meta)' },
  '.cm-completionIcon-snippet': { color: 'var(--accent)' },
  '.cm-completionIcon-variable, .cm-completionIcon-property, .cm-completionIcon-text': {
    color: 'var(--muted)',
  },
});

/** Token colours come from CSS variables in index.css, so they follow dark/light mode. */
const highlight = HighlightStyle.define([
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.operatorKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.modifier,
      tags.self,
    ],
    color: 'var(--syn-keyword)',
  },
  { tag: [tags.string, tags.special(tags.string), tags.character], color: 'var(--syn-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--syn-number)' },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    color: 'var(--subtle)',
    fontStyle: 'italic',
  },
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.function(tags.definition(tags.variableName)),
      tags.standard(tags.variableName),
    ],
    color: 'var(--syn-func)',
  },
  {
    tag: [tags.typeName, tags.className, tags.standard(tags.typeName), tags.namespace],
    color: 'var(--syn-type)',
  },
  {
    tag: [tags.meta, tags.processingInstruction, tags.annotation, tags.escape, tags.regexp],
    color: 'var(--syn-meta)',
  },
  { tag: [tags.propertyName], color: 'var(--fg)' },
  { tag: [tags.operator, tags.punctuation], color: 'var(--muted)' },
]);

export default function CodeEditor({
  value,
  onChange,
  lang,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  placeholder?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const langComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          foldGutter(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          EditorState.allowMultipleSelections.of(true),
          rectangularSelection(),
          crosshairCursor(),
          indentOnInput(),
          bracketMatching(),
          rainbowBrackets,
          indentGuides,
          closeBrackets(),
          // Suggestions while typing; Enter or Tab accepts, Ctrl+Space opens, Esc closes.
          autocompletion({ icons: true }),
          // In <body>, so the popup isn't clipped by the editor card or the page's motion wrapper.
          tooltips({ parent: document.body }),
          highlightSelectionMatches(),
          search({ top: true }),
          highlightActiveLine(),
          EditorState.tabSize.of(4),
          keymap.of([
            { key: 'Tab', run: acceptCompletion },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          syntaxHighlighting(highlight),
          theme,
          cmPlaceholder(placeholder ?? ''),
          langComp.current.of([]),
          EditorView.updateListener.of(
            (u) => u.docChanged && onChangeRef.current(u.state.doc.toString()),
          ),
          EditorView.contentAttributes.of({ 'aria-label': 'Code editor' }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // Created once; value/lang changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    void EXTENSIONS[lang]().then(
      (ext) => alive && view.current?.dispatch({ effects: langComp.current.reconfigure(ext) }),
    );
    return () => {
      alive = false;
    };
  }, [lang]);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value)
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} dir="ltr" className="h-full min-h-64 text-start" />;
}
