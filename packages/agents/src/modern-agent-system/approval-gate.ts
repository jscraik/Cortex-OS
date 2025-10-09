import type {
	ApprovalConfiguration,
	ApprovalDecision,
	ApprovalGate,
	ApprovalRequest,
} from './types.js';

const autoApprove = async (_request: ApprovalRequest): Promise<ApprovalDecision> => ({
	approved: true,
	metadata: { strategy: 'auto', brand: 'brAInwav' },
});

export const createApprovalGate = (config?: ApprovalConfiguration): ApprovalGate => {
	const requireApproval = config?.require ?? false;
	const gate = config?.gate ?? autoApprove;
	const requestApproval = async (request: ApprovalRequest) => {
		if (!requireApproval) return autoApprove(request);
		const decision = await gate(request);
		if (!decision.approved) {
			return { ...decision, approved: false };
		}
		return { ...decision, approved: true };
	};
	return { requireApproval, requestApproval };
};
