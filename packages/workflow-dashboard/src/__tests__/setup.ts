import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { afterEach, expect } from 'vitest';

// Extend Vitest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Cleanup after each test
afterEach(() => {
	cleanup();
});
