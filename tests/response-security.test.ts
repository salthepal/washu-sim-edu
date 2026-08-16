import assert from 'node:assert/strict';
import test from 'node:test';
import { csvEscape, responseWriteAllowed, type RateLimiter } from '../src/lib/responseSecurity.ts';

function limiter(success: boolean, keys: string[]): RateLimiter {
  return {
    async limit({ key }) {
      keys.push(key);
      return { success };
    },
  };
}

test('response writes require both the client and learner limits to pass', async () => {
  const keys: string[] = [];
  const request = new Request('https://edu.wuemsim.org/api/responses', {
    headers: { 'cf-connecting-ip': '203.0.113.7' },
  });

  assert.equal(
    await responseWriteAllowed(request, 'anonymous:learner', limiter(true, keys), limiter(false, keys)),
    false,
  );
  assert.deepEqual(keys, ['response-ip:203.0.113.7', 'response-learner:anonymous:learner']);
});

test('CSV cells that can execute as formulas are emitted as text', () => {
  assert.equal(csvEscape('=HYPERLINK("https://example.test")'), '"\'=HYPERLINK(""https://example.test"")"');
  assert.equal(csvEscape('  +1+1'), '"\'  +1+1"');
  assert.equal(csvEscape('ordinary "quoted" response'), '"ordinary ""quoted"" response"');
});
