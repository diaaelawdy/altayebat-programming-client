import type { Language } from '@codemirror/language';
import { LEETCODE, languageCompletions, listSource, memberSource, names, unique } from './common';

// lang-javascript already completes keywords, snippets and names in the file (JS and TS).

const SKIP = ['LineComment', 'BlockComment', 'String', 'TemplateString', 'RegExp'];

const GLOBALS = [
  ...names('class', 'Array Map Set WeakMap Object String Number BigInt Promise Symbol'),
  ...names('namespace', 'Math JSON console'),
  ...names('constant', 'Infinity NaN'),
  ...names('function', 'parseInt parseFloat'),
  ...LEETCODE,
];

const NAMESPACES = {
  'Math.': [
    ...names(
      'function',
      'max min abs floor ceil round trunc sqrt cbrt pow sign log log2 log10 random hypot',
    ),
    ...names('constant', 'PI E'),
  ],
  'Number.': [
    ...names(
      'constant',
      'MAX_SAFE_INTEGER MIN_SAFE_INTEGER POSITIVE_INFINITY NEGATIVE_INFINITY EPSILON',
    ),
    ...names('function', 'isInteger isNaN parseInt parseFloat'),
  ],
  'Object.': names('function', 'keys values entries assign fromEntries freeze create'),
  'Array.': names('function', 'from isArray of'),
  'JSON.': names('function', 'stringify parse'),
  'console.': names('function', 'log error warn table'),
  'String.': names('function', 'fromCharCode'),
};

/** Array, Map/Set and string methods (no type info, so all of them). */
const MEMBERS = unique([
  ...names(
    'method',
    'push pop shift unshift slice splice map filter reduce forEach find findIndex findLast ' +
      'some every includes indexOf lastIndexOf join sort reverse concat fill flat flatMap at',
  ),
  ...names('method', 'keys values entries get set has delete add clear'),
  ...names(
    'method',
    'charAt charCodeAt codePointAt split substring toUpperCase toLowerCase trim startsWith ' +
      'endsWith repeat padStart padEnd localeCompare toString toFixed',
  ),
  ...names('property', 'length size'),
  ...names('property', 'val next left right', 'node'),
]);

export default function javascriptCompletions(language: Language) {
  return languageCompletions(language, SKIP, [
    listSource(GLOBALS),
    memberSource({ members: MEMBERS, namespaces: NAMESPACES }),
  ]);
}
