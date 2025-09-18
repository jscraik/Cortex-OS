import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
	vus: Number(__ENV.VUS || 2),
	duration: __ENV.DURATION || '15s',
	thresholds: {
		http_req_failed: [`rate<${__ENV.ERROR_RATE_MAX || 0.05}`],
		http_req_duration: [`p(95)<${__ENV.P95_MS || 800}`],
	},
};

export default function () {
	const url = `${__ENV.BASE_URL || 'http://localhost:3333'}/mcp`;
	const payload = JSON.stringify({
		config: {
			seed: 1,
			maxTokens: 64,
			timeoutMs: 1000,
			memory: { maxItems: 10, maxBytes: 2048 },
		},
		request: { tool: 'echo', args: { x: 1 } },
		json: true,
	});
	const res = http.post(url, payload, {
		headers: { 'Content-Type': 'application/json' },
	});
	check(res, { ok: (r) => r.status === 200 });
	sleep(1);
}
