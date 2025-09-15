// Ingest dispatcher (Archon-inspired) with MIME routing and budgets

import dns from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

// import yaml from 'js-yaml';

type Job = { url?: string; filePath?: string; file?: Buffer; mime: string };

function readPolicy() {
	const y = yaml.load(
		fs.readFileSync('configs/ingest.policy.yaml', 'utf8'),
	) as any;
	return y?.ingest || {};
}

export function assertAllowedMime(mime: string) {
	const ingest = readPolicy();
	const allow: string[] = ingest.allow_mime || [];
	if (!allow.includes(mime)) {
		const msg = `Denied MIME: ${mime}`;
		throw Object.assign(new Error(msg), { code: 'DENY_MIME' });
	}
}

function isPrivateIp(ip: string): boolean {
	// IPv4
	const oct = ip.split('.').map((x) => Number(x));
	if (
		oct.length === 4 &&
		oct.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
	) {
		if (oct[0] === 10) return true; // 10.0.0.0/8
		if (oct[0] === 127) return true; // loopback
		if (oct[0] === 169 && oct[1] === 254) return true; // link-local
		if (oct[0] === 172 && oct[1] >= 16 && oct[1] <= 31) return true; // 172.16.0.0/12
		if (oct[0] === 192 && oct[1] === 168) return true; // 192.168.0.0/16
		return false;
	}
	// IPv6 (very coarse)
	if (ip.includes(':')) {
		const lower = ip.toLowerCase();
		if (lower.startsWith('fe80:')) return true; // link-local
		if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
		if (lower === '::1') return true; // loopback
	}
	return false;
}

function assertSafeUrl(u: URL) {
	if (!/^https?:$/.test(u.protocol)) throw new Error('Only http/https allowed');
	const host = u.hostname;
	if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
		throw new Error('Localhost denied');
	}
	if (net.isIP(host) && isPrivateIp(host)) {
		throw new Error('Private IP denied');
	}
	// Best effort: block .local and .internal hostnames
	if (/\.(local|internal)$/i.test(host)) {
		throw new Error('Local/internal DNS denied');
	}
}

export async function crawl(url: string) {
	const u = new URL(url);
	assertSafeUrl(u);
	// Resolve hostname and deny if any resolved address is private
	if (!net.isIP(u.hostname)) {
		try {
			const addrs = await dns.lookup(u.hostname, { all: true });
			if (addrs.some((a) => isPrivateIp(a.address))) {
				throw new Error('Private IP denied');
			}
		} catch (_e) {
			// If DNS fails, keep conservative: allow only if we already passed host validations
		}
	}
	// TODO: fetch and parse with budgeted downloader; emit SSE events
	return { ok: true, type: 'crawl', url };
}

export async function parseUpload(file: Buffer, mime: string) {
	// TODO: parse by MIME (pdf, html, markdown, text) with size and time budgets; emit SSE events
	return { ok: true, type: 'upload', bytes: file.byteLength, mime };
}

export async function dispatch(job: Job) {
	assertAllowedMime(job.mime);
	if (job.url) return crawl(job.url);
	const buf =
		job.file ??
		(job.filePath ? fs.readFileSync(path.resolve(job.filePath)) : undefined);
	if (buf) return parseUpload(buf, job.mime);
	throw new Error('No input provided');
}
