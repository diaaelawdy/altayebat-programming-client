import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { PreferencesProvider } from '@/theme/PreferencesProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { keys } from '@/lib/keys';
import type { Me, MeResponse } from '@/shared/types';
import type { Permission } from '@/shared/permissions';

export function makeMe(permissions: Permission[] = [], extra: Partial<Me> = {}): MeResponse {
  return {
    user: {
      id: 'u1',
      username: 'quiet_owl',
      reputation: 10,
      role: { name: 'Member', kind: 'member' },
      avatar: 'ghost:violet',
      restriction: null,
      unreadMessages: 0,
      badges: [],
      streak: { current: 2, longest: 5, lastDay: null },
      stats: {},
      preferences: { locale: 'en', mode: 'dark', accent: null, dark: {}, light: {} },
      permissions,
      isFounder: false,
      unreadNotifications: 0,
      joinedAt: '2026-01',
      ...extra,
    },
  };
}

/** Renders with providers; `me` seeds the /me cache, `routes` maps fetch paths to JSON. */
export function renderApp(
  ui: ReactNode,
  opts: {
    me?: MeResponse | null;
    path?: string;
    route?: string;
    routes?: Record<string, unknown>;
  } = {},
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  qc.setQueryData(keys.me, opts.me ?? { user: null });
  const routes = opts.routes ?? {};
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace(/^\/api/, '');
    const hit = Object.entries(routes).find(
      ([k]) => k === path || (k.endsWith('*') && path.startsWith(k.slice(0, -1))),
    );
    return new Response(JSON.stringify(hit ? hit[1] : {}), {
      status: hit ? 200 : 404,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  const result = render(
    <QueryClientProvider client={qc}>
      <PreferencesProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[opts.path ?? '/']}>
            <Routes>
              <Route path={opts.route ?? '*'} element={ui} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return { ...result, qc, fetchMock };
}
