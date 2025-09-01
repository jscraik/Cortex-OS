import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const b64 = process.env.MEMORIES_ENCRYPTION_KEY || '';
  const buf = Buffer.from(b64, 'base64');
  if (buf.length !== 32) {
    throw new Error('MEMORIES_ENCRYPTION_KEY must be 32 bytes base64');
  }
  return buf;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(enc: string): string {
  const buf = Buffer.from(enc, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}
