import { snippetCompletion } from '@codemirror/autocomplete';
import type { Language } from '@codemirror/language';
import { languageCompletions, listSource, wordSource } from './common';

// lang-sql already completes keywords. This adds functions (cursor lands inside the parentheses)
// and words from the query, so table and column names come back once typed.

const SKIP = ['LineComment', 'BlockComment', 'String', 'QuotedIdentifier'];

const FUNCTIONS = (
  'COUNT SUM AVG MIN MAX COALESCE IFNULL NULLIF ROUND ABS CEIL FLOOR MOD POWER LENGTH ' +
  'CHAR_LENGTH CONCAT CONCAT_WS SUBSTRING LEFT RIGHT UPPER LOWER TRIM REPLACE DATE DATEDIFF ' +
  'DATE_ADD DATE_SUB DATE_FORMAT YEAR MONTH DAY NOW CAST IF ROW_NUMBER RANK DENSE_RANK NTILE ' +
  'LAG LEAD FIRST_VALUE LAST_VALUE GROUP_CONCAT'
)
  .split(' ')
  .map((name) => snippetCompletion(`${name}(\${})`, { label: name, type: 'function' }));

export default function sqlCompletions(language: Language) {
  return languageCompletions(language, SKIP, [listSource(FUNCTIONS), wordSource]);
}
