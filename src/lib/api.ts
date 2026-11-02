const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { fieldErrors?: Record<string, string[]> },
  ) {
    super(message);
  }
}

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1];
}

/**
 * Hooks the UI registers (see ApiBridge): localized messages for known error codes,
 * and the "your text has insults, send anyway?" confirmation.
 */
const hooks: {
  translate?: (code: string) => string | undefined;
  confirmProfanity?: (words: string[]) => Promise<boolean>;
} = {};
export const setApiHooks = (h: typeof hooks) => Object.assign(hooks, h);

let csrfPromise: Promise<string> | null = null;
async function csrfToken() {
  const fromCookie = readCookie('mk_csrf');
  if (fromCookie) return fromCookie;
  csrfPromise ??= fetch(`${BASE}/auth/csrf`, { credentials: 'include' })
    .then((r) => r.json())
    .then((b: { token: string }) => b.token)
    .finally(() => (csrfPromise = null));
  return csrfPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error ?? {};
    const code: string = e.code ?? 'error';
    // Mild profanity: ask once, then resend with the acknowledgement.
    if (
      code === 'profanity_warning' &&
      body &&
      typeof body === 'object' &&
      hooks.confirmProfanity
    ) {
      if (await hooks.confirmProfanity(e.details?.words ?? []))
        return request<T>(method, path, { ...body, acknowledgeProfanity: true }, signal);
      throw new ApiError(res.status, 'cancelled', '');
    }
    const message = hooks.translate?.(code) ?? e.message ?? res.statusText;
    throw new ApiError(res.status, code, message, e.details);
  }
  return data as T;
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
