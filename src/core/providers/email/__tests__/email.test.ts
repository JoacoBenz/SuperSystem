import { describe, it, expect, vi } from 'vitest';
import { logEmailProvider } from '../log.provider';
import { resendEmailProvider } from '../resend.provider';

describe('email providers', () => {
  it('log provider records and succeeds without network', async () => {
    const r = await logEmailProvider.send({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' });
    expect(r.ok).toBe(true);
    expect(r.provider).toBe('log');
  });

  it('resend provider POSTs and returns ok on 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 're_1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const r = await resendEmailProvider('key', 'from@x.com').send({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' });
    expect(r.ok).toBe(true);
    expect(r.id).toBe('re_1');
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
    vi.unstubAllGlobals();
  });

  it('resend provider returns ok:false on HTTP error (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const r = await resendEmailProvider('key', 'from@x.com').send({ to: 'a@b.com', subject: 'Hi', html: 'x' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('401');
    vi.unstubAllGlobals();
  });
});
