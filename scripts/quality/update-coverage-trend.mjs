#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseStringPromise } from 'xml2js';

async function main() {
    if (!existsSync('coverage.xml')) {
        console.error('[coverage] coverage.xml not found');
        process.exit(1);
    }
    const xml = readFileSync('coverage.xml', 'utf8');
    const data = await parseStringPromise(xml);
    const coverageAttr = data.coverage?.$?.lineRate || data.coverage?.$?.line_rate || 0;
    const pct = Math.round(parseFloat(coverageAttr) * 1000) / 10; // one decimal

    if (!existsSync('reports')) mkdirSync('reports');
    let trend = [];
    if (existsSync('reports/coverage-trend.json')) {
        try { trend = JSON.parse(readFileSync('reports/coverage-trend.json', 'utf8')); } catch { }
    }
    const entry = { timestamp: new Date().toISOString(), coverage: pct };
    trend.push(entry);
    if (trend.length > 180) trend = trend.slice(trend.length - 180); // ~6 months daily
    writeFileSync('reports/coverage-trend.json', JSON.stringify(trend, null, 2));
    let color = 'orange';
    if (pct >= 90) color = 'brightgreen';
    else if (pct >= 80) color = 'yellow';
    writeFileSync('reports/coverage-badge.json', JSON.stringify({ schemaVersion: 1, label: 'coverage', message: pct + '%', color }, null, 2));
    console.log('[coverage] Updated trend & badge: ' + pct + '%');
}

main().catch(e => { console.error(e); process.exit(1); });
