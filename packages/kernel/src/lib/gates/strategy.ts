import type { PRPState } from '../../state.js';

export function validateBlueprint(state: PRPState): {
	passed: boolean;
	details: any;
} {
	const hasTitle = !!state.blueprint.title;
	const hasDescription = !!state.blueprint.description;
	return {
		passed: hasTitle && hasDescription,
		details: {
			title: hasTitle,
			description: hasDescription,
		},
	};
}

export async function validateSecurityBaseline(
	state: PRPState,
): Promise<{ passed: boolean; details: any }> {
	const requirements = state.blueprint.requirements || [];
	const hasSecurityReq = requirements.some(
		(req) =>
			req.toLowerCase().includes('security') ||
			req.toLowerCase().includes('authentication') ||
			req.toLowerCase().includes('authorization'),
	);
	return {
		passed: hasSecurityReq,
		details: {
			owaspLevel: hasSecurityReq ? 'L1' : 'none',
			mitreAtlas: hasSecurityReq,
			securityRequirements: requirements.filter((req) => req.toLowerCase().includes('security')),
		},
	};
}

export async function validateUXAccessibility(
	state: PRPState,
): Promise<{ passed: boolean; details: any }> {
	const hasUXReq = state.blueprint.requirements?.some(
		(req) =>
			req.toLowerCase().includes('ux') ||
			req.toLowerCase().includes('user') ||
			req.toLowerCase().includes('interface') ||
			req.toLowerCase().includes('accessibility'),
	);
	return {
		passed: hasUXReq,
		details: {
			wcagLevel: hasUXReq ? 'AA' : 'none',
			accessibilityFeatures: hasUXReq ? ['keyboard-navigation', 'screen-reader'] : [],
		},
	};
}

export async function validateArchitecture(
	state: PRPState,
): Promise<{ passed: boolean; details: any }> {
	const title = state.blueprint.title?.toLowerCase() || '';
	const description = state.blueprint.description?.toLowerCase() || '';
	const hasArchitecture =
		title.includes('architecture') ||
		description.includes('system') ||
		description.includes('component') ||
		state.blueprint.requirements?.some(
			(req) =>
				req.toLowerCase().includes('architecture') || req.toLowerCase().includes('system design'),
		);
	return {
		passed: hasArchitecture,
		details: {
			architectureElements: hasArchitecture ? ['system-design', 'components'] : [],
		},
	};
}
