export interface EncryptionService {
	encrypt(plaintext: string): Promise<string>;
	decrypt(ciphertext: string): Promise<string>;
	name(): string;
}

export class InMemoryAesGcm implements EncryptionService {
	private key: Buffer;
	private readonly alg = 'aes-256-gcm';
	constructor(secret: string) {
		// Derive 32 bytes from secret
		this.key = Buffer.alloc(32);
		Buffer.from(secret).copy(this.key, 0, 0, Math.min(32, secret.length));
	}
	name() {
		return 'aes-256-gcm';
	}
	async encrypt(plaintext: string): Promise<string> {
		const { randomBytes, createCipheriv } = await import('node:crypto');
		const iv = randomBytes(12);
		const cipher = createCipheriv(this.alg, this.key, iv);
		const enc = Buffer.concat([
			cipher.update(plaintext, 'utf8'),
			cipher.final(),
		]);
		const tag = cipher.getAuthTag();
		return Buffer.concat([iv, tag, enc]).toString('base64');
	}
	async decrypt(ciphertext: string): Promise<string> {
		const { createDecipheriv } = await import('node:crypto');
		const data = Buffer.from(ciphertext, 'base64');
		const iv = data.subarray(0, 12);
		const tag = data.subarray(12, 28);
		const enc = data.subarray(28);
		const decipher = createDecipheriv(this.alg, this.key, iv);
		decipher.setAuthTag(tag);
		const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
		return dec.toString('utf8');
	}
}
