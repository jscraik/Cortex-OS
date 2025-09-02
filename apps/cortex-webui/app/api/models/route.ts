import { promises as fs } from "node:fs";
import * as path from "node:path";

// Read MLX chat models as a starting point for the UI model picker.
// Align shape with UI expectations: { id, label } minimal contract.
export async function GET() {
	try {
		const cfgPath = path.join(process.cwd(), "config", "mlx-models.json");
		const txt = await fs.readFile(cfgPath, "utf8");
		const cfg = JSON.parse(txt);

		const models = Object.entries(cfg.chat_models || {}).map(
			([key, v]: [string, unknown]) => {
				let label = key;
				if (v && typeof v === "object") {
					const maybeLabel = (v as Record<string, unknown>).label;
					if (typeof maybeLabel === "string" && maybeLabel.trim()) {
						label = maybeLabel;
					}
				}
				return { id: key, label };
			},
		);

		const def = cfg.default_models?.chat ?? null;

		return new Response(JSON.stringify({ models, default: def }), {
			headers: { "content-type": "application/json" },
		});
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		return new Response(JSON.stringify({ models: [], error: message }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}
}
