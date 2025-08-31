import http from 'k6/http';
import { check } from 'k6';

function envNum(name, fallback) {
  const v = __ENV[name];
  return v ? Number(v) : fallback;
}

const P95_MS = envNum('P95_MS', 400);
const ERROR_RATE_MAX = envNum('ERROR_RATE_MAX', 0.01);
const STAGE1 = __ENV.STAGE1 || '1m:20';
const STAGE2 = __ENV.STAGE2 || '3m:50';
const STAGE3 = __ENV.STAGE3 || '1m:0';

function stageSpec(s) {
  const [duration, target] = s.split(':');
  return { duration, target: Number(target) };
}

export const options = {
  stages: [stageSpec(STAGE1), stageSpec(STAGE2), stageSpec(STAGE3)],
  thresholds: {
    http_req_failed: [`rate<${ERROR_RATE_MAX}`],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export default function () {
  const url = `${__ENV.BASE_URL || 'http://localhost:3333'}/rag`;
  const payload = JSON.stringify({
    config: { seed: 1, maxTokens: 128, timeoutMs: 1000, memory: { maxItems: 100, maxBytes: 16384 } },
    query: { query: 'test', topK: 3 },
    json: true,
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(url, payload, params);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
