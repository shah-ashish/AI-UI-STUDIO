import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/server.js';

describe('Express REST API Endpoints', () => {
  let server;
  let port;
  let baseUrl;

  before(async () => {
    // Start temporary test server on an ephemeral port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/health should respond with 200 and health info', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok('model' in data);
    assert.ok('baseUrl' in data);
  });

  it('GET /api/projects should return project list', async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(Array.isArray(data.projects));
  });

  it('GET /api/session/:id/usage should return session usage', async () => {
    const testSession = 'api_test_session';
    const res = await fetch(`${baseUrl}/api/session/${testSession}/usage`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.usage);
    assert.equal(typeof data.usage.research.used, 'number');
  });

  it('POST /api/session/reset should reset session usage', async () => {
    const res = await fetch(`${baseUrl}/api/session/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'api_test_session' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.usage.research.used, 0);
  });

  it('POST /api/chat with empty message should return 400', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test', message: '' }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Message is required/);
  });
});
