import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { keys } from '@/lib/keys';
import { PreferencesProvider } from '@/theme/PreferencesProvider';
import { draftName } from '@/features/drafts/drafts';
import { useUnsavedGuard } from '@/features/drafts/UnsavedGuard';

// Data-router navigations build a `Request` with jsdom's AbortSignal, which Node's
// Request rejects. Drop the signal in this file; nothing here needs to abort.
const NodeRequest = globalThis.Request;
vi.stubGlobal(
  'Request',
  class extends NodeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const { signal: _signal, ...rest } = init ?? {};
      super(input, rest);
    }
  },
);

function Form({ saveDraft }: { saveDraft: () => void }) {
  const guard = useUnsavedGuard({ dirty: true, saveDraft });
  return (
    <>
      <Link to="/elsewhere">leave</Link>
      {guard.dialog}
    </>
  );
}

function setup() {
  const saveDraft = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/', element: <Form saveDraft={saveDraft} /> },
      { path: '/elsewhere', element: <p>elsewhere page</p> },
    ],
    { initialEntries: ['/'] },
  );
  const qc = new QueryClient();
  qc.setQueryData(keys.me, { user: null });
  render(
    <QueryClientProvider client={qc}>
      <PreferencesProvider>
        <RouterProvider router={router} />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return { saveDraft, router };
}

describe('drafts', () => {
  it('names drafts after the title, else draft_ + 5 random characters', () => {
    expect(draftName('  Two Sum  ')).toBe('Two Sum');
    expect(draftName('', 'draft_ab12c')).toBe('draft_ab12c');
    expect(draftName('')).toMatch(/^draft_[a-z0-9]{5}$/);
  });

  it('asks before leaving with unsaved work: keep editing stays', async () => {
    const { saveDraft, router } = setup();
    await userEvent.click(screen.getByText('leave'));
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /keep editing/i }));
    expect(router.state.location.pathname).toBe('/');
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('save as draft saves, then leaves', async () => {
    const { saveDraft } = setup();
    await userEvent.click(screen.getByText('leave'));
    await userEvent.click(await screen.findByRole('button', { name: /save as draft/i }));
    expect(saveDraft).toHaveBeenCalledOnce();
    expect(await screen.findByText('elsewhere page')).toBeInTheDocument();
  });

  it('discard leaves without saving', async () => {
    const { saveDraft } = setup();
    await userEvent.click(screen.getByText('leave'));
    await userEvent.click(await screen.findByRole('button', { name: /discard/i }));
    expect(saveDraft).not.toHaveBeenCalled();
    expect(await screen.findByText('elsewhere page')).toBeInTheDocument();
  });
});
