import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { apiFetch } from '~/api/client';
import { ApiError, RESPONSE_VALIDATION_FAILED } from '~/api/errors';

import { server } from '../setup/msw/server';

const schema = z.object({ id: z.number(), title: z.string() });

describe('apiFetch', () => {
  it('returns parsed data when the response matches the schema', async () => {
    server.use(
      http.get('https://api.test/thing', () =>
        HttpResponse.json({ id: 1, title: 'ok', extra: 'stripped' }),
      ),
    );

    await expect(apiFetch('/thing', { schema })).resolves.toEqual({
      id: 1,
      title: 'ok',
    });
  });

  it('drops empty, null and undefined search params from the URL', async () => {
    let requestedUrl = '';

    server.use(
      http.get('https://api.test/search', ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ id: 1, title: 'ok' });
      }),
    );

    await apiFetch('/search', {
      schema,
      searchParams: { q: 'phone', page: 2, empty: '', missing: undefined },
    });

    expect(requestedUrl).toContain('q=phone');
    expect(requestedUrl).toContain('page=2');
    expect(requestedUrl).not.toContain('empty');
    expect(requestedUrl).not.toContain('missing');
  });

  it('throws an ApiError carrying the status when the server returns 404', async () => {
    server.use(
      http.get('https://api.test/thing', () =>
        HttpResponse.json({ message: 'Not here' }, { status: 404 }),
      ),
    );

    const error = await apiFetch('/thing', { schema }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe('Not here');
  });

  it('exposes field-level errors from the response body as details', async () => {
    server.use(
      http.post('https://api.test/thing', () =>
        HttpResponse.json(
          {
            message: 'Invalid',
            errors: { email: ['taken'], name: 'required' },
          },
          { status: 422 },
        ),
      ),
    );

    const error = (await apiFetch('/thing', {
      method: 'POST',
      body: {},
    }).catch((caught: unknown) => caught)) as ApiError;

    expect(error.details).toEqual({ email: ['taken'], name: ['required'] });
  });

  it('throws a validation ApiError when a 200 response has the wrong shape', async () => {
    server.use(
      http.get('https://api.test/thing', () =>
        HttpResponse.json({ id: 'not-a-number' }),
      ),
    );

    const error = (await apiFetch('/thing', { schema }).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(RESPONSE_VALIDATION_FAILED);
    expect(error.status).toBe(200);
  });

  it('reports a transport failure as status 0 rather than letting it escape raw', async () => {
    server.use(http.get('https://api.test/thing', () => HttpResponse.error()));

    const error = (await apiFetch('/thing', { schema }).catch(
      (caught: unknown) => caught,
    )) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe('TRANSPORT');
  });

  it('sends a JSON content-type when a body is passed', async () => {
    let contentType: string | null = null;

    server.use(
      http.post('https://api.test/thing', ({ request }) => {
        contentType = request.headers.get('content-type');
        return HttpResponse.json({ id: 1, title: 'ok' });
      }),
    );

    await apiFetch('/thing', { method: 'POST', body: { a: 1 }, schema });

    expect(contentType).toBe('application/json');
  });

  it('returns the raw payload untouched when no schema is given', async () => {
    server.use(
      http.get('https://api.test/thing', () =>
        HttpResponse.json({ anything: true }),
      ),
    );

    await expect(apiFetch('/thing')).resolves.toEqual({ anything: true });
  });

  it('resolves to null for a 204 response', async () => {
    server.use(
      http.delete(
        'https://api.test/thing',
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(apiFetch('/thing', { method: 'DELETE' })).resolves.toBeNull();
  });
});
