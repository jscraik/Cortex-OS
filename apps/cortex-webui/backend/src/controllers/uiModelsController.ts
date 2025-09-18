import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Request, Response } from 'express';

interface ModelsConfig {
	chat_models?: Record<string, { label?: string } | null>;
	default_models?: { chat?: string | null };
}

export async function getUiModels(_req: Request, res: Response) {
	try {
		const candidates = [
			path.join(process.cwd(), 'config', 'mlx-models.json'),
			path.join(process.cwd(), 'apps', 'cortex-webui', 'config', 'mlx-models.json'),
		];
		let cfg: ModelsConfig = { chat_models: {}, default_models: { chat: null } };
		for (const p of candidates) {
			try {
				const txt = await fs.readFile(p, 'utf8');
				cfg = JSON.parse(txt) as ModelsConfig;
				break;
			} catch {
				// Ignore file read errors and try next candidate
			}
		}

		const models = Object.entries(cfg.chat_models || {}).map(([key, v]) => {
			let label = key;
			if (v && typeof v === 'object') {
				const maybeLabel = (v as Record<string, unknown>).label;
				if (typeof maybeLabel === 'string' && maybeLabel.trim()) {
					label = maybeLabel;
				}
			}
			return { id: key, label };
		});

		const def: string | null =
			typeof cfg?.default_models?.chat === 'string' && cfg.default_models.chat?.trim()
				? cfg.default_models.chat
				: null;

		res.json({ models, default: def });
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		res.status(500).json({ models: [], default: null, error: message });
	}
}
