import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { createLogger } from "@cortex-os/observability";
import { TypeGuards } from "@cortex-os/utils";

interface HitlRequest {
        id: string;
        runId: string;
        node: string;
        proposal: unknown;
        ts: string;
}

interface HitlDecision {
        requestId: string;
        approved: boolean;
        ts: string;
}

const emitter = new EventEmitter();
const pending = new Map<string, (approved: boolean) => void>();

/**
 * Wait for a human decision on a proposal. Emits a "request" event that
 * listeners can handle to present the proposal to a human reviewer.
 */
export async function waitForApproval(
        runId: string,
        node: string,
        proposal: unknown,
): Promise<boolean> {
        const id = randomUUID();
        const req: HitlRequest = {
                id,
                runId,
                node,
                proposal,
                ts: new Date().toISOString(),
        };
        emitter.emit("request", req);

        const timeout = Number(process.env.CORTEX_HITL_TIMEOUT_MS) || 5 * 60_000;
        return await new Promise<boolean>((resolve, reject) => {
                const to = setTimeout(() => {
                        pending.delete(id);
                        reject(new Error("HITL approval timeout"));
                }, timeout);
                pending.set(id, (approved) => {
                        clearTimeout(to);
                        resolve(approved);
                });
        });
}

/** Submit a decision for a given request. */
export function submitDecision(requestId: string, approved: boolean) {
        const resolver = pending.get(requestId);
        if (resolver) {
                pending.delete(requestId);
                resolver(approved);
        }
        const decision: HitlDecision = {
                requestId,
                approved,
                ts: new Date().toISOString(),
        };
        emitter.emit("decision", decision);
}

/** Subscribe to HITL requests. */
export function onHitlRequest(listener: (req: HitlRequest) => void) {
        emitter.on("request", listener);
}

export function requiresApproval(proposal: unknown): boolean {
        try {
                // Use proper type guard instead of 'any' assertion
                if (!TypeGuards.isProposalShape(proposal)) {
                        return false;
                }
                
                // Check for sensitive data classification
                if (proposal.dataClass === "sensitive") {
                        return true;
                }
                
                // Check for paths outside current working directory
                if (proposal.path && typeof proposal.path === "string") {
                        const cwd = process.cwd();
                        return !proposal.path.startsWith(cwd);
                }
                
                return false;
        } catch (error) {
                // Use structured logging for parsing errors
                const logger = createLogger('hitl');
                logger.warn({
                        error: error instanceof Error ? error.message : String(error),
                        context: 'proposal-validation',
                        proposalType: typeof proposal
                }, 'Failed to validate proposal for approval check');
                return false;
        }
}
