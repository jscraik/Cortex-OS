// Policy gates: placeholders for sandbox/rate/auth enforcement.
export type PolicyContext = { user?: string; org?: string; claims?: Record<string, unknown> };

export interface Policy {
  id: string;
  check(ctx: PolicyContext): Promise<void>;
}

export const allowAll: Policy = { id: "allow.all", async check() {} };

