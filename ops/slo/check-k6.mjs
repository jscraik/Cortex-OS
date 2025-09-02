#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";

function loadJson(p) {
	return JSON.parse(readFileSync(resolve(p), "utf8"));
}
function loadYaml(p) {
	return YAML.parse(readFileSync(resolve(p), "utf8"));
}

function getMetric(summary, name) {
	const m = summary.metrics?.[name];
	if (!m) throw new Error(`Metric not found: ${name}`);
	return m;
}

function checkSLO(summary, sloCfg) {
	// We cannot map per-route from k6 here; use global http_req metrics
	const p95 = getMetric(summary, "http_req_duration").values["p(95)"];
	const failRate = getMetric(summary, "http_req_failed").values.rate;
	const limitP95 = Number(process.env.P95_MS || sloCfg?.mcp?.p95_ms || 400);
	const limitFail = Number(
		process.env.ERROR_RATE_MAX || sloCfg?.mcp?.error_rate || 0.01,
	);
	const ok = p95 <= limitP95 && failRate <= limitFail;
	return { ok, p95, failRate, limitP95, limitFail };
}

function checkBudget(summary, budgetCfg, profile = "quick") {
	const _iters = getMetric(summary, "iterations");
	const req = getMetric(summary, "http_reqs");
	const dur = getMetric(summary, "http_req_duration");
	const totalReq = req.values.count;
	const avg = dur.values.avg;
	const totalMs = avg * totalReq;
	const limits = budgetCfg?.[profile] || {
		max_total_req: Infinity,
		max_total_duration_ms: Infinity,
	};
	const ok =
		totalReq <= limits.max_total_req && totalMs <= limits.max_total_duration_ms;
	return { ok, totalReq, totalMs, limits };
}

function main() {
	const file = process.argv[2] || "k6-summary.json";
	const profile = process.env.PROFILE || "quick";
	const summary = loadJson(file);
	const slo = loadYaml(".slo.yml")?.slo;
	const budget = loadYaml(".budget.yml")?.budgets;
	const sloRes = checkSLO(summary, slo);
	const budRes = checkBudget(summary, budget, profile);
	console.log(JSON.stringify({ slo: sloRes, budget: budRes }, null, 2));
	if (!sloRes.ok || !budRes.ok) process.exit(1);
}

main();
