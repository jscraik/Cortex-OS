import { Command } from "commander";

export const evalGate = new Command("gate")
	.description("Run Cortex-OS evaluation gate across suites")
	.option(
		"--config <path>",
		"Path to eval config JSON",
		".cortex/eval.config.json",
	)
	.option("--json", "Output JSON only", false)
	.action(async (opts: unknown) => {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const { runGate } = await import("@cortex-os/evals");

		const cfgPath = path.resolve(String(opts.config));
		const raw = await fs.readFile(cfgPath, "utf8");
		const cfg = JSON.parse(raw);

		// Convenience: if a dataset path is present, load it as JSON
		if (cfg.dataset && typeof cfg.dataset === "string") {
			const dsPath = path.resolve(cfg.dataset);
			const dsRaw = await fs.readFile(dsPath, "utf8");
			cfg.dataset = JSON.parse(dsRaw);
		}
		// Per-suite dataset override support
		for (const s of cfg.suites ?? []) {
			if (s?.options?.dataset && typeof s.options.dataset === "string") {
				const dsPath = path.resolve(String(s.options.dataset));
				const dsRaw = await fs.readFile(dsPath, "utf8");
				s.options.dataset = JSON.parse(dsRaw);
			}
		}

		const result = await runGate(cfg);
		if (opts.json) {
			process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
		} else {
			const head = `Cortex-OS Eval Gate: ${result.pass ? "PASS" : "FAIL"}`;
			process.stdout.write(`${head}\n`);
			for (const o of result.outcomes) {
				const m = Object.entries(o.metrics)
					.map(
						([k, v]) =>
							`${k}=${typeof v === "number" ? (v.toFixed?.(3) ?? v) : v}`,
					)
					.join(" ");
				process.stdout.write(
					` - ${o.name}: ${o.pass ? "PASS" : "FAIL"} ${m}\n`,
				);
			}
		}
		process.exitCode = result.pass ? 0 : 1;
	});

// no default export
