import type { CompletionSource } from '@codemirror/autocomplete';
import type { Language } from '@codemirror/language';
import {
  LEETCODE,
  languageCompletions,
  listSource,
  memberSource,
  names,
  snip,
  unique,
  wordSource,
} from './common';

// lang-cpp has no completions of its own, so this file provides all of them.

const SKIP = [
  'RawString',
  'LineComment',
  'BlockComment',
  'String',
  'SystemLibString',
  'CharLiteral',
  'ConcatenatedString',
];

const KEYWORDS = names(
  'keyword',
  'auto bool break case catch char class const constexpr continue default delete do double ' +
    'else enum explicit false float for friend if inline int long namespace new nullptr ' +
    'operator private protected public return short signed sizeof static struct switch ' +
    'template this throw true try typedef typename unsigned using virtual void while',
);

/** The standard library names interview code reaches for. */
const STD = [
  ...names(
    'class',
    'vector string map unordered_map set unordered_set multiset multimap queue stack deque ' +
      'priority_queue pair tuple array list bitset greater less',
  ),
  ...names(
    'function',
    'sort reverse min max swap abs accumulate lower_bound upper_bound binary_search ' +
      'max_element min_element to_string stoi stol stoll iota fill unique next_permutation ' +
      'gcd lcm make_pair make_tuple getline',
  ),
  ...names('variable', 'cout cin endl'),
];

const GLOBALS = [
  ...KEYWORDS,
  ...STD,
  ...names('type', 'size_t'),
  ...names('constant', 'INT_MAX INT_MIN LLONG_MAX LLONG_MIN'),
  ...names('function', 'memset __builtin_popcount __gcd'),
  ...LEETCODE,
  snip('main', 'main function', 'int main() \\{\n\t${}\n\treturn 0;\n\\}'),
  snip('fori', 'index loop', 'for (int ${i} = 0; ${i} < ${n}; ${i}++) \\{\n\t${}\n\\}'),
  snip('forr', 'range-for loop', 'for (auto& ${x} : ${nums}) \\{\n\t${}\n\\}'),
  snip('cout', 'print line', 'cout << ${} << endl;'),
  snip('usingstd', 'using namespace std', 'using namespace std;'),
];

/** `#include`, `#define`… typed at the start of a directive. */
const DIRECTIVES = [
  snip('#include', 'header', '#include <${}>'),
  snip('#include <bits/stdc++.h>', 'all standard headers', '#include <bits/stdc++.h>'),
  snip('#define', 'macro', '#define ${NAME} ${}'),
];
const directiveSource: CompletionSource = (ctx) => {
  const m = ctx.matchBefore(/^\s*#\w*$/);
  if (!m) return null;
  return { from: m.from + m.text.indexOf('#'), options: DIRECTIVES, validFor: /^#\w*$/ };
};

/** Header names after `#include <`. */
const HEADERS = names(
  'module',
  'bits/stdc++.h vector string unordered_map map unordered_set set queue stack deque ' +
    'algorithm numeric climits cmath iostream utility functional',
);
const headerSource: CompletionSource = (ctx) => {
  const m = ctx.matchBefore(/#include\s*<[\w/+.]*$/);
  if (!m) return null;
  return { from: m.from + m.text.indexOf('<') + 1, options: HEADERS, validFor: /^[\w/+.]*$/ };
};

/** Lines starting with `#` only get the directive and header suggestions above. */
const notInDirective =
  (source: CompletionSource): CompletionSource =>
  (ctx) =>
    ctx.matchBefore(/^\s*#.*$/) ? null : source(ctx);

/** Container, string and pair members, plus LeetCode node fields (`node->next`). */
const MEMBERS = unique([
  ...names(
    'method',
    'push_back emplace_back pop_back back front size empty clear begin end rbegin rend insert ' +
      'erase find count at resize reserve assign push pop top emplace substr length c_str ' +
      'append data',
  ),
  ...names('property', 'first second', 'pair'),
  ...names('property', 'val next left right', 'node'),
]);

export default function cppCompletions(language: Language) {
  return [
    // These two run inside `#include <…>`, which the grammar parses as a string.
    language.data.of({ autocomplete: directiveSource }),
    language.data.of({ autocomplete: headerSource }),
    languageCompletions(
      language,
      SKIP,
      [
        listSource(GLOBALS),
        memberSource({
          members: MEMBERS,
          namespaces: { 'std::': STD },
          separators: ['::', '->', '.'],
        }),
        wordSource,
      ].map(notInDirective),
    ),
  ];
}
