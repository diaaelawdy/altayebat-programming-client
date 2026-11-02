import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { buildTree } from '@/features/threads/tree';
import { Thread } from '@/features/threads/Thread';
import { feedbackThread } from '@/features/threads/api';
import type { Post } from '@/shared/types';
import { makeMe, renderApp } from './utils';

const post = (id: string, parentId: string | null, depth: number, user: string): Post => ({
  id,
  parentId,
  rootId: parentId ? 'r' : null,
  depth,
  author: { id: user, username: user, reputation: 0, role: null, avatar: null },
  body: `body ${id}`,
  bodyHtml: `<p>body ${id}</p>`,
  score: 0,
  replyCount: 0,
  myVote: 0,
  deleted: false,
  createdAt: '2026-10-01T00:00:00Z',
  edited: false,
});

describe('comment tree', () => {
  it('nests replies under their parents', () => {
    const tree = buildTree('r', 'alice', [
      post('a', 'r', 1, 'bob'),
      post('b', 'a', 2, 'carol'),
      post('c', 'r', 1, 'dave'),
    ]);
    expect(tree.map((n) => n.id)).toEqual(['a', 'c']);
    expect(tree[0]!.children.map((n) => n.id)).toEqual(['b']);
    expect(tree[0]!.children[0]!.parentAuthor).toBe('bob');
    expect(tree[0]!.parentAuthor).toBe('alice');
  });

  it('starts with replies hidden at every level; opening one level keeps the next closed', async () => {
    const replies = [1, 2, 3, 4, 5, 6].map((d) =>
      post(`p${d}`, d === 1 ? 'r' : `p${d - 1}`, d, `user${d}`),
    );
    const root = { ...post('r', null, 0, 'alice'), replies };
    renderApp(
      <Thread cfg={feedbackThread('noon')} title="Feedback" emptyText="empty" placeholder="…" />,
      {
        me: makeMe(['comments.create', 'answers.vote']),
        routes: { '/companies/noon/comments': { items: [root], nextCursor: null } },
      },
    );
    expect(await screen.findByText('body r')).toBeInTheDocument();
    expect(screen.queryByText('body p1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show 6 replies' }));
    expect(await screen.findByText('body p1')).toBeInTheDocument();
    expect(screen.queryByText('body p2')).not.toBeInTheDocument();
    for (let n = 5; n >= 1; n--)
      await userEvent.click(
        screen.getByRole('button', { name: n === 1 ? 'Show 1 reply' : `Show ${n} replies` }),
      );
    expect(await screen.findByText('body p6')).toBeInTheDocument();
    // Every reply says whose post it answers, at any depth.
    expect(screen.getByText(/replying to @alice/)).toBeInTheDocument();
    expect(screen.getByText(/replying to @user2/)).toBeInTheDocument();
    expect(screen.getByText(/replying to @user5/)).toBeInTheDocument();
    const article = screen.getByText('body r').closest('article')!;
    expect(within(article).getAllByRole('button', { name: 'Upvote' })).toHaveLength(7);

    // Hiding user2's branch hides its 4 nested replies; opened branches are remembered.
    await userEvent.click(screen.getByRole('button', { name: 'Hide 4 replies' }));
    await waitFor(() => expect(screen.queryByText('body p6')).not.toBeInTheDocument());
    expect(screen.getByText('body p2')).toBeInTheDocument();
    expect(window.localStorage.getItem('mk:expanded-replies')).toContain('p3');
    expect(window.localStorage.getItem('mk:expanded-replies')).not.toContain('p2');
    window.localStorage.removeItem('mk:expanded-replies');
  });

  it('shows deleted posts as a placeholder without author', async () => {
    const root = {
      ...post('r2', null, 0, 'alice'),
      replies: [
        { ...post('x', 'r2', 1, 'bob'), deleted: true, author: null, body: '', bodyHtml: '' },
      ],
    };
    renderApp(
      <Thread cfg={feedbackThread('noon')} title="Feedback" emptyText="empty" placeholder="…" />,
      {
        routes: { '/companies/noon/comments': { items: [root], nextCursor: null } },
      },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Show 1 reply' }));
    expect(await screen.findByText('[deleted]')).toBeInTheDocument();
    expect(screen.queryByText('@bob')).not.toBeInTheDocument();
  });
});
