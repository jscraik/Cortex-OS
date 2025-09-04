#!/usr/bin/env tsx
import { exec } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

type Score = { name: string; weight: number; score: number; notes: string[] };
type Report = {
	timestamp: string;
	overall: number;
	scores: Score[];
	findings: Record<string, unknown>;
};

mkdirSync(".artifacts", { recursive: true });

const execAsync = promisify(exec);

type CmdResult = { ok: boolean; stdout: string; stderr: string };

function normalize(output: string) {
        const MAX_LEN = 2000;
        const trimmed = output.trim().replace(/\r\n/g, "\n");
        return trimmed.length > MAX_LEN ? `${trimmed.slice(0, MAX_LEN)}...` : trimmed;
}

async function run(cmd: string): Promise<CmdResult> {
        try {
                const { stdout, stderr } = await execAsync(cmd, {
                        maxBuffer: 10 * 1024 * 1024,
                });
                return { ok: true, stdout: normalize(stdout), stderr: normalize(stderr) };
        } catch (e) {
                const err = e as { stdout?: string; stderr?: string; message: string };
                return {
                        ok: false,
                        stdout: normalize(err.stdout ?? ""),
                        stderr: normalize(err.stderr ?? err.message),
                };
        }
}

async function main() {
        const findings: Record<string, unknown> = {};
        const eslint = await run("pnpm -s lint");
        findings.eslint = eslint;
        const ts = await run("pnpm -s typecheck");
        findings.ts = ts;
        const depgraph = await run("pnpm -s depgraph");
        findings.depgraph = depgraph;
        const unused = await run("pnpm -s unused");
        findings.unused = unused;
        const circles = await run("pnpm -s circles");
        findings.circles = circles;
        await run("pnpm -s vulns");
        let vulns: unknown = {};
        try {
                vulns = JSON.parse(readFileSync(".artifacts/osv.json", "utf8"));
        } catch {
                // file not present; keep empty object
        }
        findings.vulns = vulns;

        const scores: Score[] = [
                {
                        name: "Security",
                        weight: 0.2,
                        score: (vulns as Record<string, unknown>)?.results ? 2 : 3,
                        notes: [],
                },
                {
                        name: "CodeQuality",
                        weight: 0.15,
                        score: /0 problems/.test(eslint.stdout) ? 4.5 : 3,
                        notes: [],
                },
                {
                        name: "TypeSafety",
                        weight: 0.1,
                        score: /error TS/.test(ts.stdout) ? 2.5 : 4,
                        notes: [],
                },
                {
                        name: "Architecture",
                        weight: 0.15,
                        score: /violations: 0/.test(depgraph.stdout) ? 4 : 3,
                        notes: [],
                },
                { name: "Tests", weight: 0.15, score: 3, notes: ["Wire coverage into aggregator"] },
                { name: "A11y", weight: 0.1, score: 3, notes: ["Run axe on UI builds if present"] },
                { name: "DXDocs", weight: 0.05, score: 3, notes: [] },
                { name: "ReleaseEng", weight: 0.05, score: 3.5, notes: [] },
                { name: "SupplyChainCI", weight: 0.05, score: 3.5, notes: [] },
        ];

        const weightTotal = scores.reduce((sum, s) => sum + s.weight, 0);
        if (Math.abs(weightTotal - 1) > 1e-6) {
                throw new Error(`Score weights must sum to 1 (got ${weightTotal})`);
        }

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
        // eslint-disable-next-line no-console
        console.log(
                JSON.stringify(
                        { overall, by: Object.fromEntries(scores.map((s) => [s.name, s.score])) },
                        null,
                        2,
                ),
        );
}

void main();
