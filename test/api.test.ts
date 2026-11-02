import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setApiHooks } from '@/lib/api';

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const warning = () =>
  reply(422, {
    error: { code: 'profanity_warning', message: 'x', details: { words: ['idiot'] } },
  });

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setApiHooks({ confirmProfanity: undefined, translate: undefined });
  });

  it('asks before sending mild profanity, then resends with the acknowledgement', async () => {
    document.cookie = 'mk_csrf=t';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(warning())
      .mockResolvedValueOnce(reply(201, { id: '1' }));
    vi.stubGlobal('fetch', fetchMock);
    const confirm = vi.fn().mockResolvedValue(true);
    setApiHooks({ confirmProfanity: confirm });

    expect(await api.post('/companies/noon/comments', { body: 'idiot' })).toEqual({ id: '1' });
    expect(confirm).toHaveBeenCalledWith(['idiot']);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      body: 'idiot',
      acknowledgeProfanity: true,
    });
  });

  it('cancelling stops silently; known error codes are translated', async () => {
    document.cookie = 'mk_csrf=t';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(warning())
        .mockResolvedValueOnce(
          reply(403, { error: { code: 'vpn', message: 'Turn off your VPN' } }),
        ),
    );
    setApiHooks({
      confirmProfanity: async () => false,
      translate: (code) => (code === 'vpn' ? 'اقفل الـ VPN' : undefined),
    });
    await expect(api.post('/x', { body: 'idiot' })).rejects.toMatchObject({
      code: 'cancelled',
      message: '',
    });
    const err = await api.post('/x', {}).catch((e: ApiError) => e);
    expect(err).toMatchObject({ code: 'vpn', message: 'اقفل الـ VPN' });
  });
});
