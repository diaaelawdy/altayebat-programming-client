import { useEffect, useState } from 'react';
import { Textarea } from './Field';
import { Markdown } from './Markdown';
import { Segmented } from './Tabs';
import { loadMarkdown } from '@/lib/highlight';
import { useI18n } from '@/i18n';

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  id,
  minRows = 5,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  minRows?: number;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (tab !== 'preview') return;
    let alive = true;
    void loadMarkdown().then((render) => alive && setHtml(render(value)));
    return () => {
      alive = false;
    };
  }, [tab, value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { value: 'write', label: t('common.write') },
            { value: 'preview', label: t('common.preview') },
          ]}
        />
        <span className="text-subtle hidden text-xs sm:block">{t('thread.markdownHint')}</span>
      </div>
      {tab === 'write' ? (
        <Textarea
          id={id}
          value={value}
          autoFocus={autoFocus}
          rows={minRows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (onSubmit && (e.metaKey || e.ctrlKey) && e.key === 'Enter') onSubmit();
          }}
          className="font-[inherit]"
        />
      ) : (
        <div className="border-border bg-surface-2 min-h-28 rounded-xl border px-4 py-3">
          {value.trim() ? (
            <Markdown html={html} />
          ) : (
            <p className="text-subtle text-sm">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
