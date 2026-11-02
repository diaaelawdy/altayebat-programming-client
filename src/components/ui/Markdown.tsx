import { memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { loadHighlighter } from '@/lib/highlight';

/**
 * Renders HTML that the server already sanitized (and the client sanitizes for
 * previews), then highlights code blocks once the highlighter lazy-loads.
 */
export const Markdown = memo(function Markdown({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const blocks = el.querySelectorAll<HTMLElement>('pre code');
    if (!blocks.length) return;
    let cancelled = false;
    void loadHighlighter().then((hljs) => {
      if (cancelled) return;
      blocks.forEach((b) => {
        if (b.dataset.highlighted) return;
        const lang = /language-([\w+#-]+)/.exec(b.className)?.[1];
        const known = lang && hljs.getLanguage(lang);
        b.innerHTML = known
          ? hljs.highlight(b.textContent ?? '', { language: lang }).value
          : hljs.highlightAuto(b.textContent ?? '').value;
        b.dataset.highlighted = 'yes';
      });
    });
    return () => {
      cancelled = true;
    };
  }, [html]);
  return (
    <div
      ref={ref}
      className={cn('prose-mk text-[15px]', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
