// Declaration shims for external packages to keep this package self-contained during typecheck.
// These provide minimal types used by @cortex-os/orchestration without pulling in external source files.

// Agents package shims
declare module '@cortex-os/agents' {
  export type Agent = unknown;
  export type Executor = unknown;

  export interface AgentMCPClient {
    // minimal placeholder
  }
  export interface ArchonIntegrationConfig {
    // minimal placeholder
  }
  export enum Priority {
    Low = 'low',
    Medium = 'medium',
    High = 'high',
  }
  export enum TaskStatus {
    Pending = 'pending',
    InProgress = 'in_progress',
    Done = 'done',
    Failed = 'failed',
  }
  export function createAgentMCPClient(config?: any): AgentMCPClient;
}

// Memories package shims
declare module '@cortex-os/memories' {
  export interface Memory {
    id: string;
    kind: string;
    text?: string;
    [k: string]: any;
  }
  export interface MemoryService {
    upsert(mem: Memory): Promise<void> | void;
    query?(q: any): Promise<any>;
  }
}

// PRP Runner shims
declare module '@cortex-os/prp-runner' {
  export type Neuron = unknown;
  export class PRPOrchestrator {
    constructor(...args: any[]);
  }
  export type LLMConfig = any;
}

// A2A contracts and bus shims
declare module '@cortex-os/a2a-contracts/envelope' {
  export type Envelope<T = any> = {
    id: string;
    type: string;
    source: string;
    time: string;
    data: T;
    traceparent?: string;
    correlation_id?: string;
  };
}

declare module '@cortex-os/a2a-core/bus' {
  import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
  export interface BusOptions {
    name?: string;
  }
  export interface Bus {
    publish<T = any>(evt: Envelope<T>): Promise<void>;
    bind?(...args: any[]): any;
  }
  export function createBus(_opts?: BusOptions): Bus;
}

declare module '@cortex-os/a2a-transport/inproc' {
  export const inproc: {
    name: 'inproc';
  };
}

// Kernel shim (indirectly referenced by prp-runner)
declare module '@cortex-os/kernel' {
  export type PRPState = any;
  export type Evidence = any;
  export function createKernelGraph(...args: any[]): any;
}

// Policy shim
declare module '@cortex-os/policy' {
  export function enforce(_policy: any, _input: any): any;
  export function loadGrant(_id: string): Promise<any>;
}
