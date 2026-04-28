import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './app';

describe('createApp', () => {
  it('GET /api/health возвращает OK', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.status, 'OK');
    assert.equal(typeof res.body.timestamp, 'string');
  });

  it('GET /api/integrations/quote проксирует ответ внешнего API', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({ content: 'Тестовая цитата', author: 'Автор' }),
      }) as Response) as unknown as typeof fetch;
    try {
      const app = createApp();
      const res = await request(app).get('/api/integrations/quote').expect(200);
      assert.equal(res.body.success, true);
      assert.deepEqual(res.body.quote, { text: 'Тестовая цитата', author: 'Автор' });
      assert.equal(res.body.source, 'api.quotable.io');
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('GET /api/unknown возвращает 404 JSON', async () => {
    const app = createApp();
    const res = await request(app).get('/api/no-such-route').expect(404);
    assert.equal(res.body.success, false);
  });

  it('GET /api/integrations/quote при !ok от внешнего API → 502', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        ok: false,
        json: async () => ({}),
      }) as Response) as unknown as typeof fetch;
    try {
      const app = createApp();
      const res = await request(app).get('/api/integrations/quote').expect(502);
      assert.equal(res.body.success, false);
      assert.match(res.body.error?.message || '', /не удалось|недоступн/i);
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('GET /api/integrations/quote при неполном JSON → 502', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({ content: 'Только текст' }),
      }) as Response) as unknown as typeof fetch;
    try {
      const app = createApp();
      const res = await request(app).get('/api/integrations/quote').expect(502);
      assert.equal(res.body.success, false);
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('GET /api/integrations/quote при падении fetch (в т.ч. AbortError) на обоих API → 502', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () => {
      const e = new Error('Aborted');
      e.name = 'AbortError';
      throw e;
    }) as unknown as typeof fetch;
    try {
      const app = createApp();
      const res = await request(app).get('/api/integrations/quote').expect(502);
      assert.equal(res.body.success, false);
      assert.match(res.body.error?.message || '', /не удалось|недоступн/i);
    } finally {
      globalThis.fetch = prev;
    }
  });
});
