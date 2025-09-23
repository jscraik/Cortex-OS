import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEnvelope } from '../../a2a-contracts/src/envelope.js';
import {
	AuthenticationError,
	createSimpleTokenAuthenticator,
	type SimpleTokenAuthenticator,
} from '../src/auth/authenticator.js';

describe('A2A Authentication', () => {
	let authenticator: SimpleTokenAuthenticator;
	const mockSecret = 'test-secret-key';
	const mockIssuer = 'cortex-os';

	beforeEach(() => {
		authenticator = createSimpleTokenAuthenticator({
			secret: mockSecret,
			issuer: mockIssuer,
		});
	});

	describe('Token Authentication', () => {
		it('should reject messages without authentication', async () => {
			const envelope = createEnvelope({
				type: 'task.execute',
				source: 'urn:cortex:agent:unauthorized',
				data: { command: 'sensitive_operation' },
			});

			await expect(authenticator.authenticate(envelope)).rejects.toThrow(AuthenticationError);
		});

		it('should accept messages with valid token', async () => {
			const payload = {
				sub: 'agent-1',
				iss: mockIssuer,
				exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
				scopes: ['task.execute'],
			};

			// Create a mock token (base64 payload + signature)
			const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
			const mockSignature = 'mock-signature';
			const token = `${payloadB64}.${Buffer.from(mockSignature).toString('base64')}`;

			const envelope = createEnvelope({
				type: 'task.execute',
				source: 'urn:cortex:agent:authorized',
				data: { command: 'sensitive_operation' },
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			// Mock the signature verification for testing
			const mockedAuthenticator = authenticator as unknown as {
				createSignature: (payload: string) => Buffer;
			};
			vi.spyOn(mockedAuthenticator, 'createSignature').mockReturnValue(Buffer.from(mockSignature));

			const authContext = await authenticator.authenticate(envelope);

			expect(authContext.subject).toBe('agent-1');
			expect(authContext.scopes).toEqual(['task.execute']);
		});

		it('should enforce role-based access control', () => {
			const context = {
				subject: 'agent-2',
				scopes: ['task.read'],
				expiresAt: new Date(Date.now() + 3600000),
			};

			// Should allow task.read operation
			expect(authenticator.authorize(context, 'task.read')).toBe(true);

			// Should deny task.write operation
			expect(authenticator.authorize(context, 'task.write')).toBe(false);

			// Admin scope should allow everything
			const adminContext = { ...context, scopes: ['*'] };
			expect(authenticator.authorize(adminContext, 'task.delete')).toBe(true);
		});

		it('should validate message source against authenticated identity', async () => {
			const payload = {
				sub: 'agent-1',
				source: 'urn:cortex:agent:1',
				iss: mockIssuer,
				exp: Math.floor(Date.now() / 1000) + 3600,
			};

			const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
			const token = `${payloadB64}.mock-signature`;

			const envelope = createEnvelope({
				type: 'task.execute',
				source: 'urn:cortex:agent:2', // Mismatched source
				data: { command: 'operation' },
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const mockedAuthenticator3 = authenticator as unknown as {
				createSignature: (payload: string) => Buffer;
			};
			vi.spyOn(mockedAuthenticator3, 'createSignature').mockReturnValue(
				Buffer.from('mock-signature'),
			);

			await expect(authenticator.authenticate(envelope)).rejects.toThrow('Source mismatch');
		});

		it('should reject expired tokens', async () => {
			const payload = {
				sub: 'agent-1',
				iss: mockIssuer,
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
			};

			const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
			const token = `${payloadB64}.mock-signature`;

			const envelope = createEnvelope({
				type: 'task.execute',
				source: 'urn:cortex:agent:1',
				data: { command: 'operation' },
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const mockedAuthenticator4 = authenticator as unknown as {
				createSignature: (payload: string) => Buffer;
			};
			vi.spyOn(mockedAuthenticator4, 'createSignature').mockReturnValue(
				Buffer.from('mock-signature'),
			);

			await expect(authenticator.authenticate(envelope)).rejects.toThrow('Token expired');
		});
	});
});
