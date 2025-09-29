// Pure helper functions for budget threshold parsing and enforcement.
// Kept independent from indexing implementations for lightweight unit testing.

/* eslint-disable-next-line sonarjs/cognitive-complexity */
export function parseVariantThresholds(s) {
	const out = {};
	if (!s) return out;
	for (const part of String(s).split(',')) {
		const [k, v] = part.split(':').map((x) => x.trim());
		if (!k || v == null) continue;
		const n = parseFloat(v);
		if (Number.isFinite(n)) out[k] = n;
	}
	return out;
}

function checkGlobalBudgets(
	r,
	{ memBudgetMB, cpuBudgetMs, minRecallPct, minMap, peakRssBudgetMB },
) {
	const msgs = [];
	if (r.hnswLatency != null && r.speedup < 10) {
		msgs.push(
			`[budget] Expected >10x speedup, got ${r.speedup.toFixed(2)}x (N=${r.N}, ef=${r.efSearch})`,
		);
	}
	if (r.overlapPct != null && 100 - r.overlapPct > 5) {
		msgs.push(
			`[budget] Expected <5% accuracy drop, got ${(100 - r.overlapPct).toFixed(1)}% (N=${r.N}, ef=${r.efSearch})`,
		);
	}
	if (minRecallPct != null && r.recallHnsw != null && r.recallHnsw < minRecallPct) {
		msgs.push(
			`[budget] Recall ${r.recallHnsw.toFixed(1)}% below minRecallPct=${minRecallPct} (N=${r.N}, ef=${r.efSearch})`,
		);
	}
	if (minMap != null && r.mapHnsw != null && r.mapHnsw < minMap) {
		msgs.push(
			`[budget] mAP ${r.mapHnsw.toFixed(3)} below minMap=${minMap} (N=${r.N}, ef=${r.efSearch})`,
		);
	}
	if (memBudgetMB != null && r.memAfterQueries / 1e6 > memBudgetMB) {
		msgs.push(
			`[budget] RSS ${(r.memAfterQueries / 1e6).toFixed(1)}MB exceeds memBudgetMB=${memBudgetMB} (N=${r.N}, ef=${r.efSearch})`,
		);
	}
	if (cpuBudgetMs != null && r.cpuDeltaMs > cpuBudgetMs) {
		msgs.push(
			`[budget] CPU ${r.cpuDeltaMs.toFixed(1)}ms exceeds cpuBudgetMs=${cpuBudgetMs} (N=${r.N}, ef=${r.efSearch})`,
		);
	}
	if (
		peakRssBudgetMB != null &&
		typeof r.peakRss === 'number' &&
		r.peakRss / 1e6 > peakRssBudgetMB
	) {
		msgs.push(
			`[budget] Peak RSS ${(r.peakRss / 1e6).toFixed(1)}MB exceeds peakRssBudgetMB=${peakRssBudgetMB} (N=${r.N}, ef=${r.efSearch})`,
		);
	}
	return msgs;
}

function checkPerVariantBudgets(
	r,
	{ perVariantRecall = {}, perVariantMap = {}, failOnMissingVariant = false },
) {
	const msgs = [];
	const checks = [
		{ key: 'hnsw', rec: r.recallHnsw, map: r.mapHnsw },
		{ key: 'scalarQ', rec: r.recallScalarQ, map: r.mapScalarQ },
		{ key: 'pq', rec: r.recallPQ, map: r.mapPQ },
		{ key: 'hnswScalar', rec: r.recallHnswScalar, map: r.mapHnswScalar },
		{ key: 'hnswPQ', rec: r.recallHnswPQ, map: r.mapHnswPQ },
	];
	for (const c of checks) {
		const rThresh = perVariantRecall[c.key];
		const mThresh = perVariantMap[c.key];
		if (rThresh != null && typeof c.rec !== 'number' && failOnMissingVariant) {
			msgs.push(
				`[budget] Missing recall metric for variant=${c.key} while threshold is set (N=${r.N}, ef=${r.efSearch})`,
			);
		}
		if (mThresh != null && typeof c.map !== 'number' && failOnMissingVariant) {
			msgs.push(
				`[budget] Missing mAP metric for variant=${c.key} while threshold is set (N=${r.N}, ef=${r.efSearch})`,
			);
		}
		if (rThresh != null && typeof c.rec === 'number' && c.rec < rThresh) {
			msgs.push(
				`[budget] Recall(${c.key}) ${c.rec.toFixed(1)}% below per-variant min=${rThresh} (N=${r.N}, ef=${r.efSearch})`,
			);
		}
		if (mThresh != null && typeof c.map === 'number' && c.map < mThresh) {
			msgs.push(
				`[budget] mAP(${c.key}) ${c.map.toFixed(3)} below per-variant min=${mThresh} (N=${r.N}, ef=${r.efSearch})`,
			);
		}
	}
	return msgs;
}

export function collectBudgetViolations(results, opts) {
	const {
		memBudgetMB,
		cpuBudgetMs,
		minRecallPct,
		minMap,
		peakRssBudgetMB,
		perVariantRecall = {},
		perVariantMap = {},
		failOnMissingVariant = false,
		pqMinCompressionRatio = null,
		estimateFlatBytes = null,
		pqMaxColdLoadMs = null,
	} = opts || {};
	const violations = [];
	for (const r of results) {
		violations.push(
			...checkGlobalBudgets(r, { memBudgetMB, cpuBudgetMs, minRecallPct, minMap, peakRssBudgetMB }),
			...checkPerVariantBudgets(r, { perVariantRecall, perVariantMap, failOnMissingVariant }),
		);
		if (
			pqMinCompressionRatio != null &&
			typeof r.onDiskBytesPQ === 'number' &&
			typeof r.N === 'number' &&
			typeof r.dim === 'number' &&
			typeof estimateFlatBytes === 'function'
		) {
			const flatBytes = estimateFlatBytes(r.N, r.dim);
			if (flatBytes > 0) {
				const ratio = flatBytes / (r.onDiskBytesPQ || Number.POSITIVE_INFINITY);
				if (ratio < pqMinCompressionRatio) {
					violations.push(
						`[budget] PQ compression ratio ${ratio.toFixed(2)}x below minimum ${pqMinCompressionRatio}x (N=${r.N}, dim=${r.dim})`,
					);
				}
			}
		}
		if (
			pqMaxColdLoadMs != null &&
			typeof r.coldLoadMsPQ === 'number' &&
			r.coldLoadMsPQ > pqMaxColdLoadMs
		) {
			violations.push(
				`[budget] PQ cold-load ${r.coldLoadMsPQ.toFixed(1)}ms exceeds pqMaxColdLoadMs=${pqMaxColdLoadMs}ms (N=${r.N})`,
			);
		}
	}
	return violations;
}
