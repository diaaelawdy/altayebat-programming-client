import { describe, expect, it } from 'vitest';
import { prune } from '@/features/threads/api';
import type { Post, RootPost } from '@/shared/types';

const post = (id: string, parentId: string | null, deleted = false) =>
  ({ id, parentId, rootId: parentId ? 'r' : null, deleted }) as Post;

describe('prune', () => {
  it('drops deleted posts with no live reply under them', () => {
    const root = { ...post('r', null, true), replies: [post('a', 'r', true), post('b', 'a', true)] };
    const kept = { ...post('k', null, true), replies: [post('m', 'k', true), post('n', 'm')] };
    const data = { pages: [{ items: [root, kept] as RootPost[], nextCursor: null }], pageParams: [] };
    const items = prune(data)!.pages[0]!.items;
    expect(items.map((r) => r.id)).toEqual(['k']);
    expect(items[0]!.replies.map((r) => r.id)).toEqual(['m', 'n']);
  });
});
