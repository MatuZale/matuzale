import { request } from 'node:http';
import { test, expect } from '@playwright/test';
import { checkSpringCadence } from './spring-cadence.js';

// Runs once in the Node worker (this file belongs only to chromium-desktop),
// without adding browser cases or consuming extra rendering time in the VM.
test.beforeAll(() => { checkSpringCadence(); });

// Raw request paths intentionally bypass URL normalization in browser/API clients.
function response(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: 4173, path, method }, res => {
      let bytes = 0;
      res.on('data', chunk => { bytes += chunk.length; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, bytes }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('Static server serves public assets and rejects private paths and traversal', async ({}, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'The same Node server is shared by all four projects.');
  for (const path of ['/cards.html', '/index.html', '/js/deck.js', '/css/deck.css', '/assets/deck/clifford.webp']) {
    const result = await response(path);
    expect(result.status, path).toBe(200);
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.headers['x-content-type-options']).toBe('nosniff');
  }
  for (const path of [
    '/.env', '/.env.local', '/.env.production', '/.git/config', '/.agent-input/ui-package.json',
    '/.agent-output/render.json', '/node_modules/playwright/package.json', '/tests/server.js',
    '/package.json', '/package-lock.json', '/playwright.config.js', '/assets/.DS_Store',
    '/assets/../package.json', '/assets/%2e%2e/package.json', '/assets/%252e%252e/package.json',
    '/assets/%2e%2e%2f.git/config', '/assets/%5c..%5cpackage.json', '/js/%00deck.js', '//js/deck.js',
  ]) {
    expect((await response(path)).status, path).toBe(404);
  }
  expect((await response('/%zz')).status).toBe(400);
  expect((await response('/cards.html', 'POST')).status).toBe(405);
  const head = await response('/cards.html', 'HEAD');
  expect(head.status).toBe(200);
  expect(head.bytes).toBe(0);
  expect(Number(head.headers['content-length'])).toBeGreaterThan(0);
});
