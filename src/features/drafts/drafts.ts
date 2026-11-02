import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { useMe } from '@/features/auth/useMe';

export type DraftKind = 'question' | 'company';

export interface Draft<T = unknown> {
  id: string;
  kind: DraftKind;
  name: string;
  data: T;
  updatedAt: string;
}

const EVENT = 'mk-drafts';
const keyFor = (userId: string) => `mk:drafts:${userId}`;
const rand = (n: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) =>
    'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(b % 36),
  ).join('');

/** Draft name: the title, else the name it already had, else `draft_xxxxx`. */
export function draftName(title: string, previous?: string) {
  return title.trim().slice(0, 80) || previous || `draft_${rand(5)}`;
}

/**
 * Unfinished questions and company suggestions, saved on this device per account.
 * Every hook instance stays in sync through a window event.
 */
export function useDrafts<T = unknown>(kind?: DraftKind) {
  const { me } = useMe();
  const key = me ? keyFor(me.id) : null;
  const read = useCallback(() => (key ? storage.get<Draft[]>(key, []) : []), [key]);
  const [all, setAll] = useState<Draft[]>(read);

  useEffect(() => {
    setAll(read());
    const sync = () => setAll(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [read]);

  const write = useCallback(
    (next: Draft[]) => {
      if (!key) return;
      storage.set(key, next);
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  /** Creates or updates a draft and returns its id. */
  const save = useCallback(
    (k: DraftKind, data: T, title: string, id?: string | null) => {
      const current = read();
      const prev = id ? current.find((d) => d.id === id) : undefined;
      const draft: Draft = {
        id: prev?.id ?? rand(10),
        kind: k,
        name: draftName(title, prev?.name),
        data,
        updatedAt: new Date().toISOString(),
      };
      write([draft, ...current.filter((d) => d.id !== draft.id)]);
      return draft.id;
    },
    [read, write],
  );
  const remove = useCallback(
    (id: string) => write(read().filter((d) => d.id !== id)),
    [read, write],
  );
  const get = useCallback(
    (id: string | null) =>
      id ? (read().find((d) => d.id === id) as Draft<T> | undefined) : undefined,
    [read],
  );

  const items = (kind ? all.filter((d) => d.kind === kind) : all) as Draft<T>[];
  return { items, save, remove, get, enabled: Boolean(key) };
}

export const draftLink = (d: Pick<Draft, 'id' | 'kind'>) =>
  d.kind === 'question' ? `/contribute?draft=${d.id}` : `/companies?draft=${d.id}`;
