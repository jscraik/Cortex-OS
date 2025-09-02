#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

type Score = { name: string; weight: number; score: number; notes: string[] };
type Report = {
	timestamp: string;
	overall: number;
	scores: Score[];
	findings: Record<string, unknown>;
};

mkdirSync(".artifacts", { recursive: true });

function run(cmd: string) {
	try {
		return execSync(cmd, { stdio: "pipe" }).toString();
	} catch (e) {
		if (
			typeof e === "object" &&
			e !== null &&
			"stdout" in e &&
			typeof (e as unknown).stdout === "object"
		) {
			return (
				(e as { stdout?: Buffer }).stdout?.toString() ?? (e as Error).message
			);
		}
		return (e as Error).message;
	}
}

const findings: Record<string, unknown> = {};
findings.eslint = run("pnpm -s lint");
findings.ts = run("pnpm -s typecheck");
findings.depgraph = run("pnpm -s depgraph");
findings.unused = run("pnpm -s unused");
findings.circles = run("pnpm -s circles");
run("pnpm -s vulns");
findings.vulns = JSON.parse(run("cat .artifacts/osv.json || echo '{}'"));

const scores: Score[] = [
	{
		name: "Security",
		weight: 0.2,
		score: (findings.vulns as unknown)?.results ? 2 : 3,
		notes: [],
	},
	{
		name: "CodeQuality",
		weight: 0.15,
		score: /0 problems/.test(findings.eslint as string) ? 4.5 : 3,
		notes: [],
	},
	{
		name: "TypeSafety",
		weight: 0.1,
		score: /error TS/.test(findings.ts as string) ? 2.5 : 4,
		notes: [],
	},
	{
		name: "Architecture",
		weight: 0.15,
		score: /violations: 0/.test(findings.depgraph as string) ? 4 : 3,
		notes: [],
	},
	{
		name: "Tests",
		weight: 0.15,
		score: 3,
		notes: ["Wire coverage into aggregator"],
	},
	{
		name: "A11y",
		weight: 0.1,
		score: 3,
		notes: ["Run axe on UI builds if present"],
	},
	{ name: "DXDocs", weight: 0.05, score: 3, notes: [] },
	{ name: "ReleaseEng", weight: 0.05, score: 3.5, notes: [] },
	{ name: "SupplyChainCI", weight: 0.05, score: 3.5, notes: [] },
];

const overall = Number(
	scores.reduce((s, x) => s + x.score * x.weight, 0).toFixed(2),
);
const report: Report = {
	timestamp: new Date().toISOString(),
	overall,
	scores,
	findings,
};
writeFileSync(".artifacts/review.report.json", JSON.stringify(report, null, 2));
console.log(
	JSON.stringify(
		{ overall, by: Object.fromEntries(scores.map((s) => [s.name, s.score])) },
		null,
		2,
	),
);
