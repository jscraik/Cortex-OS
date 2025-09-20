/**
 * @fileoverview Basic Tool Security Validation Test - Phase 3.5
 * @module ToolSecurityLayer.basic.test
 * @description Basic validation tests for tool security layer
 * @author brAInwav Development Team
 * @version 3.5.0
 * @since 2024-12-09
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ToolSecurityLayer } from '../tool-security-layer';

describe('ToolSecurityLayer Basic', () => {
	let security: ToolSecurityLayer;

	beforeEach(() => {
		security = new ToolSecurityLayer();
	});

	it('should create security layer instance', () => {
		expect(security).toBeInstanceOf(ToolSecurityLayer);
	});

	it('should validate legitimate input', async () => {
		const input = { operation: 'read', path: '/safe/file.txt' };
		const result = await security.validateInput(input);
		expect(result).toEqual(input);
	});

	it('should detect prototype pollution', async () => {
		// Create actual prototype pollution attempt
		const input = JSON.parse('{"__proto__": {"isAdmin": true}}');
		await expect(security.validateInput(input)).rejects.toThrow(/prototype pollution/i);
	});

	it('should sanitize HTML content', async () => {
		const input = { content: '<script>evil</script>Safe content' };
		const result = (await security.sanitizeInput(input)) as Record<string, string>;
		expect(result.content).not.toContain('<script>');
		expect(result.content).toContain('Safe content');
	});

	it('should detect path traversal', async () => {
		const input = { path: '../../../etc/passwd' };
		await expect(security.validateInput(input)).rejects.toThrow(/path traversal/i);
	});

	it('should reject dangerous URL schemes', async () => {
		const input = { url: 'javascript:alert("evil")' };
		await expect(security.validateInput(input)).rejects.toThrow(/invalid URL scheme/i);
	});

	it('should enforce role-based access', async () => {
		const operation = { operation: 'admin-task', requiresRole: 'admin' };
		const userContext = { userId: 'user1', roles: ['user'] };

		await expect(security.checkAuthorization(operation, userContext)).rejects.toThrow(
			/authorization denied/i,
		);
	});

	it('should allow access with proper role', async () => {
		const operation = { operation: 'admin-task', requiresRole: 'admin' };
		const adminContext = { userId: 'admin1', roles: ['admin'] };

		const result = await security.checkAuthorization(operation, adminContext);
		expect(result).toBe(true);
	});
});
