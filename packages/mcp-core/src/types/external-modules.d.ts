declare module '@cortex-os/utils' {
        export interface SafeFetchOptions {
                fetchOptions?: RequestInit;
                allowedHosts?: string[];
                allowedProtocols?: string[];
                allowLocalhost?: boolean;
                timeout?: number;
                timeoutMs?: number;
        }

        export function safeFetch(
                input: RequestInfo | URL,
                init?: SafeFetchOptions,
        ): Promise<Response>;
}

declare module '@cortex-os/contracts' {
        type ZodType<T> = import('zod').ZodType<T>;
        type ZodObjectType = import('zod').ZodObject<Record<string, import('zod').ZodTypeAny>>;

        export type CheckpointId = `ckpt_${string}` | string;

        export interface CheckpointMeta {
                id: CheckpointId;
                createdAt: string;
                labels?: string[];
                tags?: string[];
                description?: string;
                [key: string]: unknown;
        }

        export interface StateEnvelope {
                version?: string;
                data: unknown;
                [key: string]: unknown;
        }

        export interface CheckpointRecord {
                meta: CheckpointMeta;
                state: StateEnvelope;
        }

        export type CheckpointContext = CheckpointRecord;
        export type CheckpointSnapshot = CheckpointRecord;
        export interface CheckpointListPage {
                items: CheckpointRecord[];
                nextCursor?: string | null;
        }

        export const CheckpointIdSchema: ZodType<CheckpointId>;
        export const CheckpointMetaSchema: ZodObjectType;
        export const StateEnvelopeSchema: ZodType<StateEnvelope>;
        export const CheckpointRecordSchema: ZodType<CheckpointRecord>;
}

declare module '@cortex-os/memory-core' {
        export type CheckpointContext = import('@cortex-os/contracts').CheckpointContext;
        export type CheckpointListPage = import('@cortex-os/contracts').CheckpointListPage;
        export type CheckpointRecord = import('@cortex-os/contracts').CheckpointRecord;
        export type CheckpointSnapshot = import('@cortex-os/contracts').CheckpointSnapshot;

        export interface CheckpointBranchRequest {
                from: string;
                count: number;
                labels?: string[];
        }

        export interface CheckpointManager {
                save(record: CheckpointRecord): Promise<CheckpointRecord>;
                context(id: string): Promise<CheckpointContext | null>;
                list(limit: number, cursor?: string): Promise<CheckpointListPage>;
                snapshot(id: string): Promise<CheckpointSnapshot | null>;
                branch(request: CheckpointBranchRequest): Promise<{ branchId: string; checkpoints: string[] }>;
                prune(): Promise<number>;
        }

        export interface MemoryProvider {
                checkpoints?: CheckpointManager;
        }

        export function createMemoryProviderFromEnv(): MemoryProvider;
}
