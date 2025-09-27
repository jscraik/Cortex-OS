import { describe, expect, it } from 'vitest';
import { logInfo } from '../a2a-core/src/lib/logging.js';

describe('Simple brAInwav Test', () => {
	it('should log with brAInwav branding', () => {
		logInfo('Testing brAInwav logging utility', 'brAInwav-Test');
		expect(true).toBe(true);
	});
});
