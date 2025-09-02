import { check, sleep } from "k6";
import http from "k6/http";

export const options = { vus: 5, duration: "30s" };

export default function () {
	const url = `${__ENV.BASE_URL || "http://localhost:3333"}/mcp`;
	const payload = JSON.stringify({
		config: {
			seed: 1,
			maxTokens: 128,
			timeoutMs: 1000,
			memory: { maxItems: 10, maxBytes: 2048 },
		},
		request: { tool: "echo", args: { x: 1 } },
		json: true,
	});
	const params = { headers: { "Content-Type": "application/json" } };
	const res = http.post(url, payload, params);
	check(res, { "status is 200": (r) => r.status === 200 });
	sleep(1);
}
