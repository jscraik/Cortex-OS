/**
 * @file_path packages/mcp/src/gitmcp-client.ts
 * @description Lightweight HTTP client for Cortex OS GitMCP bridge
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-09
 * @version 1.0.0
 * @status active
 */

export type GitMcpAction = "search" | "fetch";

export type GitMcpSearchRequest = {
	action: "search";
	repo: string; // "owner/repo"
	query: string;
	limit?: number; // default 8
};

export type GitMcpFetchRequest = {
	action: "fetch";
	repo: string; // "owner/repo"
};

export type GitMcpRequest = GitMcpSearchRequest | GitMcpFetchRequest;

/**
 * POSTs to {baseUrl}/mcp/gitmcp with the provided body and returns parsed JSON.
 * The server/gateway determines the final tool routing (register-once, per-repo at call time).
 */
export async function callGitMcp<T = unknown>(
	baseUrl: string,
	body: GitMcpRequest,
): Promise<T> {
	const base = baseUrl.replace(/\/$/, "");
	const res = await fetch(`${base}/mcp/gitmcp`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(`GitMCP gateway error: ${res.status}`);
	}
	return (await res.json()) as T;
}

/**
 * Utility: pick an appropriate base URL for the given repo visibility.
 * - private → CORTEX_GATEWAY_URL (required)
 * - public/local dev → CORTEX_LOCAL_BRIDGE_URL (required)
 */
export type Visibility = "public" | "private" | "local";

export function pickGitMcpBaseUrl(visibility: Visibility): string {
	if (visibility === "private") {
		const gateway = process.env.CORTEX_GATEWAY_URL;
		if (!gateway) {
			throw new Error("CORTEX_GATEWAY_URL is not set");
		}
		return gateway;
	}

	const bridge = process.env.CORTEX_LOCAL_BRIDGE_URL;
	if (!bridge) {
		throw new Error("CORTEX_LOCAL_BRIDGE_URL is not set");
	}
	return bridge;
}
