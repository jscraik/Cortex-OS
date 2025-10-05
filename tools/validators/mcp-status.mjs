#!/usr/bin/env node
/**
 * MCP Status Validator
 * - Pings an MCP HTTP endpoint with a minimal 'ping' tool call
 * - Optionally validates expected tool registration by invoking a known tool
 * - Complements REST health checks by verifying MCP-side reachability
 *
 * Env vars:
 * - MCP_ENDPOINT: explicit MCP HTTP endpoint (e.g., http://localhost:3002/mcp)
 * - LOCAL_MEMORY_MCP_ENDPOINT: alternative explicit endpoint
 * - LOCAL_MEMORY_BASE_URL: base REST URL; derive MCP endpoint candidates
 * - MCP_STATUS_VALIDATE_TOOL: optional tool to call for registration validation
 * - MCP_STATUS_EXPECT_TOOLS: comma-separated tool names; tries 'tools.list' then fallbacks to calling each
 * - MCP_STATUS_STRICT=1: require tools validation to succeed (otherwise warn)
 * - CI / GITHUB_ACTIONS: if set, warnings may be treated more strictly by callers
 */
/* eslint-disable no-console */

const STRICT = process.env.MCP_STATUS_STRICT === '1';
const IS_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

function log(msg) {
	console.log(`[mcp-status] ${msg}`);
}

function warn(msg) {
	console.warn(`[mcp-status] WARN: ${msg}`);
}

function fail(msg) {
	console.error(`[mcp-status] ERROR: ${msg}`);
	process.exit(1);
}

function trimEndSlash(s) {
	return s.replace(/\/$/, '');
}

function parseExpectedTools() {
	const raw = process.env.MCP_STATUS_EXPECT_TOOLS || '';
	return raw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

function deriveEndpointsFromBase(baseUrl) {
	if (!baseUrl) return [];
	const base = trimEndSlash(String(baseUrl));
	const withoutApi = base.replace(/\/api\/v1$/, '');
	const candidates = new Set([`${base}/mcp`, `${withoutApi}/mcp`]);
	return Array.from(candidates);
}

function collectEndpointCandidates() {
	const explicit = process.env.MCP_ENDPOINT || process.env.LOCAL_MEMORY_MCP_ENDPOINT;
	const base = process.env.LOCAL_MEMORY_BASE_URL;
	const list = [];
	if (explicit) list.push(String(explicit));
	list.push(...deriveEndpointsFromBase(base));
	// de-dup
	return Array.from(new Set(list.filter(Boolean)));
}

let sequence = 0;
function createCallId(prefix) {
	sequence += 1;
	return `${prefix}-${Date.now()}-${sequence}`;
}

async function sendJsonRpc(endpoint, method, params = undefined) {
	const payload = {
		jsonrpc: '2.0',
		id: createCallId('mcp-status'),
		method,
	};
	if (typeof params !== 'undefined') {
		payload.params = params;
	}

	const res = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();
	if (data?.error) {
		const message = typeof data.error.message === 'string' ? data.error.message : 'unknown error';
		const codeSuffix = typeof data.error.code !== 'undefined' ? ` ${data.error.code}` : '';
		throw new Error(`RPC error${codeSuffix}: ${message}`);
	}
	return data?.result;
}

async function tryPing(endpoint) {
	try {
		const result = await sendJsonRpc(endpoint, 'ping', {});
		return { ok: true, result };
	} catch (error) {
		return { ok: false, error };
	}
}


async function tryCallTool(endpoint, toolName, args = {}) {
	try {
		const result = await sendJsonRpc(endpoint, 'tools/call', {
			name: toolName,
			arguments: args,
		});
		return { ok: true, result };
	} catch (error) {
		return { ok: false, error };
	}
}

function includesTool(list, name) {
	try {
		if (Array.isArray(list)) {
			return list.some((t) => (typeof t === 'string' ? t === name : t?.name === name));
		}
		if (list && typeof list === 'object') {
			const arr = list.tools || list.data || list.result || [];
			return includesTool(arr, name);
		}
	} catch {
		// noop
	}
	return false;
}


async function listTools(endpoint) {
	try {
		return await sendJsonRpc(endpoint, 'tools/list', {});
	} catch (error) {
		warn(`tools/list failed on ${endpoint}: ${error instanceof Error ? error.message : error}`);
		return null;
	}
}

function validateExpectedFromListed(listResult, validateTool, expected) {
	if (!listResult) return { ok: false, reason: 'listing unavailable' };
	if (validateTool && !includesTool(listResult, validateTool)) {
		return { ok: false, reason: `Expected tool '${validateTool}' not listed` };
	}
	for (const t of expected) {
		if (!includesTool(listResult, t)) {
			return { ok: false, reason: `Expected tool '${t}' not listed` };
		}
	}
	return { ok: true };
}

async function directValidate(endpoint, validateTool, expected) {
	if (validateTool) {
		const res = await tryCallTool(endpoint, validateTool, {});
		if (!res.ok) return { ok: false, reason: `Tool '${validateTool}' call failed` };
	}
	for (const t of expected) {
		const res = await tryCallTool(endpoint, t, {});
		if (!res.ok) return { ok: false, reason: `Tool '${t}' call failed` };
	}
	return { ok: true };
}

async function validateTools(endpoint) {
	const validateTool = process.env.MCP_STATUS_VALIDATE_TOOL;
	const expected = parseExpectedTools();
	if (!validateTool && expected.length === 0) return { ok: true, mode: 'none' };

	const listResult = await listTools(endpoint);
	if (listResult) {
		const listedOk = validateExpectedFromListed(listResult, validateTool, expected);
		if (listedOk.ok) return { ok: true, mode: 'tools.list' };
	}

	const directOk = await directValidate(endpoint, validateTool, expected);
	return directOk.ok
		? { ok: true, mode: 'direct-call' }
		: { ok: false, reason: directOk.reason || 'validation failed' };
}

export async function checkMcpStatus(opts = {}) {
	const { endpointOverride } = opts;
	const candidates = endpointOverride ? [endpointOverride] : collectEndpointCandidates();
	if (candidates.length === 0) {
		fail('No MCP endpoint candidates found. Set MCP_ENDPOINT or LOCAL_MEMORY_BASE_URL.');
	}

	for (const endpoint of candidates) {
		log(`Trying MCP endpoint: ${endpoint}`);
		const ping = await tryPing(endpoint);
		if (!ping.ok) {
			warn(`Ping failed for ${endpoint}: ${ping.error?.message || ping.error}`);
			continue;
		}
		log(`Ping OK on ${endpoint}`);

		const tools = await validateTools(endpoint);
		if (!tools.ok) {
			const msg = `Tools validation failed on ${endpoint}: ${tools.reason || 'unknown'}`;
			if (STRICT) return fail(msg);
			warn(msg);
		} else {
			log(`Tools validation mode: ${tools.mode}`);
		}

		return { endpoint, ping: ping.result, toolsMode: tools.mode ?? 'none' };
	}

	fail('All MCP endpoint candidates failed ping.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		await checkMcpStatus();
		log('MCP status OK');
	} catch (e) {
		if (IS_CI) fail(e instanceof Error ? e.message : String(e));
		throw e;
	}
}
