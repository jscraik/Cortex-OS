import fs from "node:fs";
import path from "node:path";
import { raspMiddleware } from "../rasp-middleware.js";

describe("RASp middleware", () => {
	const eventsDir = path.join(__dirname, "..", "test-events");
	beforeEach(() => {
		if (!fs.existsSync(eventsDir)) fs.mkdirSync(eventsDir, { recursive: true });
	});
	afterEach(() => {
		try {
			if (fs.existsSync(eventsDir))
				fs.rmSync(eventsDir, { recursive: true, force: true });
			const tmpDir = path.join(__dirname, "..", "tmp-events");
			if (fs.existsSync(tmpDir))
				fs.rmSync(tmpDir, { recursive: true, force: true });
		} catch {
			// ignore cleanup errors
		}
	});

	it("emits auth failure events and quarantines when threshold exceeded", async () => {
		const mw = raspMiddleware({ eventsDir, threshold: 2, failClosed: true });
		const req = { ip: "1.2.3.4", authFailed: true, path: "/a" };
		const res = { status: (s) => ({ json: (b) => ({ status: s, body: b }) }) };
		const next = () => { };

		await mw(req, res, next);
		const out2 = await mw(req, res, next);
		const files = fs.readdirSync(eventsDir);
		expect(files.length).toBeGreaterThanOrEqual(2);
		expect(out2.status).toBe(403);
	});

	it("quarantines when threshold exceeded in fail-closed mode", async () => {
		const tmpDir = path.join(__dirname, "..", "tmp-events");
		const mw = raspMiddleware({
			eventsDir: tmpDir,
			failClosed: true,
			threshold: 1,
		});
		const req = { authFailed: true, ip: "5.6.7.8", path: "/b" };
		const res = {
			status(code) {
				this._code = code;
				return this;
			},
			json(obj) {
				this._body = obj;
				return this;
			},
		};
		await mw(req, res, () => { });
		const files = fs.existsSync(tmpDir) ? fs.readdirSync(tmpDir) : [];
		expect(res._code).toBe(403);
		expect(res._body).toEqual({ error: "quarantined" });
		expect(files.length).toBeGreaterThanOrEqual(2); // auth_failure + quarantine
	});
});
