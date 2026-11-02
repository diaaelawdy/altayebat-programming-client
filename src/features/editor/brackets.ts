import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view';

const OPEN = '([{';
const CLOSE = ')]}';
/** Nodes whose text isn't code (strings, comments, regexes…) across all the bundled grammars. */
const OPAQUE =
  /(?:Comment|String)$|^(?:StringLiteral|CharacterLiteral|CharLiteral|TextBlock|Rune|RegExp|QuotedIdentifier|JSXText)$/;
/** Past this, colouring is skipped: solutions are far smaller, and the scan is whole-document. */
const MAX_LINES = 5000;

export interface BracketMark {
  pos: number;
  /** Nesting depth, 0 for the outermost pair. */
  depth: number;
  /** A closing bracket with no matching opener. */
  unmatched: boolean;
}

/**
 * Every bracket in the document with its nesting depth, ignoring brackets inside strings and
 * comments. Scans characters rather than syntax nodes because not every grammar marks its
 * brackets (Java's `[ ]`, SQL).
 */
export function bracketDepths(state: EditorState): BracketMark[] {
  if (state.doc.lines > MAX_LINES) return [];
  const tree = ensureSyntaxTree(state, state.doc.length, 50) ?? syntaxTree(state);
  const skip: [number, number][] = [];
  tree.iterate({
    enter: (node) => {
      if (!OPAQUE.test(node.name)) return;
      skip.push([node.from, node.to]);
      return false;
    },
  });

  const text = state.doc.toString();
  const stack: string[] = [];
  const out: BracketMark[] = [];
  let s = 0;
  for (let i = 0; i < text.length; i++) {
    while (s < skip.length && skip[s]![1] <= i) s++;
    if (s < skip.length && skip[s]![0] <= i) {
      i = skip[s]![1] - 1;
      continue;
    }
    const ch = text[i]!;
    const open = OPEN.indexOf(ch);
    if (open >= 0) {
      out.push({ pos: i, depth: stack.length, unmatched: false });
      stack.push(CLOSE[open]!);
    } else if (CLOSE.includes(ch)) {
      if (stack[stack.length - 1] === ch) {
        stack.pop();
        out.push({ pos: i, depth: stack.length, unmatched: false });
      } else {
        out.push({ pos: i, depth: 0, unmatched: true });
      }
    }
  }
  return out;
}

const depthMarks = [0, 1, 2].map((d) => Decoration.mark({ class: `cm-bracket-d${d}` }));
const unmatchedMark = Decoration.mark({ class: 'cm-bracket-bad' });

function decorate(view: EditorView, marks: readonly BracketMark[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  let i = 0;
  for (const { from, to } of view.visibleRanges) {
    while (i < marks.length && marks[i]!.pos < from) i++;
    for (; i < marks.length && marks[i]!.pos < to; i++) {
      const m = marks[i]!;
      builder.add(m.pos, m.pos + 1, m.unmatched ? unmatchedMark : depthMarks[m.depth % 3]!);
    }
  }
  return builder.finish();
}

/** Colours bracket pairs by depth (cycling through 3 colours) and stray closers in red. */
export const rainbowBrackets = ViewPlugin.fromClass(
  class {
    marks: BracketMark[];
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.marks = bracketDepths(view.state);
      this.decorations = decorate(view, this.marks);
    }
    update(u: ViewUpdate) {
      const reparsed = syntaxTree(u.state) !== syntaxTree(u.startState);
      if (u.docChanged || reparsed) this.marks = bracketDepths(u.state);
      if (u.docChanged || reparsed || u.viewportChanged)
        this.decorations = decorate(u.view, this.marks);
    }
  },
  { decorations: (v) => v.decorations },
);
