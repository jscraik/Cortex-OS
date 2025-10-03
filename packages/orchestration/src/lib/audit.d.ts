import { CloudEvent } from '../integrations/cloudevents.js';
export declare function auditEvent(
	tool: string,
	action: string,
	ctx: {
		runId: string;
		traceId?: string;
	},
	args: unknown,
): CloudEvent<{
	args: unknown;
	traceId: string;
}>;
export declare function enableMemoryAuditBuffer(limit?: number): void;
export declare function getMemoryAuditBuffer(): unknown[] | null;
export declare function setAuditPublisher(
	fn: (evt: ReturnType<typeof auditEvent>) => Promise<void> | void,
): void;
export declare function record(evt: ReturnType<typeof auditEvent>): Promise<void>;
//# sourceMappingURL=audit.d.ts.map
