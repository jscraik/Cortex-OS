import crypto from 'node:crypto';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { hashContent } from './redactor.js';

export interface InTotoStatement {
	_type: 'https://in-toto.io/Statement/v0.1';
	subject: Array<{
		name: string;
		digest: {
			sha256: string;
		};
	}>;
	predicateType: 'https://cortex-os.dev/attestations/cbom/1.0';
	predicate: {
		cbomDigest: string;
		generatedAt: string;
	};
}

export interface CbomAttestationBundle {
	statement: InTotoStatement;
	signature: string;
	publicKey: string;
	algorithm: 'ed25519';
}

export interface SignOptions {
	output?: string;
	keyPath?: string;
}

export interface VerifyOptions {
	cbomPath?: string;
}

export class CbomSigner {
	async sign(cbomPath: string, options: SignOptions = {}): Promise<CbomAttestationBundle> {
		const absolutePath = path.resolve(cbomPath);
		const cbomPayload = await fs.readFile(absolutePath, 'utf8');
		const cbomDigest = hashContent(cbomPayload).replace('sha256:', '');
		const statement: InTotoStatement = {
			_type: 'https://in-toto.io/Statement/v0.1',
			subject: [
				{
					name: path.basename(absolutePath),
					digest: { sha256: cbomDigest },
				},
			],
			predicateType: 'https://cortex-os.dev/attestations/cbom/1.0',
			predicate: {
				cbomDigest: cbomDigest,
				generatedAt: new Date().toISOString(),
			},
		};

		const keyPair = await this.loadOrCreateKeyPair(options.keyPath);
		const signature = crypto.sign(null, Buffer.from(JSON.stringify(statement)), keyPair.privateKey);

		const bundle: CbomAttestationBundle = {
			statement,
			signature: signature.toString('base64'),
			publicKey: keyPair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
			algorithm: 'ed25519',
		};

		if (options.output) {
			await fs.mkdir(path.dirname(options.output), { recursive: true });
			await fs.writeFile(options.output, JSON.stringify(bundle, null, 2), 'utf8');
		}

		return bundle;
	}

	async verify(bundlePath: string, options: VerifyOptions = {}): Promise<void> {
		const bundle = JSON.parse(
			await fs.readFile(path.resolve(bundlePath), 'utf8'),
		) as CbomAttestationBundle;
		verifyCbomBundle(bundle, options.cbomPath);
	}

	private async loadOrCreateKeyPair(
		keyPath?: string,
	): Promise<{ privateKey: crypto.KeyObject; publicKey: crypto.KeyObject }> {
		if (!keyPath) {
			return crypto.generateKeyPairSync('ed25519');
		}
		const resolved = path.resolve(keyPath);
		try {
			const [privPem, pubPem] = await Promise.all([
				fs.readFile(resolved, 'utf8'),
				fs.readFile(`${resolved}.pub`, 'utf8'),
			]);
			return {
				privateKey: crypto.createPrivateKey(privPem),
				publicKey: crypto.createPublicKey(pubPem),
			};
		} catch (_error) {
			// Log the error; file not found is expected on first run, but other errors may indicate a problem.
			console.warn(`Failed to read key files at ${resolved}:`, _error);
			const pair = crypto.generateKeyPairSync('ed25519');
			await fs.mkdir(path.dirname(resolved), { recursive: true });
			await fs.writeFile(
				resolved,
				pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString('utf8'),
				'utf8',
			);
			await fs.writeFile(
				`${resolved}.pub`,
				pair.publicKey.export({ format: 'pem', type: 'spki' }).toString('utf8'),
				'utf8',
			);
			return pair;
		}
	}
}

export function verifyCbomBundle(bundle: CbomAttestationBundle, cbomPath?: string): void {
	if (bundle.algorithm !== 'ed25519') {
		throw new Error(`Unsupported algorithm: ${bundle.algorithm}`);
	}
	const publicKey = crypto.createPublicKey({
		key: Buffer.from(bundle.publicKey, 'base64'),
		format: 'der',
		type: 'spki',
	});
	const statementBytes = Buffer.from(JSON.stringify(bundle.statement));
	const signatureBytes = Buffer.from(bundle.signature, 'base64');
	const verified = crypto.verify(null, statementBytes, publicKey, signatureBytes);
	if (!verified) {
		throw new Error('CBOM attestation signature verification failed');
	}
	if (cbomPath) {
		const cbomDigest = hashContent(readFileSync(cbomPath, 'utf8')).replace('sha256:', '');
		const subjectDigest = bundle.statement.subject[0]?.digest.sha256;
		if (subjectDigest !== cbomDigest) {
			throw new Error('CBOM digest mismatch during attestation verification');
		}
	}
}
