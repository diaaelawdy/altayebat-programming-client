import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Code2, Eraser, Send } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import { useDebounced, useInViewOnce } from '@/lib/hooks';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/features/auth/Can';
import { LANGUAGES, type Lang } from './languages';

const CodeEditor = lazy(() => import('./CodeEditor'));

interface Draft {
  lang: Lang;
  code: string;
  notes: string;
}

/**
 * Write-only practice editor. Nothing is executed — solutions are posted to the
 * answers thread where the community discusses and votes on them.
 */
export function SolutionEditor({
  questionId,
  defaultLang = 'python',
  onPosted,
}: {
  questionId: string;
  defaultLang?: Lang;
  onPosted?: () => void;
}) {
  const { t } = useI18n();
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const key = `mk.draft.${questionId}`;
  const [draft, setDraft] = useState<Draft>(() =>
    storage.get<Draft>(key, {
      lang: storage.get<Lang>('mk.lang', defaultLang),
      code: '',
      notes: '',
    }),
  );
  const saved = useDebounced(draft, 500);
  // The editor chunk (~100 KB gz) loads only when the panel nears the viewport.
  const [panelRef, visible] = useInViewOnce<HTMLDivElement>();

  useEffect(() => {
    if (saved.code || saved.notes) storage.set(key, saved);
    else storage.remove(key);
    storage.set('mk.lang', saved.lang);
  }, [saved, key]);

  const post = useMutation({
    mutationFn: () => {
      const body = [
        draft.notes.trim(),
        draft.code.trim() && `\`\`\`${draft.lang}\n${draft.code.trimEnd()}\n\`\`\``,
      ]
        .filter(Boolean)
        .join('\n\n');
      return api.post(`/questions/${questionId}/answers`, { body });
    },
    onSuccess: () => {
      setDraft((d) => ({ ...d, code: '', notes: '' }));
      storage.remove(key);
      void qc.invalidateQueries({ queryKey: ['answers', questionId] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      toast(t('common.saved'));
      onPosted?.();
    },
  });

  return (
    <section
      aria-labelledby="editor-title"
      className="border-border bg-surface overflow-hidden rounded-2xl border"
    >
      <header className="border-border flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Code2 size={18} className="text-accent" />
        <div className="min-w-0 flex-1">
          <h2 id="editor-title" className="font-semibold">
            {t('editor.title')}
          </h2>
          <p className="text-subtle text-xs">{t('editor.subtitle')}</p>
        </div>
        <Select
          value={draft.lang}
          onChange={(e) => setDraft((d) => ({ ...d, lang: e.target.value as Lang }))}
          aria-label={t('editor.language')}
          className="w-36 py-1.5"
        >
          {Object.entries(LANGUAGES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </header>
      <div ref={panelRef} className="h-80 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
        {visible ? (
          <Suspense fallback={<EditorSkeleton label={t('editor.loading')} />}>
            <CodeEditor
              value={draft.code}
              onChange={(code) => setDraft((d) => ({ ...d, code }))}
              lang={draft.lang}
              placeholder="# …"
            />
          </Suspense>
        ) : (
          <EditorSkeleton label={t('editor.loading')} />
        )}
      </div>
      <div className="border-border space-y-3 border-t p-4">
        <Textarea
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          placeholder={t('editor.notes')}
          className="min-h-20"
        />
        <div className="flex items-center gap-2">
          {(draft.code || draft.notes) && (
            <span className="text-subtle text-xs">{t('editor.draftSaved')}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => setDraft((d) => ({ ...d, code: '', notes: '' }))}
            disabled={!draft.code && !draft.notes}
          >
            <Eraser size={14} /> {t('editor.reset')}
          </Button>
          {can('answers.create') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => post.mutate()}
              loading={post.isPending}
              disabled={!draft.code.trim() && !draft.notes.trim()}
            >
              <Send size={14} className="rtl:-scale-x-100" /> {t('editor.post')}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function EditorSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-2 p-4" aria-label={label}>
      {['w-3/5', 'w-4/5', 'w-2/5', 'w-3/4'].map((w) => (
        <Skeleton key={w} className={`h-4 ${w}`} />
      ))}
    </div>
  );
}
