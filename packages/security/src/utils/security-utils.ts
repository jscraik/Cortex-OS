/**
 * @file Security Utilities
 * @description Utility functions for security operations
 */

import { X509Certificate } from "node:crypto";
import type { SecurityError } from "../types.js";

export type { SecurityError };

/**
 * Generate a random nonce for cryptographic operations.
 * Requires Node.js 18+ where global `crypto` is available.
 */
export function generateNonce(length = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

/**
 * Validate SPIFFE ID format
 */
export function isValidSpiffeId(spiffeId: string): boolean {
	const spiffeRegex = /^spiffe:\/\/[^/]+\/[^/]+.*$/;
	return spiffeRegex.test(spiffeId);
}

/**
 * Extract trust domain from SPIFFE ID
 */
export function extractTrustDomain(spiffeId: string): string | null {
	const match = spiffeId.match(/^spiffe:\/\/([^/]+)(?:\/.*)?$/);
	return match ? match[1] : null;
}

/**
 * Extract workload path from SPIFFE ID
 */
export function extractWorkloadPath(spiffeId: string): string | null {
	const match = spiffeId.match(/^spiffe:\/\/[^/]+(\/.*)$/);
	return match ? match[1] : null;
}

/**
 * Check if a certificate is expired
 */
export function isCertificateExpired(certPem: string): boolean {
	try {
		const cert = new X509Certificate(certPem);
		return new Date(cert.validTo).getTime() <= Date.now();
	} catch {
		return true;
	}
}

/**
 * Sanitize selectors for logging
 */
export function sanitizeSelectors(
	selectors: Record<string, string>,
): Record<string, string> {
	const sanitized: Record<string, string> = {};

	for (const [key, value] of Object.entries(selectors)) {
		// Remove sensitive information from selectors
		if (
			key.toLowerCase().includes("secret") ||
			key.toLowerCase().includes("password") ||
			key.toLowerCase().includes("token")
		) {
			sanitized[key] = "[REDACTED]";
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Create a security context ID
 */
export function createSecurityContextId(): string {
	const timestamp = Date.now().toString(36);
	const random = generateNonce(8);
	return `sec-${timestamp}-${random}`;
}

/**
 * Validate security context
 */
export function validateSecurityContext(context: {
	spiffeId?: string;
	trustDomain?: string;
	workloadPath?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!context.spiffeId) {
		errors.push("SPIFFE ID is required");
	} else if (!isValidSpiffeId(context.spiffeId)) {
		errors.push("Invalid SPIFFE ID format");
	}

	if (!context.trustDomain) {
		errors.push("Trust domain is required");
	}

	if (!context.workloadPath) {
		errors.push("Workload path is required");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
