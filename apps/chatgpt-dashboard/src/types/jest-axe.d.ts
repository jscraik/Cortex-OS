declare module 'jest-axe' {
	export interface AxeResultNode {
		html: string;
		target: string[];
	}

	export interface AxeViolation {
		id: string;
		description: string;
		impact?: string;
		helpUrl?: string;
		nodes: AxeResultNode[];
	}

	export interface AxeResults {
		violations: AxeViolation[];
	}

	export function axe(
		element: HTMLElement | DocumentFragment,
		options?: unknown,
	): Promise<AxeResults>;
}
