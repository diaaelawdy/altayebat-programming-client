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

// lang-java has no completions of its own, so this file provides all of them.

const SKIP = ['LineComment', 'BlockComment', 'StringLiteral', 'CharacterLiteral', 'TextBlock'];

const GLOBALS = [
  ...names(
    'keyword',
    'abstract boolean break byte case catch char class continue default do double else enum ' +
      'extends final finally float for if implements import instanceof int interface long new ' +
      'null package private protected public return short static super switch this throw ' +
      'throws try var void while true false',
  ),
  ...names(
    'class',
    'String Integer Long Double Character Boolean Object Math List ArrayList LinkedList Map ' +
      'HashMap TreeMap LinkedHashMap Set HashSet TreeSet LinkedHashSet Queue Deque ArrayDeque ' +
      'PriorityQueue Stack Arrays Collections StringBuilder Iterator Comparator Collectors System',
  ),
  ...LEETCODE,
  snip('psvm', 'main method', 'public static void main(String[] args) \\{\n\t${}\n\\}'),
  snip('sout', 'print line', 'System.out.println(${});'),
  snip('fori', 'index loop', 'for (int ${i} = 0; ${i} < ${n}; ${i}++) \\{\n\t${}\n\\}'),
  snip('foreach', 'for-each loop', 'for (${int} ${x} : ${nums}) \\{\n\t${}\n\\}'),
  snip('while', 'while loop', 'while (${condition}) \\{\n\t${}\n\\}'),
];

const NAMESPACES = {
  'Math.': names(
    'method',
    'max min abs pow sqrt floor ceil round random log log10 floorDiv floorMod',
  ),
  'Arrays.': names(
    'method',
    'sort fill asList stream copyOf copyOfRange equals toString binarySearch',
  ),
  'Collections.': names(
    'method',
    'sort reverse max min swap frequency emptyList unmodifiableList nCopies reverseOrder',
  ),
  'Integer.': [
    ...names('constant', 'MAX_VALUE MIN_VALUE'),
    ...names('method', 'parseInt valueOf toString toBinaryString bitCount compare'),
  ],
  'Long.': [...names('constant', 'MAX_VALUE MIN_VALUE'), ...names('method', 'parseLong valueOf')],
  'Double.': [...names('constant', 'MAX_VALUE MIN_VALUE'), ...names('method', 'parseDouble')],
  'Character.': names(
    'method',
    'isDigit isLetter isLetterOrDigit isUpperCase isLowerCase isWhitespace toUpperCase ' +
      'toLowerCase getNumericValue',
  ),
  'String.': names('method', 'valueOf join format'),
  'System.': [
    ...names('property', 'out in err'),
    ...names('method', 'currentTimeMillis nanoTime arraycopy'),
  ],
  'out.': names('method', 'println print printf'),
  'Collectors.': names('method', 'toList toSet joining groupingBy counting'),
};

/** String, collection and StringBuilder methods (no type info, so all of them). */
const MEMBERS = unique([
  ...names(
    'method',
    'charAt substring indexOf lastIndexOf equals equalsIgnoreCase isEmpty toCharArray split ' +
      'trim strip contains startsWith endsWith toLowerCase toUpperCase compareTo replace chars ' +
      'repeat',
  ),
  ...names(
    'method',
    'add get set size remove clear addAll put getOrDefault containsKey containsValue keySet ' +
      'values entrySet putIfAbsent computeIfAbsent merge offer poll peek push pop offerFirst ' +
      'offerLast pollFirst pollLast peekFirst peekLast addFirst addLast removeFirst removeLast ' +
      'getFirst getLast firstKey lastKey floorKey ceilingKey higherKey lowerKey getKey getValue ' +
      'iterator hasNext next stream sort forEach toArray',
  ),
  ...names('method', 'append insert reverse deleteCharAt setCharAt setLength toString'),
  ...names('method', 'hashCode intValue'),
  ...names('property', 'length', 'array length'),
  ...names('property', 'val left right', 'node'),
]);

export default function javaCompletions(language: Language) {
  return languageCompletions(language, SKIP, [
    listSource(GLOBALS),
    memberSource({ members: MEMBERS, namespaces: NAMESPACES }),
    wordSource,
  ]);
}
