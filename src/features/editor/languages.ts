/** Labels only — the heavy CodeMirror language packs load with the editor chunk. */
export const LANGUAGES = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  cpp: 'C++',
  go: 'Go',
  sql: 'SQL',
} as const;
export type Lang = keyof typeof LANGUAGES;
