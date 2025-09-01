import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_HEX = process.env.MEMORIES_ENCRYPTION_KEY;
if (!KEY_HEX) {
  throw new Error('MEMORIES_ENCRYPTION_KEY missing');
}
const KEY = Buffer.from(KEY_HEX, 'hex');
if (KEY.length !== 32) {
  throw new Error('MEMORIES_ENCRYPTION_KEY must be 32 bytes hex');
}

export function encrypt(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}
