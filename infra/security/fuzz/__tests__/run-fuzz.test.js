import fs from 'fs';
import nock from 'nock';
import path from 'path';
import { runFuzz } from '../run-fuzz.js';

describe('fuzz runner', () => {
  const outFile = path.join(__dirname, 'tmp-fuzz-results.json');
  afterEach(() => {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    nock.cleanAll();
  });

  it('writes results and returns statuses on success', async () => {
    const scope = nock('http://localhost:3000').post('/api/test').times(3).reply(200, { ok: true });

    const results = await runFuzz({
      target: 'http://localhost:3000/api/test',
      iterations: 3,
      out: outFile,
      payloadGenerator: () => ({ ok: true }),
    });
    expect(results.length).toBe(3);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(fs.existsSync(outFile)).toBe(true);
    scope.done();
  });

  it('captures network errors', async () => {
    // no nock endpoint -> network error
    const results = await runFuzz({
      target: 'http://localhost:9999/api/test',
      iterations: 2,
      out: outFile,
    });
    expect(results.length).toBe(2);
    expect(results.some((r) => r.error)).toBe(true);
  });
});
