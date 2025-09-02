import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Candidate, rerank } from "./reranker.ts";

let mlxServer: http.Server;
let frontierServer: http.Server;
let ollamaServer: http.Server;

let mlxHandler: http.RequestListener;
let frontierHandler: http.RequestListener;
let ollamaHandler: http.RequestListener;

const success =
	(scores: number[]): http.RequestListener =>
	(req, res) => {
		if (req.method === "POST" && req.url === "/rerank") {
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({ scores }));
		}
	};

const error: http.RequestListener = (req, res) => {
	if (req.method === "POST" && req.url === "/rerank") {
		res.statusCode = 500;
		res.end();
	}
};

beforeAll(async () => {
	mlxHandler = success([0.2, 0.8]);
	frontierHandler = success([0.6, 0.4]);
	ollamaHandler = success([0.1, 0.9]);
	mlxServer = http.createServer((req, res) => mlxHandler(req, res));
	frontierServer = http.createServer((req, res) => frontierHandler(req, res));
	ollamaServer = http.createServer((req, res) => ollamaHandler(req, res));
	await Promise.all([
		new Promise((r) => mlxServer.listen(0, r)),
		new Promise((r) => frontierServer.listen(0, r)),
		new Promise((r) => ollamaServer.listen(0, r)),
	]);
	const mlxPort = (mlxServer.address() as AddressInfo).port;
	const frontierPort = (frontierServer.address() as AddressInfo).port;
	const ollamaPort = (ollamaServer.address() as AddressInfo).port;
	process.env.MLX_SERVICE_URL = `http://127.0.0.1:${mlxPort}`;
	process.env.FRONTIER_API_URL = `http://127.0.0.1:${frontierPort}`;
	process.env.OLLAMA_API_URL = `http://127.0.0.1:${ollamaPort}`;
});

beforeEach(() => {
	mlxHandler = success([0.2, 0.8]);
	frontierHandler = success([0.6, 0.4]);
	ollamaHandler = success([0.1, 0.9]);
});

afterAll(() => {
	mlxServer.close();
	frontierServer.close();
	ollamaServer.close();
	delete process.env.MLX_SERVICE_URL;
	delete process.env.FRONTIER_API_URL;
	delete process.env.OLLAMA_API_URL;
});

describe("rerank", () => {
	it("orders candidates by score from MLX service", async () => {
		const candidates: Candidate[] = [{ text: "first" }, { text: "second" }];
		const ranked = await rerank(candidates, "query");
		expect(ranked[0].text).toBe("second");
		expect(ranked[0].score).toBeCloseTo(0.8);
		expect(ranked[1].text).toBe("first");
	});

	it("falls back to Frontier API on failure", async () => {
		mlxHandler = error;
		const candidates: Candidate[] = [{ text: "first" }, { text: "second" }];
		const ranked = await rerank(candidates, "query");
		expect(ranked[0].text).toBe("first");
		expect(ranked[0].score).toBeCloseTo(0.6);
	});

	it("falls back to Ollama when others fail", async () => {
		mlxHandler = error;
		frontierHandler = error;
		const candidates: Candidate[] = [{ text: "first" }, { text: "second" }];
		const ranked = await rerank(candidates, "query");
		expect(ranked[0].text).toBe("second");
		expect(ranked[0].score).toBeCloseTo(0.9);
	});

	it("throws on invalid input", async () => {
		await expect(rerank([], "")).rejects.toThrow();
	});
});
