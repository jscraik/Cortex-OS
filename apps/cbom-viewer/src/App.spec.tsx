import type { CbomDocument } from '@cortex-os/cbom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.js';
import { useCbomFile } from './hooks/useCbomFile';
const hookState: ReturnType<typeof useCbomFile> = {
	document: null,
	error: null,
	openFile: vi.fn(),
};

vi.mock('./hooks/useCbomFile', () => ({
	useCbomFile: () => hookState,
}));

describe('App', () => {
	beforeEach(() => {
		hookState.document = null;
		hookState.error = null;
		hookState.openFile = vi.fn();
	});

	it('renders summary when document is loaded', () => {
		hookState.document = {
			version: '1.0.0',
			run: {
				id: 'run:test',
				startedAt: new Date().toISOString(),
				completedAt: new Date().toISOString(),
				digest: 'sha256:1234567890',
			},
			context: { tools: [], rag: [], files: [] },
			decisions: [],
			artifacts: [],
			policies: [],
		};

		render(<App />);
		expect(screen.getByText(/Run summary/i)).toBeInTheDocument();
	});

	it('shows error banner when hook returns error', () => {
		hookState.error = 'Invalid CBOM';
		render(<App />);
		expect(screen.getByRole('alert')).toHaveTextContent('Invalid CBOM');
	});
});
