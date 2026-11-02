import type { Language } from '@codemirror/language';
import { LEETCODE, languageCompletions, listSource, memberSource, names, unique } from './common';

// lang-python already completes keywords, built-ins (len, range, sorted…) and names in the file.

const SKIP = ['Comment', 'String', 'FormatString', 'ContinuedString'];

const GLOBALS = [
  ...names('class', 'defaultdict Counter deque OrderedDict List Optional Dict Set Tuple'),
  ...names(
    'function',
    'heappush heappop heapify heappushpop nlargest nsmallest bisect_left bisect_right insort ' +
      'lru_cache cache reduce cmp_to_key permutations combinations accumulate product',
  ),
  ...names('namespace', 'heapq bisect collections itertools functools math string'),
  ...LEETCODE,
];

const NAMESPACES = {
  'heapq.': names(
    'function',
    'heappush heappop heapify heappushpop heapreplace nlargest nsmallest',
  ),
  'collections.': names('class', 'defaultdict Counter deque OrderedDict namedtuple'),
  'math.': [
    ...names('constant', 'inf pi e'),
    ...names('function', 'sqrt isqrt floor ceil gcd lcm log log2 log10 pow comb perm factorial'),
  ],
  'bisect.': names('function', 'bisect_left bisect_right insort insort_left insort_right'),
  'itertools.': names(
    'function',
    'permutations combinations accumulate product chain groupby zip_longest pairwise count',
  ),
  'functools.': names('function', 'lru_cache cache reduce cmp_to_key'),
  'string.': names('constant', 'ascii_lowercase ascii_uppercase ascii_letters digits'),
};

/** No types to go on, so `x.` offers the usual list / dict / set / str / deque methods. */
const MEMBERS = unique([
  ...names('method', 'append extend insert pop remove index count sort reverse copy clear'),
  ...names('method', 'get items keys values setdefault update popitem'),
  ...names('method', 'add discard union intersection difference issubset'),
  ...names(
    'method',
    'join split strip lstrip rstrip lower upper startswith endswith find replace ' +
      'isdigit isalpha isalnum islower isupper format',
  ),
  ...names('method', 'appendleft popleft extendleft rotate most_common elements'),
  ...names('property', 'val next left right', 'node'),
]);

export default function pythonCompletions(language: Language) {
  return languageCompletions(language, SKIP, [
    listSource(GLOBALS),
    memberSource({ members: MEMBERS, namespaces: NAMESPACES }),
  ]);
}
