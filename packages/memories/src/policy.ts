import { AccessPolicy, TenantCtx } from './types.js';

// Default policy inside a tenant = allow.
// Switch to default-deny by setting MEM_DEFAULT_DENY=true.
const DEFAULT_DENY = process.env.MEM_DEFAULT_DENY === 'true';

function idFor(ctx: TenantCtx) {
  return ctx.userId ?? ctx.agentId ?? 'anonymous';
}

export function checkRead(policy: AccessPolicy | undefined, ctx: TenantCtx): boolean {
  if (!policy) {
    return !DEFAULT_DENY;
  }
  const id = idFor(ctx);
  if (policy.canRead.includes('*') || policy.canRead.includes(id)) {
    return true;
  }
  return false;
}

export function enforceRead(policy: AccessPolicy | undefined, ctx: TenantCtx): void {
  if (!checkRead(policy, ctx)) {
    throw new Error('policy:read_denied');
  }
}

export function enforceWrite(policy: AccessPolicy | undefined, ctx: TenantCtx): void {
  if (!policy) {
    if (DEFAULT_DENY) throw new Error('policy:write_denied');
    return;
  }
  const id = idFor(ctx);
  if (!policy.canWrite.includes(id) && !policy.canWrite.includes('*'))
    throw new Error('policy:write_denied');
}