import type { Language } from '@codemirror/language';
import { LEETCODE, languageCompletions, listSource, memberSource, names, unique } from './common';

// lang-go already completes keywords, snippets and names in the file.

const SKIP = ['LineComment', 'BlockComment', 'String', 'Rune'];

const GLOBALS = [
  ...names('function', 'append len cap make new delete copy panic min max'),
  ...names('type', 'int int64 int32 float64 string byte rune bool error any'),
  ...names('namespace', 'fmt strings strconv sort slices math heap unicode'),
  ...LEETCODE,
];

const NAMESPACES = {
  'fmt.': names('function', 'Println Printf Sprintf Sprint Print Errorf'),
  'strings.': [
    ...names(
      'function',
      'Split Join Contains HasPrefix HasSuffix Index Repeat ToLower ToUpper TrimSpace Trim ' +
        'Fields Replace ReplaceAll Count EqualFold',
    ),
    ...names('class', 'Builder'),
  ],
  'strconv.': names('function', 'Itoa Atoi FormatInt ParseInt Quote'),
  'sort.': names('function', 'Ints Strings Slice SliceStable Search SearchInts Sort'),
  'slices.': names('function', 'Sort SortFunc Contains Index Reverse Max Min BinarySearch Equal'),
  'math.': [
    ...names('constant', 'MaxInt MinInt MaxInt32 MinInt32 MaxInt64 MinInt64'),
    ...names('function', 'Inf Abs Max Min Sqrt Floor Ceil Pow'),
  ],
  'heap.': names('function', 'Init Push Pop Fix Remove'),
  'unicode.': names('function', 'IsDigit IsLetter IsUpper IsLower ToUpper ToLower'),
};

/** LeetCode node fields, heap.Interface and strings.Builder methods. */
const MEMBERS = unique([
  ...names('property', 'Val Next Left Right', 'node'),
  ...names('method', 'Len Less Swap Push Pop WriteString WriteByte WriteRune String Reset'),
]);

export default function goCompletions(language: Language) {
  return languageCompletions(language, SKIP, [
    listSource(GLOBALS),
    memberSource({ members: MEMBERS, namespaces: NAMESPACES }),
  ]);
}
