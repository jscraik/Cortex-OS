#!/usr/bin/env node
import { createHash } from 'node:crypto';
/**
 * Indexing benchmark runner
 *
 * Usage examples:
 *  node packages/rag/benchmarks/indexing-bench.mjs \
 *    --sizes=10000,100000 --ef=64,128 --queries=10 --topK=10 \
 *    --variants=flat,hnsw,scalarQ,pq,hnswScalar,hnswPQ \
 *    --curveKs=1,5,10 --curveVariants=hnsw,pq,hnswScalar --curveMetrics=recall,map \
 *    --curveDefaultVariantVisibility=hnsw,pq \\
 *    --minRecallPct=95 --minMap=0.85 --reportTag=nightly
 *
 * Notes:
 *  - Budgets are only enforced when thresholds are provided (e.g., --minRecallPct, --minMap).
 *  - HTML report includes summary badges, a compact legend, and per-variant curve toggles.
 *  - Compare overlay: enable “Compare mode” in the HTML to plot two rows (Row A solid, Row B dashed).
 *  - Use --curveDefaultVariantVisibility to pre-check variants shown by default in overlay.
 *  - CSV now includes recall@K and mAP@K columns for spreadsheet analysis.
 */
import { appendFileSync, copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { FlatIndex } from '../src/indexing/flat-index.js';
import { PQFlatIndex, ScalarQuantizedFlatIndex, estimateFlatBytes } from '../src/indexing/quantized-flat.js';
import { collectBudgetViolations, parseVariantThresholds } from './budget-helpers.mjs';

async function maybeLoadHnsw() {
    try {
        const mod = await import('../src/indexing/hnsw-index.js');
        return mod.HNSWIndex;
    } catch {
        return null;
    }
}

// Seeded RNG (Mulberry32) for deterministic datasets
function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function randVec(dim, rnd) {
    return Array.from({ length: dim }, () => rnd());
}

// Removed unused cosineSim

function avg(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// Peak RSS sampler to capture highest resident set size during the run
function startPeakRssSampler(intervalMs = 150) {
    let peak = process.memoryUsage().rss;
    const timer = setInterval(() => {
        try {
            const rss = process.memoryUsage().rss;
            if (rss > peak) peak = rss;
        } catch {
            /* ignore */
        }
    }, Math.max(50, intervalMs));
    const stop = () => {
        try {
            clearInterval(timer);
        } catch {
            /* ignore */
        }
    };
    const getPeak = () => peak;
    return { stop, getPeak };
}

async function queryIndexIds(index, queries, topK) {
    const samples = [];
    const idsPerQuery = [];
    for (const q of queries) {
        const t1 = performance.now();
        const res = await index.query(q, topK);
        const t2 = performance.now();
        samples.push(t2 - t1);
        idsPerQuery.push(res.map((x) => x.id));
    }
    return { samples, idsPerQuery, latency: avg(samples) };
}

function computeMapRecall(flatIds, candidateIdsPerQuery) {
    let map = 0;
    let rec = 0;
    for (let i = 0; i < candidateIdsPerQuery.length; i++) {
        map += averagePrecision(flatIds[i], candidateIdsPerQuery[i] ?? []);
        rec += recallAtK(flatIds[i], candidateIdsPerQuery[i] ?? []);
    }
    const n = Math.max(1, candidateIdsPerQuery.length);
    return { mAP: map / n, recallK: rec / n };
}

function computeCurves(flatIds, candidateIdsPerQuery, ks) {
    const useKs = Array.isArray(ks) && ks.length ? ks : [1, 5, 10];
    const recall = [];
    const map = [];
    const n = Math.max(1, candidateIdsPerQuery.length);
    for (const k of useKs) {
        let rSum = 0;
        let mSum = 0;
        for (let i = 0; i < candidateIdsPerQuery.length; i++) {
            const cand = (candidateIdsPerQuery[i] ?? []).slice(0, k);
            rSum += recallAtK(flatIds[i].slice(0, k), cand);
            mSum += averagePrecision(flatIds[i].slice(0, k), cand);
        }
        recall.push(rSum / n);
        map.push(mSum / n);
    }
    return { recall, map };
}

// Re-export helpers for unit tests without importing heavy index modules
export { collectBudgetViolations, parseVariantThresholds } from './budget-helpers.mjs';

const DEFAULT_CFG = {
    dim: 128,
    sizes: [10000, 100000],
    queries: 5,
    topK: 10,
    efSearchValues: [32, 64, 128],
    quantization: 'none',
    report: 'reports/indexing-performance.json',
    seed: 42,
    memBudgetMB: null,
    cpuBudgetMs: null,
    peakRssBudgetMB: null,
    coldLoad: true,
    variants: ['flat', 'hnsw', 'scalarQ', 'pq', 'hnswScalar', 'hnswPQ'],
    minRecallPct: null,
    minMap: null,
    // Curve visualization controls
    curveKs: [1, 5, 10],
    curveVariants: ['hnsw', 'scalarQ', 'pq', 'hnswScalar', 'hnswPQ'],
    curveMetrics: ['recall', 'map'],
    curveDefaultVariantVisibility: [],
    reportTag: '',
    minRecallPctByVariant: {},
    minMapByVariant: {},
    failOnMissingVariant: false,
    pqMinCompressionRatio: null,
    pqMaxColdLoadMs: null,
};

const ARG_HANDLER_FACTORIES = {
    sizes: (cfg) => (v) => { cfg.sizes = (v || '').split(',').filter(Boolean).map((s) => parseInt(s, 10)); },
    dim: (cfg) => (v) => { cfg.dim = parseInt(v, 10); },
    queries: (cfg) => (v) => { cfg.queries = parseInt(v, 10); },
    topK: (cfg) => (v) => { cfg.topK = parseInt(v, 10); },
    ef: (cfg) => (v) => { cfg.efSearchValues = (v || '').split(',').filter(Boolean).map((s) => parseInt(s, 10)); },
    quant: (cfg) => (v) => { cfg.quantization = v; },
    report: (cfg) => (v) => { cfg.report = v; },
    seed: (cfg) => (v) => { cfg.seed = parseInt(v, 10); },
    memBudgetMB: (cfg) => (v) => { cfg.memBudgetMB = parseFloat(v); },
    cpuBudgetMs: (cfg) => (v) => { cfg.cpuBudgetMs = parseFloat(v); },
    peakRssBudgetMB: (cfg) => (v) => { cfg.peakRssBudgetMB = parseFloat(v); },
    variants: (cfg) => (v) => { cfg.variants = (v || '').split(',').map((s) => s.trim()).filter(Boolean); },
    minRecallPct: (cfg) => (v) => { cfg.minRecallPct = parseFloat(v); },
    minMap: (cfg) => (v) => { cfg.minMap = parseFloat(v); },
    curveKs: (cfg) => (v) => { const arr = (v || '').split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n) && n > 0); if (arr.length) cfg.curveKs = arr; },
    curveVariants: (cfg) => (v) => { const arr = (v || '').split(',').map((s) => s.trim()).filter(Boolean); if (arr.length) cfg.curveVariants = arr; },
    curveMetrics: (cfg) => (v) => { const arr = (v || '').split(',').map((s) => s.trim()).filter((s) => s === 'recall' || s === 'map'); if (arr.length) cfg.curveMetrics = arr; },
    curveDefaultVariantVisibility: (cfg) => (v) => { const arr = (v || '').split(',').map((s) => s.trim()).filter(Boolean); cfg.curveDefaultVariantVisibility = arr; },
    reportTag: (cfg) => (v) => { cfg.reportTag = (v || '').trim(); },
    minRecallPctByVariant: (cfg) => (v) => { cfg.minRecallPctByVariant = parseVariantThresholds(v); },
    minMapByVariant: (cfg) => (v) => { cfg.minMapByVariant = parseVariantThresholds(v); },
    failOnMissingVariant: (cfg) => (v) => { cfg.failOnMissingVariant = v == null ? true : String(v).toLowerCase() !== 'false'; },
    pqMinCompressionRatio: (cfg) => (v) => { cfg.pqMinCompressionRatio = parseFloat(v); },
    pqMaxColdLoadMs: (cfg) => (v) => { cfg.pqMaxColdLoadMs = parseFloat(v); },
};

function parseArgs() {
    const args = process.argv.slice(2);
    const cfg = { ...DEFAULT_CFG };
    const handlers = Object.fromEntries(
        Object.entries(ARG_HANDLER_FACTORIES).map(([k, make]) => [k, make(cfg)]),
    );
    for (const a of args) {
        if (a === '--no-cold-load') { cfg.coldLoad = false; continue; }
        if (!a.startsWith('--')) continue;
        const [key, val] = a.slice(2).split('=');
        const h = handlers[key];
        if (typeof h === 'function') h(val);
    }
    return cfg;
}

function quantizeScalar(entries) {
    if (entries.length === 0)
        return { entriesQ: [], qparams: null, originalBytes: 0, quantizedBytes: 0 };
    const dim = entries[0].vector.length;
    const min = Array(dim).fill(Infinity);
    const max = Array(dim).fill(-Infinity);
    for (const e of entries) {
        for (let i = 0; i < dim; i++) {
            const v = e.vector[i];
            if (v < min[i]) min[i] = v;
            if (v > max[i]) max[i] = v;
        }
    }
    const scale = new Array(dim);
    const zero = new Array(dim);
    for (let i = 0; i < dim; i++) {
        const range = max[i] - min[i] || 1e-9;
        scale[i] = range / 255;
        zero[i] = min[i];
    }
    const entriesQ = entries.map((e) => {
        const q = new Uint8Array(dim);
        for (let i = 0; i < dim; i++) {
            const qv = Math.max(0, Math.min(255, Math.round((e.vector[i] - zero[i]) / scale[i])));
            q[i] = qv;
        }
        return { id: e.id, q };
    });
    const originalBytes = entries.length * dim * 8;
    const quantizedBytes = entries.length * dim + dim * 8 * 2;
    return { entriesQ, qparams: { scale, zero }, originalBytes, quantizedBytes };
}

function dequantize(q, qparams) {
    const { scale, zero } = qparams;
    const vec = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) vec[i] = zero[i] + scale[i] * q[i];
    return Array.from(vec);
}

function pctOverlap(aIds, bIds) {
    const aSet = new Set(aIds);
    let count = 0;
    for (const id of bIds) if (aSet.has(id)) count++;
    return (count / Math.max(1, aIds.length)) * 100;
}

function averagePrecision(gtIds, candIds) {
    const gt = new Set(gtIds);
    let hit = 0;
    let sumPrec = 0;
    for (let i = 0; i < candIds.length; i++) {
        if (gt.has(candIds[i])) {
            hit++;
            sumPrec += hit / (i + 1);
        }
    }
    const denom = Math.max(1, Math.min(gt.size, candIds.length));
    return sumPrec / denom;
}

function recallAtK(gtIds, candIds) {
    const gt = new Set(gtIds);
    let hit = 0;
    for (const id of candIds) if (gt.has(id)) hit++;
    return (hit / Math.max(1, gt.size)) * 100;
}

// Path helpers
function expandTildePath(p) {
    if (!p) return p;
    if (p.startsWith('~')) return p.replace('~', process.env.HOME || '');
    return p;
}

function makeTimestampFolder() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}

function sanitizeTag(tag) {
    if (!tag) return '';
    return String(tag).replace(/[^a-zA-Z0-9._-]/g, '-');
}


// collectBudgetViolations now imported from helpers

function enforceBudgets(results, opts) {
    const violations = collectBudgetViolations(results, opts);
    if (violations.length) {
        for (const v of violations) console.error(v);
        process.exit(1);
    }
}

function hashConfig(cfg) {
    try {
        const json = JSON.stringify(cfg);
        return createHash('sha256').update(json).digest('hex');
    } catch {
        return '';
    }
}

/* eslint-disable-next-line sonarjs/cognitive-complexity */
async function runOnce({
    dim,
    N,
    topK,
    efSearch,
    quantization,
    rnd,
    queriesCount,
    coldLoad,
    variants,
    curveKs,
}) {
    // Begin peak memory sampling across build and query phases
    const rssSampler = startPeakRssSampler(150);
    const allVariants = ['flat', 'hnsw', 'scalarQ', 'pq', 'hnswScalar', 'hnswPQ'];
    const activeVariants = Array.isArray(variants) && variants.length ? variants : allVariants;
    const entriesRaw = Array.from({ length: N }, (_, i) => ({
        id: `id-${i}`,
        vector: randVec(dim, rnd),
    }));
    const queries = Array.from({ length: queriesCount }, () => randVec(dim, rnd));

    let entries = entriesRaw;
    if (quantization === 'scalar') {
        const { entriesQ, qparams, originalBytes, quantizedBytes } = quantizeScalar(entriesRaw);
        entries = entriesQ.map((e) => ({ id: e.id, vector: dequantize(e.q, qparams) }));
        console.log(
            `[indexing-bench] scalar quantization: ${(quantizedBytes / 1e6).toFixed(2)}MB vs ${(originalBytes / 1e6).toFixed(2)}MB (est.)`,
        );
    } else if (quantization === 'pq') {
        console.log('[indexing-bench] product quantization requested (not implemented)');
    }

    // Flat baseline
    const flat = new FlatIndex();
    await flat.init(dim);
    await flat.addBatch(entries);

    const memAfterFlatBuild = process.memoryUsage().rss;
    const heapAfterFlatBuild = process.memoryUsage().heapUsed;
    const cpuStart = process.cpuUsage();

    const flatQ = await queryIndexIds(flat, queries, topK);
    const flatLatencySamples = flatQ.samples;
    const flatIds = flatQ.idsPerQuery;
    const flatLatency = flatQ.latency;

    // HNSW setup (optional)
    const HNSWIndex = await maybeLoadHnsw();
    let hnswLatency = null;
    let hnswIds = [];
    let overlapPct = null;
    let speedup = null;
    let memAfterHnswBuild = null;
    let heapAfterHnswBuild = null;
    let memAfterQueries = null;
    let heapAfterQueries = null;
    let cpuDeltaMs = null;
    let hnswLatencySamples = [];
    if (HNSWIndex && activeVariants.includes('hnsw')) {
        const hnsw = new HNSWIndex({ space: 'cosine', M: 16, efConstruction: 200, efSearch });
        await hnsw.init(dim);
        if (quantization !== 'none') {
            console.log(
                `[indexing-bench] quantization=${quantization} requested (not implemented, proceeding unquantized)`,
            );
        }
        await hnsw.addBatch(entries);
        memAfterHnswBuild = process.memoryUsage().rss;
        heapAfterHnswBuild = process.memoryUsage().heapUsed;

        const hQ = await queryIndexIds(hnsw, queries, topK);
        hnswLatencySamples = hQ.samples;
        hnswIds = hQ.idsPerQuery;
        let overlapCount = 0;
        for (let i = 0; i < queries.length; i++) {
            const flatSet = new Set(flatIds[i]);
            overlapCount += hQ.idsPerQuery[i].filter((id) => flatSet.has(id)).length;
        }
        memAfterQueries = process.memoryUsage().rss;
        heapAfterQueries = process.memoryUsage().heapUsed;
        const cpuEnd = process.cpuUsage(cpuStart);
        cpuDeltaMs = (cpuEnd.user + cpuEnd.system) / 1000;
        hnswLatency = hQ.latency;
        overlapPct = (overlapCount / (topK * queries.length)) * 100;
        speedup = flatLatency / hnswLatency;
    }

    // Quantized flat variants
    let memAfterScalarQBuild = null;
    let heapAfterScalarQBuild = null;
    let scalarQLatency = null;
    let scalarQResults = [];
    let scalarQOverlapPct = null;
    // collected via sqQ when enabled
    let scalarQLatencySamples = [];
    if (activeVariants.includes('scalarQ')) {
        const scalarQ = new ScalarQuantizedFlatIndex();
        await scalarQ.init(dim);
        await scalarQ.addBatch(entriesRaw);
        memAfterScalarQBuild = process.memoryUsage().rss;
        heapAfterScalarQBuild = process.memoryUsage().heapUsed;
        const sqQ = await queryIndexIds(scalarQ, queries, topK);
        scalarQLatencySamples = sqQ.samples;
        scalarQResults = sqQ.idsPerQuery;
        scalarQLatency = sqQ.latency;
        let scalarQOverlapAgg = 0;
        for (let i = 0; i < queries.length; i++) {
            scalarQOverlapAgg += pctOverlap(flatIds[i], scalarQResults[i] ?? []);
        }
        scalarQOverlapPct = scalarQOverlapAgg / queries.length;
    }

    let pq;
    let memAfterPQBuild = null;
    let heapAfterPQBuild = null;
    let pqLatency = null;
    let pqResults = [];
    let pqOverlapPct = null;
    let onDiskBytesPQ = 0;
    let coldLoadMsPQ = 0;

    // samples available via pqQ when enabled
    // samples available via hsQ when enabled
    // samples available via hpQ when enabled
    let pqLatencySamples = [];
    if (activeVariants.includes('pq') || activeVariants.includes('hnswPQ')) {
        pq = new PQFlatIndex({ m: 8, k: 16, iters: 3 });
        await pq.init(dim);
        await pq.addBatch(entriesRaw);
        memAfterPQBuild = process.memoryUsage().rss;
        heapAfterPQBuild = process.memoryUsage().heapUsed;
        // If quant=pq flag is provided, persist and re-load once to measure cold-load and on-disk size
        if (quantization === 'pq') {
            const base = resolve(process.cwd(), 'reports', `pq-N${N}-dim${dim}`);
            try { mkdirSync(dirname(base), { recursive: true }); } catch { }
            const t1 = performance.now();
            await pq.save(base);
            const ids = [`${base}.pq.meta.json`, `${base}.pq.codebooks.bin`, `${base}.pq.ids.json`, `${base}.pq.codes.bin`];
            try { onDiskBytesPQ = ids.reduce((s, p) => s + statSync(p).size, 0); } catch { onDiskBytesPQ = 0; }
            const pq2 = new PQFlatIndex();
            await pq2.load(base);
            coldLoadMsPQ = performance.now() - t1;
        }
        if (activeVariants.includes('pq')) {
            const pqQ = await queryIndexIds(pq, queries, topK);
            pqLatencySamples = pqQ.samples;
            pqResults = pqQ.idsPerQuery;
            pqLatency = pqQ.latency;
            let pqOverlapAgg = 0;
            for (let i = 0; i < queries.length; i++) {
                pqOverlapAgg += pctOverlap(flatIds[i], pqResults[i] ?? []);
            }
            pqOverlapPct = pqOverlapAgg / queries.length;
        }
    }

    // Quantized-HNSW paths (build HNSW from quantized-approx vectors)
    // Scalar: reuse earlier quantization params to dequantize entries (already have entries via scalarQ path above)
    let memAfterHnswScalarBuild = null;
    let heapAfterHnswScalarBuild = null;
    let hnswScalarLatency = null;
    let hnswScalarIds = [];
    let hnswScalarOverlapPct = null;
    let speedupScalarHnsw = null;
    // collected via hsQ when enabled
    let hnswScalarIdx = null;
    let hnswScalarLatencySamples = [];
    if (HNSWIndex && activeVariants.includes('hnswScalar')) {
        const hnswScalar = new HNSWIndex({ space: 'cosine', M: 16, efConstruction: 200, efSearch });
        await hnswScalar.init(dim);
        const { entriesQ, qparams } = quantizeScalar(entriesRaw);
        const approxScalar = entriesQ.map((e) => ({ id: e.id, vector: dequantize(e.q, qparams) }));
        await hnswScalar.addBatch(approxScalar);
        hnswScalarIdx = hnswScalar;
        memAfterHnswScalarBuild = process.memoryUsage().rss;
        heapAfterHnswScalarBuild = process.memoryUsage().heapUsed;
        const hsQ = await queryIndexIds(hnswScalar, queries, topK);
        hnswScalarLatencySamples = hsQ.samples;
        hnswScalarIds = hsQ.idsPerQuery;
        let hnswScalarOverlap = 0;
        for (let i = 0; i < queries.length; i++) {
            hnswScalarOverlap += pctOverlap(flatIds[i], hnswScalarIds[i] ?? []);
        }
        hnswScalarLatency = hsQ.latency;
        hnswScalarOverlapPct = hnswScalarOverlap / queries.length;
        speedupScalarHnsw = flatLatency / hnswScalarLatency;
    }

    // PQ: reconstruct approximate vectors from codebooks and codes
    let memAfterHnswPQBuild = null;
    let heapAfterHnswPQBuild = null;
    let hnswPQLatency = null;
    let hnswPQIds = [];
    let hnswPQOverlapPct = null;
    let speedupPQHnsw = null;
    // collected via hpQ when enabled
    let hnswPQIdx = null;
    let hnswPQLatencySamples = [];
    if (HNSWIndex && pq && activeVariants.includes('hnswPQ')) {
        const hnswPQ = new HNSWIndex({ space: 'cosine', M: 16, efConstruction: 200, efSearch });
        await hnswPQ.init(dim);
        // Reconstruct PQ approximations
        const m = pq.m ?? 8;
        const subDim = pq.subDim ?? dim / m;
        const codebooks = pq.codebooks;
        const pqCodes = pq.codes;
        function reconstructPQVector(codes) {
            const vec = new Float32Array(dim);
            for (let si = 0; si < m; si++) {
                const code = codes[si];
                const centroid = codebooks[si].subarray(code * subDim, (code + 1) * subDim);
                vec.set(centroid, si * subDim);
            }
            return Array.from(vec);
        }
        const approxPQ = pqCodes.map((row) => ({ id: row.id, vector: reconstructPQVector(row.codes) }));
        await hnswPQ.addBatch(approxPQ);
        hnswPQIdx = hnswPQ;
        memAfterHnswPQBuild = process.memoryUsage().rss;
        heapAfterHnswPQBuild = process.memoryUsage().heapUsed;
        const hpQ = await queryIndexIds(hnswPQ, queries, topK);
        hnswPQLatencySamples = hpQ.samples;
        hnswPQIds = hpQ.idsPerQuery;
        let hnswPQOverlap = 0;
        for (let i = 0; i < queries.length; i++) {
            hnswPQOverlap += pctOverlap(flatIds[i], hnswPQIds[i] ?? []);
        }
        hnswPQLatency = hpQ.latency;
        hnswPQOverlapPct = hnswPQOverlap / queries.length;
        speedupPQHnsw = flatLatency / hnswPQLatency;
    }

    // Recall@K and mAP relative to flat baseline
    const hnswScores = hnswIds.length ? computeMapRecall(flatIds, hnswIds) : { mAP: null, recallK: null };
    const scalarQScores = scalarQResults.length
        ? computeMapRecall(flatIds, scalarQResults)
        : { mAP: null, recallK: null };
    const pqScores = pqResults.length ? computeMapRecall(flatIds, pqResults) : { mAP: null, recallK: null };
    const hnswScalarScores = hnswScalarIds.length
        ? computeMapRecall(flatIds, hnswScalarIds)
        : { mAP: null, recallK: null };
    const hnswPQScores = hnswPQIds.length
        ? computeMapRecall(flatIds, hnswPQIds)
        : { mAP: null, recallK: null };

    const hnswCurves = hnswIds.length
        ? computeCurves(flatIds, hnswIds, curveKs)
        : { recall: [], map: [] };
    const scalarQCurves = scalarQResults.length
        ? computeCurves(flatIds, scalarQResults, curveKs)
        : { recall: [], map: [] };
    const pqCurves = pqResults.length
        ? computeCurves(flatIds, pqResults, curveKs)
        : { recall: [], map: [] };
    const hnswScalarCurves = hnswScalarIds.length
        ? computeCurves(flatIds, hnswScalarIds, curveKs)
        : { recall: [], map: [] };
    const hnswPQCurves = hnswPQIds.length
        ? computeCurves(flatIds, hnswPQIds, curveKs)
        : { recall: [], map: [] };

    // Save/load quantized-HNSW to measure size and cold-load times
    const externalData = expandTildePath(process.env.RAG_DATA_DIR || '');
    const coldBaseDir = externalData
        ? resolve(externalData, 'indexes', 'hnsw-cold')
        : resolve(process.cwd(), 'reports', 'hnsw-cold');
    mkdirSync(coldBaseDir, { recursive: true });
    async function measureSaveLoad(idx, name) {
        const outBase = resolve(coldBaseDir, name);
        await idx.save(outBase);
        const bin = statSync(`${outBase}.bin`).size;
        const meta = statSync(`${outBase}.meta.json`).size;
        const onDisk = bin + meta;
        const start = performance.now();
        const HNSWIndex2 = await maybeLoadHnsw();
        const cold = new HNSWIndex2({});
        await cold.load(outBase);
        const loadMs = performance.now() - start;
        return { onDisk, loadMs };
    }
    let scalarSave = { onDisk: 0, loadMs: 0 };
    let pqSave = { onDisk: 0, loadMs: 0 };
    if (coldLoad) {
        if (hnswScalarIdx)
            scalarSave = await measureSaveLoad(hnswScalarIdx, `N${N}-ef${efSearch}-scalar`);
        if (hnswPQIdx) pqSave = await measureSaveLoad(hnswPQIdx, `N${N}-ef${efSearch}-pq`);
    }

    // Stop sampler and capture peak
    rssSampler.stop();
    const peakRss = rssSampler.getPeak();

    return {
        dim,
        N,
        efSearch,
        quantization,
        flatLatency,
        hnswLatency,
        overlapPct,
        speedup,
        memAfterFlatBuild,
        memAfterHnswBuild,
        memAfterQueries,
        heapAfterFlatBuild,
        heapAfterHnswBuild,
        heapAfterQueries,
        cpuDeltaMs,
        scalarQLatency,
        memAfterScalarQBuild,
        heapAfterScalarQBuild,
        scalarQOverlapPct,
        pqLatency,
        memAfterPQBuild,
        heapAfterPQBuild,
        pqOverlapPct,
        // Quantized HNSW
        hnswScalarLatency,
        hnswScalarOverlapPct,
        speedupScalarHnsw,
        memAfterHnswScalarBuild,
        heapAfterHnswScalarBuild,
        hnswPQLatency,
        hnswPQOverlapPct,
        speedupPQHnsw,
        memAfterHnswPQBuild,
        heapAfterHnswPQBuild,
        // Recall@m and mAP (relative to flat)
        recallHnsw: hnswScores.recallK,
        mapHnsw: hnswScores.mAP,
        recallScalarQ: scalarQScores.recallK,
        mapScalarQ: scalarQScores.mAP,
        recallPQ: pqScores.recallK,
        mapPQ: pqScores.mAP,
        recallHnswScalar: hnswScalarScores.recallK,
        mapHnswScalar: hnswScalarScores.mAP,
        recallHnswPQ: hnswPQScores.recallK,
        mapHnswPQ: hnswPQScores.mAP,
        // Curves (Recall@1/5/10 as %, mAP@1/5/10 as 0..1)
        recallHnswCurve: hnswCurves.recall,
        mapHnswCurve: hnswCurves.map,
        recallScalarQCurve: scalarQCurves.recall,
        mapScalarQCurve: scalarQCurves.map,
        recallPQCurve: pqCurves.recall,
        mapPQCurve: pqCurves.map,
        recallHnswScalarCurve: hnswScalarCurves.recall,
        mapHnswScalarCurve: hnswScalarCurves.map,
        recallHnswPQCurve: hnswPQCurves.recall,
        mapHnswPQCurve: hnswPQCurves.map,
        // Cold-load and on-disk size
        onDiskBytesHnswScalar: scalarSave.onDisk,
        coldLoadMsHnswScalar: scalarSave.loadMs,
        onDiskBytesHnswPQ: pqSave.onDisk,
        coldLoadMsHnswPQ: pqSave.loadMs,
        onDiskBytesPQ,
        coldLoadMsPQ,
        // Peak process RSS during runOnce
        peakRss,
        // Samples for sparklines
        flatLatencySamples,
        hnswLatencySamples,
        scalarQLatencySamples,
        pqLatencySamples,
        hnswScalarLatencySamples,
        hnswPQLatencySamples,
        skipped: hnswLatency == null,
    };
}

function logResult(out) {
    if (out.skipped) {
        console.log(
            `[indexing-bench] N=${out.N} ef=${out.efSearch} flatLatency=${out.flatLatency.toFixed(2)}ms (HNSW skipped)`,
        );
        return;
    }
    console.log(
        `[indexing-bench] N=${out.N} ef=${out.efSearch} flat=${out.flatLatency.toFixed(2)}ms hnsw=${out.hnswLatency.toFixed(2)}ms speedup=${out.speedup.toFixed(2)}x overlap=${out.overlapPct.toFixed(1)}% rssFlat=${(out.memAfterFlatBuild / 1e6).toFixed(1)}MB rssHNSW=${(out.memAfterHnswBuild / 1e6).toFixed(1)}MB rssAfterQ=${(out.memAfterQueries / 1e6).toFixed(1)}MB cpu=${out.cpuDeltaMs.toFixed(1)}ms qScalarLat=${out.scalarQLatency.toFixed(2)}ms qScalarOv=${out.scalarQOverlapPct.toFixed(1)}% rssQScalar=${(out.memAfterScalarQBuild / 1e6).toFixed(1)}MB qPQLat=${out.pqLatency.toFixed(2)}ms qPQOv=${out.pqOverlapPct.toFixed(1)}% rssPQ=${(out.memAfterPQBuild / 1e6).toFixed(1)}MB hnswQScalar=${out.hnswScalarLatency.toFixed(2)}ms ov=${out.hnswScalarOverlapPct.toFixed(1)}% spd=${out.speedupScalarHnsw.toFixed(2)}x rss=${(out.memAfterHnswScalarBuild / 1e6).toFixed(1)}MB hnswQPQ=${out.hnswPQLatency.toFixed(2)}ms ov=${out.hnswPQOverlapPct.toFixed(1)}% spd=${out.speedupPQHnsw.toFixed(2)}x rss=${(out.memAfterHnswPQBuild / 1e6).toFixed(1)}MB`,
    );
}


/* eslint-disable-next-line sonarjs/cognitive-complexity */
async function run() {
    const cfg = parseArgs();
    const rnd = mulberry32(cfg.seed);
    const results = await runAllConfigs(cfg, rnd);
    postBudgets(results, cfg);
    const outPath = writeJsonReport(cfg, results);

    // Write HTML summary (inline JSON)
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Indexing Benchmark Report</title>
<style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px}th{background:#f5f5f5;text-align:left}code{background:#f7f7f7;padding:2px 4px;border-radius:3px}.spark{height:30px;width:100px}.heat{height:20px;width:100px}.badge{display:inline-block;padding:2px 6px;border-radius:10px;font-size:12px;margin-right:6px}.pass{background:#d3f9d8;color:#2b8a3e;border:1px solid #2b8a3e}.fail{background:#ffe3e3;color:#c92a2a;border:1px solid #c92a2a}.muted{background:#f1f3f5;color:#495057;border:1px solid #adb5bd}.legend{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0}.sw{display:inline-block;width:10px;height:10px;margin-right:4px;border-radius:2px;vertical-align:middle}.legend-row{display:flex;gap:16px;align-items:center;margin:6px 0}.line-sample{display:inline-block;width:26px;height:0;border-top:2px solid #333;vertical-align:middle}.line-dashed{border-top-style:dashed}</style>
</head><body>
<h1>Indexing Benchmark Report</h1>
<p>Config: <code>${JSON.stringify(cfg)}</code></p>
<script>const data=${JSON.stringify({ config: cfg, results })};</script>
<div id="summary"></div>
<div id="curveViewer"></div>
<div id="report"></div>
<script>
// localStorage helpers
const LS_KEY='idxBenchUI';
function loadUI(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); }catch{ return {}; } }
function saveUI(state){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch{} }
function getState(){ return loadUI(); }
function setState(patch){ const s=getState(); saveUI({ ...s, ...patch }); }

// Summary badges
const summaryEl=document.getElementById('summary');
const ranAny = (data.results||[]).some(r=>!r.skipped);
const minRecall = data.config.minRecallPct;
const minMap = data.config.minMap;
const recallVals = data.results.filter(r=>!r.skipped && typeof r.recallHnsw==='number').map(r=>r.recallHnsw);
const mapVals = data.results.filter(r=>!r.skipped && typeof r.mapHnsw==='number').map(r=>r.mapHnsw);
const recallMin = recallVals.length ? Math.min(...recallVals) : null;
const mapMin = mapVals.length ? Math.min(...mapVals) : null;
function badge(text,cls){const b=document.createElement('span');b.className='badge '+cls;b.textContent=text;return b}
const wrap=document.createElement('div');
wrap.appendChild(document.createTextNode('Thresholds: '));
if(minRecall!=null){wrap.appendChild(badge('Recall≥'+minRecall+'% '+(recallMin!=null?('min='+recallMin.toFixed(1)+'%'):'n/a'), (recallMin==null? 'muted': (recallMin>=minRecall?'pass':'fail'))));}
else{wrap.appendChild(badge('Recall not set','muted'))}
if(minMap!=null){wrap.appendChild(badge('mAP≥'+minMap+' '+(mapMin!=null?('min='+mapMin.toFixed(3)):'n/a'), (mapMin==null? 'muted': (mapMin>=minMap?'pass':'fail'))));}
else{wrap.appendChild(badge('mAP not set','muted'))}
// Peak RSS and resource badges
try {
    const peakVals = (data.results||[]).filter(r=>!r.skipped && typeof r.peakRss==='number').map(r=>r.peakRss/1e6);
    const peakMax = peakVals.length? Math.max(...peakVals): null;
    const rssBudget = data.config.peakRssBudgetMB;
    if (rssBudget!=null) {
        wrap.appendChild(badge('Peak RSS≤'+rssBudget+'MB '+(peakMax!=null?('max='+(peakMax).toFixed(1)+'MB'):'n/a'), (peakMax==null? 'muted': (peakMax<=rssBudget?'pass':'fail'))));
    } else {
        wrap.appendChild(badge('Peak RSS not set','muted'));
    }
    const cpuVals = (data.results||[]).filter(r=>!r.skipped && typeof r.cpuDeltaMs==='number').map(r=>r.cpuDeltaMs);
    const cpuMax = cpuVals.length? Math.max(...cpuVals): null;
    wrap.appendChild(badge('CPU max '+(cpuMax!=null? cpuMax.toFixed(1)+'ms':'n/a'),'muted'));
    const memAfterQ = (data.results||[]).filter(r=>!r.skipped && typeof r.memAfterQueries==='number').map(r=>r.memAfterQueries/1e6);
    const memMax = memAfterQ.length? Math.max(...memAfterQ): null;
    wrap.appendChild(badge('RSS@afterQ max '+(memMax!=null? memMax.toFixed(1)+'MB':'n/a'),'muted'));
} catch {}
summaryEl.appendChild(wrap);

// Curve Viewer (overlay)
const cv=document.getElementById('curveViewer');
const variantsCfg = (data.config.curveVariants && data.config.curveVariants.length)? data.config.curveVariants : ['hnsw','scalarQ','pq','hnswScalar','hnswPQ'];
const metricsCfg = (data.config.curveMetrics && data.config.curveMetrics.length)? data.config.curveMetrics : ['recall','map'];
const ksCfg = (data.config.curveKs && data.config.curveKs.length)? data.config.curveKs : [1,5,10];
const colors={hnsw:'#1d6fd1',scalarQ:'#2b8a3e',pq:'#e67700',hnswScalar:'#7048e8',hnswPQ:'#c92a2a'};
function makeSel(id){const sel=document.createElement('select'); if(id) sel.id=id; (data.results||[]).forEach((r,idx)=>{if(r.skipped) return; const opt=document.createElement('option'); opt.value=String(idx); opt.textContent='Row '+idx+' (N='+r.N+', ef='+r.efSearch+')'; sel.appendChild(opt);}); return sel;}
function makeToggles(keys, initial){const wrap=document.createElement('div'); const checkedSet=new Set(initial && initial.length? initial: keys); for(const k of keys){const id='ck_'+k; const lab=document.createElement('label'); lab.style.marginRight='10px'; const cb=document.createElement('input'); cb.type='checkbox'; cb.id=id; cb.value=k; cb.checked=checkedSet.has(k); lab.appendChild(cb); lab.appendChild(document.createTextNode(' '+k)); wrap.appendChild(lab);} return wrap;}
const rowSel=makeSel('rowSelA');
const rowSelB=makeSel('rowSelB');
const defaultVisible = (data.config.curveDefaultVariantVisibility && data.config.curveDefaultVariantVisibility.length)? data.config.curveDefaultVariantVisibility : variantsCfg;
const varTog=makeToggles(variantsCfg, defaultVisible);
const metTog=makeToggles(metricsCfg, new Set(metricsCfg));
const legend=document.createElement('div'); legend.className='legend';
variantsCfg.forEach(v=>{ const span=document.createElement('span'); const sw=document.createElement('span'); sw.className='sw'; sw.style.background=colors[v]||'#555'; span.appendChild(sw); span.appendChild(document.createTextNode(v)); legend.appendChild(span); });
const legendRow=document.createElement('div'); legendRow.className='legend-row';
const la=document.createElement('span'); la.appendChild(document.createTextNode('Row A ')); const laLine=document.createElement('span'); laLine.className='line-sample'; la.appendChild(laLine); legendRow.appendChild(la);
const lb=document.createElement('span'); lb.appendChild(document.createTextNode('Row B ')); const lbLine=document.createElement('span'); lbLine.className='line-sample line-dashed'; lb.appendChild(lbLine); legendRow.appendChild(lb);
legend.appendChild(legendRow);
const canvR=document.createElement('canvas'); canvR.width=360; canvR.height=120; canvR.style.border='1px solid #ddd'; canvR.style.marginRight='10px';
const canvM=document.createElement('canvas'); canvM.width=360; canvM.height=120; canvM.style.border='1px solid #ddd';
const cmpWrap=document.createElement('div'); const cmpLbl=document.createElement('label'); const cmpCb=document.createElement('input'); cmpCb.type='checkbox'; cmpCb.id='compareMode'; cmpLbl.appendChild(cmpCb); cmpLbl.appendChild(document.createTextNode(' Compare mode')); cmpWrap.appendChild(cmpLbl);
// Preset buttons
const presets=document.createElement('div'); presets.style.margin='6px 0';
function btn(text, handler){ const b=document.createElement('button'); b.textContent=text; b.style.marginRight='6px'; b.addEventListener('click', handler); return b; }
let presetMetric='recall';
const metricBtn=btn('Metric: recall', ()=>{ presetMetric = presetMetric==='recall' ? 'map' : 'recall'; metricBtn.textContent = 'Metric: '+(presetMetric==='recall'?'recall':'mAP'); });
presets.appendChild(metricBtn);
presets.appendChild(btn('Best ef (N)', ()=>selectBestForN(presetMetric)));
presets.appendChild(btn('Fastest (N)', ()=>selectFastestForN()));
const highestBtn=btn('Highest recall (global)', ()=>selectGlobalBest(presetMetric));
function refreshPresetLabels(){ highestBtn.textContent = 'Highest '+(presetMetric==='recall'?'recall':'mAP')+' (global)'; }
metricBtn.addEventListener('click', refreshPresetLabels);
presets.appendChild(highestBtn);
const resetBtn=btn('Reset to defaults', ()=>{ localStorage.removeItem(LS_KEY); location.reload(); });
presets.appendChild(resetBtn);
const ctrls=document.createElement('div'); ctrls.appendChild(document.createTextNode('Row A: ')); ctrls.appendChild(rowSel); ctrls.appendChild(document.createTextNode(' Row B: ')); ctrls.appendChild(rowSelB); ctrls.appendChild(cmpWrap); ctrls.appendChild(document.createTextNode(' Variants: ')); ctrls.appendChild(varTog); ctrls.appendChild(document.createTextNode(' Metrics: ')); ctrls.appendChild(metTog); cv.appendChild(ctrls); cv.appendChild(presets); cv.appendChild(legend); const wrapCharts=document.createElement('div'); wrapCharts.style.display='flex'; wrapCharts.style.gap='10px'; wrapCharts.appendChild(canvR); wrapCharts.appendChild(canvM); cv.appendChild(wrapCharts);
// State restore from localStorage
const st=getState();
if(typeof st.rowA==='number' && rowSel.options.length) rowSel.selectedIndex=Math.max(0, Math.min(st.rowA, rowSel.options.length-1));
if(typeof st.rowB==='number' && rowSelB.options.length) rowSelB.selectedIndex=Math.max(0, Math.min(st.rowB, rowSelB.options.length-1));
if(typeof st.compare==='boolean') cmpCb.checked=st.compare;
if(Array.isArray(st.variants)) { st.variants.forEach(v=>{ const el=varTog.querySelector('#ck_'+v); if(el) el.checked=true; }); variantsCfg.forEach(v=>{ if(!st.variants.includes(v)){ const el=varTog.querySelector('#ck_'+v); if(el) el.checked=false; } }); }
if(Array.isArray(st.metrics)) { metTog.querySelectorAll('input[type="checkbox"]').forEach(cb=>{ cb.checked=st.metrics.includes(cb.value); }); }
function draw(){ const aIdx=parseInt(rowSel.value||'0',10); const bIdx=parseInt(rowSelB.value||'0',10); const useCompare=!!cmpCb.checked && aIdx!==bIdx; const A=data.results[aIdx]; const B=data.results[bIdx]; const ks=ksCfg; const ctxR=canvR.getContext('2d'); const ctxM=canvM.getContext('2d'); ctxR.clearRect(0,0,canvR.width,canvR.height); ctxM.clearRect(0,0,canvM.width,canvM.height);
 const grid=(ctx)=>{ctx.strokeStyle='#eee'; ctx.beginPath(); for(let i=0;i<=ks.length-1;i++){ const x=i*(canvR.width/(ks.length-1||1)); ctx.moveTo(x,0); ctx.lineTo(x,canvR.height);} ctx.stroke();}; grid(ctxR); grid(ctxM);
 const activeVariants=[...varTog.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).map(x=>x.value);
 const wantRecall=!!metTog.querySelector('input[value="recall"]').checked;
 const wantMap=!!metTog.querySelector('input[value="map"]').checked;
 function plotSeries(ctx, arr, color, scaleMax, dashed){ if(!arr || !arr.length) return; ctx.save(); ctx.strokeStyle=color; if(dashed) ctx.setLineDash([5,4]); ctx.beginPath(); const max=scaleMax; ctx.moveTo(0, canvR.height - (arr[0]/max)*(canvR.height-10)); for(let i=1;i<arr.length;i++){ const x=i*(canvR.width/(arr.length-1)); const y=canvR.height - (arr[i]/max)*(canvR.height-10); ctx.lineTo(x,y);} ctx.stroke(); ctx.restore(); }
 for(const v of activeVariants){ if(wantRecall){ const a=(A||{})['recall'+v.charAt(0).toUpperCase()+v.slice(1)+'Curve']||[]; plotSeries(ctxR, a, colors[v]||'#555', 100, false); if(useCompare){ const b=(B||{})['recall'+v.charAt(0).toUpperCase()+v.slice(1)+'Curve']||[]; plotSeries(ctxR, b, colors[v]||'#555', 100, true);} } if(wantMap){ const a=((A||{})['map'+v.charAt(0).toUpperCase()+v.slice(1)+'Curve']||[]).map(x=>x*100); plotSeries(ctxM, a, colors[v]||'#555', 100, false); if(useCompare){ const b=((B||{})['map'+v.charAt(0).toUpperCase()+v.slice(1)+'Curve']||[]).map(x=>x*100); plotSeries(ctxM, b, colors[v]||'#555', 100, true);} } }
}
function persist(){ const a=parseInt(rowSel.value||'0',10); const b=parseInt(rowSelB.value||'0',10); const compare=!!cmpCb.checked; const variants=[...varTog.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).map(x=>x.value); const metrics=[...metTog.querySelectorAll('input[type="checkbox"]')].filter(x=>x.checked).map(x=>x.value); setState({ rowA:a,rowB:b,compare,variants,metrics }); }
rowSel.addEventListener('change', ()=>{ persist(); draw(); }); rowSelB.addEventListener('change', ()=>{ persist(); draw(); }); varTog.addEventListener('change', ()=>{ persist(); draw(); }); metTog.addEventListener('change', ()=>{ persist(); draw(); }); cmpCb.addEventListener('change', ()=>{ persist(); draw(); }); if(rowSel.options.length){ if(typeof st.rowA!=='number') rowSel.selectedIndex=0; if(typeof st.rowB!=='number') rowSelB.selectedIndex=Math.min(1, rowSelB.options.length-1); draw(); }

// Presets implementation
function selectBestForN(metric){ const aIdx=parseInt(rowSel.value||'0',10); const N=(data.results[aIdx]||{}).N; const rows=data.results.map((r,idx)=>({r,idx})).filter(x=>!x.r.skipped && x.r.N===N); const score=(rr)=> (metric==='recall'? (rr.recallHnsw||0) : (rr.mapHnsw||0)); rows.sort((a,b)=> score(b.r)-score(a.r)); if(rows.length){ rowSel.selectedIndex=rows[0].idx; if(cmpCb.checked && rows[1]) rowSelB.selectedIndex=rows[1].idx; persist(); draw(); }}
function selectFastestForN(){ const aIdx=parseInt(rowSel.value||'0',10); const N=(data.results[aIdx]||{}).N; const rows=data.results.map((r,idx)=>({r,idx})).filter(x=>!x.r.skipped && x.r.N===N && typeof x.r.hnswLatency==='number'); rows.sort((a,b)=> (a.r.hnswLatency)-(b.r.hnswLatency)); if(rows.length){ rowSel.selectedIndex=rows[0].idx; if(cmpCb.checked && rows[1]) rowSelB.selectedIndex=rows[1].idx; persist(); draw(); }}
function selectGlobalBest(metric){ const rows=data.results.map((r,idx)=>({r,idx})).filter(x=>!x.r.skipped); const score=(rr)=> (metric==='recall'? (rr.recallHnsw||0) : (rr.mapHnsw||0)); rows.sort((a,b)=> score(b.r)-score(a.r)); if(rows.length){ rowSel.selectedIndex=rows[0].idx; if(cmpCb.checked && rows[1]) rowSelB.selectedIndex=rows[1].idx; persist(); draw(); }}

const root=document.getElementById('report');
const tbl=document.createElement('table');
const head=['N','ef','flat(ms)','hnsw(ms)','speed','ov%','rec%','mAP','qScalar(ms)','ov%','rec%','mAP','qPQ(ms)','ov%','rec%','mAP','hQScalar(ms)','ov%','spd','rec%','mAP','hQPQ(ms)','ov%','spd','rec%','mAP','onDiskPQ','coldLoadPQ(ms)','spark','ov-heat','rec-curve','map-curve','variants'];
tbl.innerHTML='<thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead>';
const tb=document.createElement('tbody');
for(const r of data.results){
 if(r.skipped) continue;
 const cn=document.createElement('canvas'); cn.width=100; cn.height=30; cn.className='spark'; const ctx=cn.getContext('2d'); const arr=r.hnswLatencySamples||[]; if(arr.length){ const max=Math.max(...arr); ctx.strokeStyle='#2b8a3e'; ctx.beginPath(); ctx.moveTo(0,30-(arr[0]/max*28)); for(let i=1;i<arr.length;i++){ ctx.lineTo(i*(100/(arr.length-1)), 30-(arr[i]/max*28)); } ctx.stroke(); }
 const heat=document.createElement('canvas'); heat.width=100; heat.height=20; heat.className='heat'; const hctx=heat.getContext('2d'); const vals=[r.overlapPct||0,r.scalarQOverlapPct||0,r.pqOverlapPct||0,r.hnswScalarOverlapPct||0,r.hnswPQOverlapPct||0]; const w=100/vals.length; vals.forEach((v,i)=>{ const pct=Math.max(0,Math.min(100,v)); // red->green
  const g=Math.round((pct/100)*200+30); const rd=Math.round((1-pct/100)*200+30); hctx.fillStyle='rgb('+rd+','+g+',60)'; hctx.fillRect(i*w,0,w-2,20); hctx.fillStyle='rgba(0,0,0,0.6)'; hctx.font='10px sans-serif'; hctx.fillText(String(pct.toFixed(0))+'%', i*w+2,14);
 });
 const row=[r.N,r.efSearch,(r.flatLatency??0).toFixed(2),(r.hnswLatency??0).toFixed(2),(r.speedup??0).toFixed(2),(r.overlapPct??0).toFixed(1),(r.recallHnsw||0).toFixed(1),(r.mapHnsw||0).toFixed(2),(r.scalarQLatency??0).toFixed(2),(r.scalarQOverlapPct??0).toFixed(1),(r.recallScalarQ||0).toFixed(1),(r.mapScalarQ||0).toFixed(2),(r.pqLatency??0).toFixed(2),(r.pqOverlapPct??0).toFixed(1),(r.recallPQ||0).toFixed(1),(r.mapPQ||0).toFixed(2),(r.hnswScalarLatency??0).toFixed(2),(r.hnswScalarOverlapPct??0).toFixed(1),(r.speedupScalarHnsw??0).toFixed(2),(r.recallHnswScalar||0).toFixed(1),(r.mapHnswScalar||0).toFixed(2),(r.hnswPQLatency??0).toFixed(2),(r.hnswPQOverlapPct??0).toFixed(1),(r.speedupPQHnsw??0).toFixed(2),(r.recallHnswPQ||0).toFixed(1),(r.mapHnswPQ||0).toFixed(2), String(Math.round((r.onDiskBytesPQ||0)/1e6))+'MB', (r.coldLoadMsPQ||0).toFixed(1)];
 const tr=document.createElement('tr');
 row.forEach(c=>{ const td=document.createElement('td'); td.textContent=String(c); tr.appendChild(td); });
 const tdS=document.createElement('td'); tdS.appendChild(cn); tr.appendChild(tdS); tb.appendChild(tr);
 const tdH=document.createElement('td'); tdH.appendChild(heat); tr.appendChild(tdH);
 const rc=document.createElement('canvas'); rc.width=100; rc.height=30; const rctx=rc.getContext('2d'); const rcurve=(r.recallHnswCurve||[]); if(rcurve.length){ const max=100; rctx.strokeStyle='#1d6fd1'; rctx.beginPath(); rctx.moveTo(0,30-(rcurve[0]/max*28)); for(let i=1;i<rcurve.length;i++){ rctx.lineTo(i*(100/(rcurve.length-1)), 30-(rcurve[i]/max*28)); } rctx.stroke(); }
 const mc=document.createElement('canvas'); mc.width=100; mc.height=30; const mctx=mc.getContext('2d'); const mcurve=(r.mapHnswCurve||[]).map(x=>x*100); if(mcurve.length){ const max=100; mctx.strokeStyle='#7048e8'; mctx.beginPath(); mctx.moveTo(0,30-(mcurve[0]/max*28)); for(let i=1;i<mcurve.length;i++){ mctx.lineTo(i*(100/(mcurve.length-1)), 30-(mcurve[i]/max*28)); } mctx.stroke(); }
 const tdRC=document.createElement('td'); tdRC.appendChild(rc); tr.appendChild(tdRC);
 const tdMC=document.createElement('td'); tdMC.appendChild(mc); tr.appendChild(tdMC);
 // Per-row variant toggles (swatches) controlling overlay visibility
 const tv=document.createElement('td');
 ['hnsw','scalarQ','pq','hnswScalar','hnswPQ'].forEach(v=>{ const sw=document.createElement('span'); sw.className='sw'; sw.title='Toggle '+v; sw.style.background=colors[v]||'#555'; sw.style.cursor='pointer'; sw.style.marginRight='6px'; sw.addEventListener('click', ()=>{ const el=document.getElementById('ck_'+v); if(el){ el.checked=!el.checked; const ev=new Event('change'); el.dispatchEvent(ev); } }); tv.appendChild(sw); });
 tr.appendChild(tv);
}
tbl.appendChild(tb);root.appendChild(tbl);

// Per-variant summary table (min recall/mAP vs thresholds)
try {
    const pvRecall = data.config.minRecallPctByVariant || {};
    const pvMap = data.config.minMapByVariant || {};
    const variants = ['hnsw','scalarQ','pq','hnswScalar','hnswPQ'];
    const rows = [];
    for (const v of variants) {
        let minRec = null, minMap = null;
        for (const r of (data.results||[])) {
            if (r.skipped) continue;
            const rec = r['recall'+v.charAt(0).toUpperCase()+v.slice(1)];
            const mp = r['map'+v.charAt(0).toUpperCase()+v.slice(1)];
            if (typeof rec === 'number') minRec = (minRec==null)? rec : Math.min(minRec, rec);
            if (typeof mp === 'number') minMap = (minMap==null)? mp : Math.min(minMap, mp);
        }
        rows.push({ v, minRec, minMap, thrRec: pvRecall[v], thrMap: pvMap[v] });
    }
    const hasAny = rows.some(r=>r.thrRec!=null || r.thrMap!=null);
    if (hasAny) {
        const box = document.createElement('div');
        box.style.margin='10px 0';
        const title = document.createElement('h3');
        title.textContent='Per-variant Threshold Summary';
        box.appendChild(title);
            const legend=document.createElement('div');
            legend.className='legend';
            function legendBadge(cls,text){const s=document.createElement('span'); s.className='badge '+cls; s.textContent=text; return s;}
            const legWrap=document.createElement('div'); legWrap.style.margin='4px 0';
            legWrap.appendChild(legendBadge('pass','pass')); legWrap.appendChild(document.createTextNode(' ≥ threshold '));
            legWrap.appendChild(legendBadge('fail','fail')); legWrap.appendChild(document.createTextNode(' < threshold '));
            legWrap.appendChild(legendBadge('muted','muted')); legWrap.appendChild(document.createTextNode(' no threshold set or value missing'));
            box.appendChild(legWrap);
        const table = document.createElement('table');
        table.innerHTML = '<thead><tr><th>Variant</th><th>Recall min</th><th>Recall thr</th><th>mAP min</th><th>mAP thr</th></tr></thead>';
        const body = document.createElement('tbody');
        for (const r of rows) {
            const tr=document.createElement('tr');
            const tdV=document.createElement('td'); tdV.textContent=r.v; tr.appendChild(tdV);
            function badgeCell(val, thr, isMap){
                const td=document.createElement('td');
                if (val==null) { td.textContent='n/a'; return td; }
                const span=document.createElement('span');
                const pass = (thr==null) ? null : (val >= thr);
                span.className='badge '+(pass==null? 'muted' : (pass? 'pass':'fail'));
                span.textContent = (isMap? val.toFixed(3): (val.toFixed(1)+'%'));
                td.appendChild(span);
                return td;
            }
            tr.appendChild(badgeCell(r.minRec, r.thrRec, false));
            tr.appendChild((()=>{ const td=document.createElement('td'); td.textContent = (r.thrRec!=null? (r.thrRec+'%') : '—'); return td; })());
            tr.appendChild(badgeCell(r.minMap, r.thrMap, true));
            tr.appendChild((()=>{ const td=document.createElement('td'); td.textContent = (r.thrMap!=null? r.thrMap : '—'); return td; })());
            body.appendChild(tr);
        }
        table.appendChild(body);
        summaryEl.appendChild(box);
        box.appendChild(table);
    }
} catch {}
</script>
</body></html>`;
    const htmlPath = resolve(dirname(outPath), 'indexing-performance.html');
    writeFileSync(htmlPath, html);
    console.log(`[indexing-bench] HTML report written to ${htmlPath}`);

    // Write CSV
    const csvPath = resolve(dirname(outPath), 'indexing-performance.csv');
    const header = [
        'N',
        'ef',
        'flatLatency',
        'hnswLatency',
        'speedup',
        'overlapPct',
        'recallHnsw',
        'mapHnsw',
        'scalarQLatency',
        'scalarQOverlapPct',
        'recallScalarQ',
        'mapScalarQ',
        'pqLatency',
        'pqOverlapPct',
        'recallPQ',
        'mapPQ',
        'hnswScalarLatency',
        'hnswScalarOverlapPct',
        'speedupScalarHnsw',
        'recallHnswScalar',
        'mapHnswScalar',
        'hnswPQLatency',
        'hnswPQOverlapPct',
        'speedupPQHnsw',
        'recallHnswPQ',
        'mapHnswPQ',
        // dynamic curve columns appended below
        'memAfterFlatBuild',
        'memAfterHnswBuild',
        'memAfterScalarQBuild',
        'memAfterPQBuild',
        'memAfterHnswScalarBuild',
        'memAfterHnswPQBuild',
        'memAfterQueries',
        'onDiskBytesHnswScalar',
        'coldLoadMsHnswScalar',
        'onDiskBytesHnswPQ',
        'coldLoadMsHnswPQ',
        'cpuDeltaMs',
        'peakRss',
        'onDiskBytesPQ',
        'coldLoadMsPQ',
    ];
    // Append recall@K and mAP@K columns per variant (recall for all variants first, then map)
    const ksCols = cfg.curveKs?.length ? cfg.curveKs : [1, 5, 10];
    const vList = ['Hnsw', 'ScalarQ', 'PQ', 'HnswScalar', 'HnswPQ'];
    const recallCols = [];
    const mapCols = [];
    for (const v of vList) for (const k of ksCols) recallCols.push(`recall${v}@${k}`);
    for (const v of vList) for (const k of ksCols) mapCols.push(`map${v}@${k}`);
    header.splice(26, 0, ...recallCols, ...mapCols);
    const rows = [header.join(',')];
    for (const r of results) {
        if (r.skipped) continue;
        const row = [
            r.N,
            r.efSearch,
            r.flatLatency,
            r.hnswLatency,
            r.speedup,
            r.overlapPct,
            r.recallHnsw || 0,
            r.mapHnsw || 0,
            r.scalarQLatency,
            r.scalarQOverlapPct,
            r.recallScalarQ || 0,
            r.mapScalarQ || 0,
            r.pqLatency,
            r.pqOverlapPct,
            r.recallPQ || 0,
            r.mapPQ || 0,
            r.hnswScalarLatency,
            r.hnswScalarOverlapPct,
            r.speedupScalarHnsw,
            r.recallHnswScalar || 0,
            r.mapHnswScalar || 0,
            r.hnswPQLatency,
            r.hnswPQOverlapPct,
            r.speedupPQHnsw,
            r.recallHnswPQ || 0,
            r.mapHnswPQ || 0,
            // dynamic curve values inserted below
            r.memAfterFlatBuild,
            r.memAfterHnswBuild,
            r.memAfterScalarQBuild,
            r.memAfterPQBuild,
            r.memAfterHnswScalarBuild,
            r.memAfterHnswPQBuild,
            r.memAfterQueries,
            r.onDiskBytesHnswScalar || 0,
            r.coldLoadMsHnswScalar || 0,
            r.onDiskBytesHnswPQ || 0,
            r.coldLoadMsHnswPQ || 0,
            r.cpuDeltaMs,
            r.peakRss || 0,
            r.onDiskBytesPQ || 0,
            r.coldLoadMsPQ || 0,
        ];
        // Insert recall/map curves per variant at index 26
        const insertAt = 26;
        const recs = [];
        const maps = [];
        const pairs = [
            ['Hnsw', r.recallHnswCurve || [], (r.mapHnswCurve || []).map((x) => x)],
            ['ScalarQ', r.recallScalarQCurve || [], (r.mapScalarQCurve || []).map((x) => x)],
            ['PQ', r.recallPQCurve || [], (r.mapPQCurve || []).map((x) => x)],
            ['HnswScalar', r.recallHnswScalarCurve || [], (r.mapHnswScalarCurve || []).map((x) => x)],
            ['HnswPQ', r.recallHnswPQCurve || [], (r.mapHnswPQCurve || []).map((x) => x)],
        ];
        for (const [, rcv, mcv] of pairs) {
            for (const k of ksCols) recs.push(rcv[ksCols.indexOf(k)] ?? 0);
            for (const k of ksCols) maps.push(mcv[ksCols.indexOf(k)] ?? 0);
        }
        row.splice(insertAt, 0, ...recs, ...maps);
        rows.push(row.join(','));
    }
    writeFileSync(csvPath, rows.join('\n'));
    console.log(`[indexing-bench] CSV report written to ${csvPath}`);

    // Optional: replicate reports to external data and backup directories for RAG pipeline
    const dataDirRaw = process.env.RAG_DATA_DIR;
    const backupDirRaw = process.env.RAG_BACKUP_DIR;
    const stamp = makeTimestampFolder();
    const tag = sanitizeTag(cfg.reportTag || '');
    const cfgHash = hashConfig(cfg);
    function ensureStampedDir(dstRoot) {
        try {
            const base = tag
                ? resolve(dstRoot, 'reports', tag, stamp)
                : resolve(dstRoot, 'reports', stamp);
            mkdirSync(base, { recursive: true });
            return base;
        } catch {
            return null;
        }
    }
    function copyIntoDir(base, filePath) {
        try {
            if (!base) return;
            const name = basename(filePath);
            const dest = resolve(base, name);
            copyFileSync(filePath, dest);
        } catch {
            /* ignore */
        }
    }
    function writeStampedReadme(base) {
        try {
            if (!base) return;
            const readmePath = resolve(base, 'README.md');
            const lines = [];
            lines.push('# Benchmark Run');
            lines.push('');
            lines.push(`Timestamp: ${stamp}`);
            if (tag) lines.push(`Tag: ${tag}`);
            if (cfgHash) lines.push(`Config SHA-256: ${cfgHash.substring(0, 12)}...`);
            lines.push('');
            const flags = (process.argv.slice(2) || []).join(' ');
            lines.push('## Command-line flags');
            lines.push('');
            lines.push('```');
            lines.push(flags || '(none)');
            lines.push('```');
            lines.push('');
            lines.push('## Quick links');
            lines.push('');
            lines.push('- [Open HTML report](./indexing-performance.html)');
            lines.push('- [JSON report](./indexing-performance.json)');
            lines.push('- [CSV report](./indexing-performance.csv)');
            lines.push('');
            lines.push('## Config snapshot');
            lines.push('');
            lines.push('```json');
            lines.push(JSON.stringify(cfg, null, 2));
            lines.push('```');
            lines.push('');
            writeFileSync(readmePath, lines.join('\n'));
        } catch {
            /* ignore */
        }
    }
    if (dataDirRaw) {
        const dataDir = expandTildePath(dataDirRaw);
        const base = ensureStampedDir(dataDir);
        copyIntoDir(base, outPath);
        copyIntoDir(base, htmlPath);
        copyIntoDir(base, csvPath);
        writeStampedReadme(base);
        // GitHub Actions outputs/summary for dataDir
        try {
            if (base && process.env.GITHUB_OUTPUT) {
                const out = `html_path=${resolve(base, 'indexing-performance.html')}\njson_path=${resolve(base, 'indexing-performance.json')}\ncsv_path=${resolve(base, 'indexing-performance.csv')}\n`;
                appendFileSync(process.env.GITHUB_OUTPUT, out);
            }
            if (base && process.env.GITHUB_STEP_SUMMARY) {
                const link = resolve(base, 'indexing-performance.html');
                const md = `\n### RAG Benchmark Report (Data Dir)\n\n- HTML: ${link}\n- JSON: ${resolve(base, 'indexing-performance.json')}\n- CSV: ${resolve(base, 'indexing-performance.csv')}\n`;
                appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
            }
        } catch { }
    }
    if (backupDirRaw) {
        const backupDir = expandTildePath(backupDirRaw);
        const base = ensureStampedDir(backupDir);
        copyIntoDir(base, outPath);
        copyIntoDir(base, htmlPath);
        copyIntoDir(base, csvPath);
        writeStampedReadme(base);
        // GitHub Actions outputs/summary for backupDir
        try {
            if (base && process.env.GITHUB_OUTPUT) {
                const out = `backup_html_path=${resolve(base, 'indexing-performance.html')}\nbackup_json_path=${resolve(base, 'indexing-performance.json')}\nbackup_csv_path=${resolve(base, 'indexing-performance.csv')}\n`;
                appendFileSync(process.env.GITHUB_OUTPUT, out);
            }
            if (base && process.env.GITHUB_STEP_SUMMARY) {
                const link = resolve(base, 'indexing-performance.html');
                const md = `\n### RAG Benchmark Report (Backup Dir)\n\n- HTML: ${link}\n- JSON: ${resolve(base, 'indexing-performance.json')}\n- CSV: ${resolve(base, 'indexing-performance.csv')}\n`;
                appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
            }
        } catch { }
    }
}

// Extracted helpers to keep run() simple
async function runAllConfigs(cfg, rnd) {
    const results = [];
    for (const N of cfg.sizes) {
        for (const ef of cfg.efSearchValues) {
            const out = await runOnce({
                dim: cfg.dim,
                N,
                topK: cfg.topK,
                efSearch: ef,
                quantization: cfg.quantization,
                rnd,
                queriesCount: cfg.queries,
                coldLoad: cfg.coldLoad,
                variants: cfg.variants,
                curveKs: cfg.curveKs,
            });
            results.push(out);
            logResult(out);
        }
    }
    return results;
}

function postBudgets(results, cfg) {
    const ran = results.filter((r) => !r.skipped);
    if (ran.length > 0) {
        enforceBudgets(ran, {
            memBudgetMB: cfg.memBudgetMB,
            cpuBudgetMs: cfg.cpuBudgetMs,
            peakRssBudgetMB: cfg.peakRssBudgetMB,
            minRecallPct: cfg.minRecallPct,
            minMap: cfg.minMap,
            perVariantRecall: cfg.minRecallPctByVariant,
            perVariantMap: cfg.minMapByVariant,
            failOnMissingVariant: cfg.failOnMissingVariant,
            pqMinCompressionRatio: cfg.pqMinCompressionRatio,
            estimateFlatBytes,
            pqMaxColdLoadMs: cfg.pqMaxColdLoadMs,
        });
        console.log('[indexing-bench] Budgets met across all ran configurations');
    } else {
        console.log('[indexing-bench] HNSW unavailable; budgets not enforced');
    }
}

function writeJsonReport(cfg, results) {
    const outPath = resolve(cfg.report);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify({ config: cfg, results }, null, 2));
    console.log(`[indexing-bench] Report written to ${outPath}`);
    return outPath;
}

// Only run when executed directly, not when imported by tests
const isMain = (() => {
    try {
        return import.meta.url === pathToFileURL(process.argv[1]).href;
    } catch {
        return true;
    }
})();

if (isMain) {
    run().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
