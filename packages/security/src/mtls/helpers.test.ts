import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import * as tls from 'node:tls';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type MTLSConfig, MTLSError } from '../types.js';
import { createClientSocket, loadCertificates } from './helpers.js';

vi.mock('@cortex-os/telemetry', () => ({ logWithSpan: vi.fn() }));
vi.mock('fs/promises', () => ({ readFile: vi.fn() }));
vi.mock('tls', async () => {
	const actual = await vi.importActual<typeof import('tls')>('tls');
	return { ...actual, connect: vi.fn() };
});

describe('loadCertificates', () => {
	afterEach(() => vi.clearAllMocks());

	it('reads certificate files', async () => {
		const mock = readFile as unknown as ReturnType<typeof vi.fn>;
		mock.mockResolvedValueOnce('ca').mockResolvedValueOnce('cert').mockResolvedValueOnce('key');
		const config: MTLSConfig = {
			caCertificate: 'ca.pem',
			clientCertificate: 'client.pem',
			clientKey: 'client.key',
			rejectUnauthorized: true,
			minVersion: 'TLSv1.2',
		};
		const certs = await loadCertificates(config);
		expect(certs).toEqual({ ca: 'ca', cert: 'cert', key: 'key' });
		expect(mock).toHaveBeenCalledTimes(3);
	});
});

describe('createClientSocket', () => {
	afterEach(() => vi.clearAllMocks());

	const config: MTLSConfig = {
		caCertificate: 'ca.pem',
		clientCertificate: 'client.pem',
		clientKey: 'client.key',
		rejectUnauthorized: true,
		minVersion: 'TLSv1.2',
	};
	const certs = { ca: 'ca', cert: 'cert', key: 'key' };

	it('resolves on secure connection', async () => {
		const socket = new EventEmitter() as unknown as tls.TLSSocket;
		(socket as unknown as tls.TLSSocket & { authorized: boolean }).authorized = true;
		const connect = tls.connect as unknown as ReturnType<typeof vi.fn>;
		connect.mockReturnValue(socket);
		const promise = createClientSocket('host', 443, config, certs);
		socket.emit('secureConnect');
		await expect(promise).resolves.toBe(socket);
	});

	it('rejects on error', async () => {
		const socket = new EventEmitter() as unknown as tls.TLSSocket;
		const connect = tls.connect as unknown as ReturnType<typeof vi.fn>;
		connect.mockReturnValue(socket);
		const promise = createClientSocket('host', 443, config, certs);
		socket.emit('error', new Error('bad'));
		await expect(promise).rejects.toBeInstanceOf(MTLSError);
	});
});
