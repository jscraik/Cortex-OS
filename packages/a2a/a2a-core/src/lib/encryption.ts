import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const NONCE_LEN = 12;

export interface CipherPayload {
  ciphertext: string;
  nonce: string;
  tag: string;
}

export function encrypt(data: unknown, key: Buffer): CipherPayload {
  const iv = randomBytes(NONCE_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(data);
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString('base64'),
    nonce: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decrypt(payload: CipherPayload, key: Buffer): unknown {
  const iv = Buffer.from(payload.nonce, 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(dec.toString('utf8'));
}
