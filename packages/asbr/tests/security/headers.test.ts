import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type ASBRServer, createASBRServer } from "@/api/server.js";

describe("security headers", () => {
	let server: ASBRServer;

	beforeAll(async () => {
		server = createASBRServer({ port: 7442 });
		await server.start();
	});

	afterAll(async () => {
		await server.stop();
	});

	it("omits HSTS on HTTP", async () => {
		const res = await request(server.app).get("/health");
		expect(res.headers["strict-transport-security"]).toBeUndefined();
	});
});
