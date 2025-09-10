import { describe, expect, test } from 'vitest';
import {
	ProcessingDispatcher,
	type ProcessingFile,
} from '../src/chunkers/dispatch';
import { ProcessingStrategy } from '../src/policy/mime';

describe('ProcessingDispatcher', () => {
	test('clears timeout to avoid unhandled rejection', async () => {
		const dispatcher = new ProcessingDispatcher({ timeout: 50 });
		const file: ProcessingFile = {
			path: 'file',
			content: Buffer.from('hello'),
			mimeType: 'text/plain',
			size: 5,
		};
		const strategy = {
			strategy: ProcessingStrategy.NATIVE_TEXT,
			confidence: 1,
			reason: '',
			processing: {
				chunker: 'text',
				requiresOCR: false,
				requiresUnstructured: false,
				maxPages: null,
			},
		};

		let unhandled: unknown;
		const handler = (reason: unknown) => {
			unhandled = reason;
		};
		process.once('unhandledRejection', handler);

		await dispatcher.dispatch(file, strategy);
		await new Promise((resolve) => setTimeout(resolve, 100));

		process.removeListener('unhandledRejection', handler);
		expect(unhandled).toBeUndefined();
	});
});
