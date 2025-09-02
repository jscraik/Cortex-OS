#!/usr/bin/env node
/**
 * Write an MLX config JSON to a target path.
 * Usage: node setup-mlx-config.mjs --profile echo|recommended --out ./mlx.json
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const argv = process.argv.slice(2);
const getArg = (name, fallback) => {
	const idx = argv.indexOf(`--${name}`);
	return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : fallback;
};

const profile = getArg("profile", "echo");
const out = getArg("out", "./mlx.json");

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");

const src =
	profile === "recommended"
		? path.join(root, "config", "mlx.recommended.json")
		: path.join(root, "config", "mlx.echo.json");

if (!fs.existsSync(src)) {
	console.error(`Config template not found: ${src}`);
	process.exit(2);
}

const content = fs.readFileSync(src, "utf-8");
fs.writeFileSync(path.resolve(out), content);
console.log(`✅ Wrote MLX config (${profile}) to: ${path.resolve(out)}`);
