import type { HLJSApi } from 'highlight.js';

let loader: Promise<HLJSApi> | null = null;

/** Lazy-loads highlight.js core with a small language set (kept out of the main bundle). */
export function loadHighlighter() {
  loader ??= (async () => {
    const [{ default: hljs }, js, ts, py, java, cpp, sql, go, bash, json, cs, kt] =
      await Promise.all([
        import('highlight.js/lib/core'),
        import('highlight.js/lib/languages/javascript'),
        import('highlight.js/lib/languages/typescript'),
        import('highlight.js/lib/languages/python'),
        import('highlight.js/lib/languages/java'),
        import('highlight.js/lib/languages/cpp'),
        import('highlight.js/lib/languages/sql'),
        import('highlight.js/lib/languages/go'),
        import('highlight.js/lib/languages/bash'),
        import('highlight.js/lib/languages/json'),
        import('highlight.js/lib/languages/csharp'),
        import('highlight.js/lib/languages/kotlin'),
      ]);
    const langs = {
      javascript: js,
      typescript: ts,
      python: py,
      java,
      cpp,
      sql,
      go,
      bash,
      json,
      csharp: cs,
      kotlin: kt,
    };
    for (const [name, mod] of Object.entries(langs)) hljs.registerLanguage(name, mod.default);
    hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
    hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
    hljs.registerAliases(['py'], { languageName: 'python' });
    hljs.registerAliases(['c++', 'c', 'cc'], { languageName: 'cpp' });
    hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' });
    hljs.registerAliases(['cs'], { languageName: 'csharp' });
    return hljs;
  })();
  return loader;
}

let mdLoader: Promise<(md: string) => string> | null = null;
/** Client-side markdown → sanitized HTML, only for live previews (published content is rendered by the server). */
export function loadMarkdown() {
  mdLoader ??= Promise.all([import('marked'), import('dompurify')]).then(
    ([{ marked }, { default: DOMPurify }]) =>
      (md: string) =>
        DOMPurify.sanitize(marked.parse(md, { async: false, gfm: true, breaks: true }) as string),
  );
  return mdLoader;
}
