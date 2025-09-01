import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { sign, verify } from '@noble/ed25519';
import type { ServerInfo } from '@cortex-os/mcp-core/contracts';

const dir = () => join(os.homedir(), '.cortex', 'mcp', 'servers');
const indexPath = () => join(dir(), 'index.json');
const enc = new TextEncoder();

type Index = Record<string, { digest: string; signature?: string }>; 

const digestFor = (data: string) => `sha256:${bytesToHex(sha256(enc.encode(data)))}`;

async function readIndex(): Promise<Index> {
  try {
    return JSON.parse(await fs.readFile(indexPath(), 'utf8')) as Index;
  } catch {
    return {};
  }
}

async function writeIndex(idx: Index) {
  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(indexPath(), JSON.stringify(idx, null, 2));
}

async function signDigest(digest: string): Promise<string | undefined> {
  const key = process.env.MCP_REGISTRY_PRIVATE_KEY;
  if (!key) return undefined;
  const sig = await sign(enc.encode(digest), Buffer.from(key, 'hex'));
  return Buffer.from(sig).toString('base64');
}

async function verifyDigest(digest: string, sig?: string) {
  const key = process.env.MCP_REGISTRY_PUBLIC_KEY;
  if (!key || !sig) return true;
  return verify(Buffer.from(sig, 'base64'), enc.encode(digest), Buffer.from(key, 'hex'));
}

export async function readAll(): Promise<ServerInfo[]> {
  const index = await readIndex();
  const results: ServerInfo[] = [];
  for (const { digest, signature } of Object.values(index)) {
    const file = join(dir(), `${digest}.json`);
    const data = await fs.readFile(file, 'utf8');
    if (digestFor(data) !== digest) throw new Error('checksum mismatch');
    if (!(await verifyDigest(digest, signature))) throw new Error('invalid signature');
    results.push(JSON.parse(data) as ServerInfo);
  }
  return results;
}

export async function upsert(si: ServerInfo) {
  const data = JSON.stringify(si, null, 2);
  const digest = digestFor(data);
  const file = join(dir(), `${digest}.json`);
  try {
    const existing = await fs.readFile(file, 'utf8');
    if (existing !== data) throw new Error('digest conflict');
  } catch {
    await fs.mkdir(dir(), { recursive: true });
    await fs.writeFile(file, data);
  }
  const index = await readIndex();
  if (index[si.name] && index[si.name].digest !== digest) throw new Error('immutable entry');
  const signature = await signDigest(digest);
  index[si.name] = { digest, ...(signature ? { signature } : {}) };
  await writeIndex(index);
}

export async function remove(name: string) {
  const index = await readIndex();
  delete index[name];
  await writeIndex(index);
}
