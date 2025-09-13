import {
    AgentToolkitCodemodInputSchema,
    AgentToolkitSearchInputSchema,
    AgentToolkitSearchResultSchema,
    AgentToolkitValidationInputSchema,
} from '@cortex-os/contracts';
import { describe, expect, it } from 'vitest';

describe('Agent Toolkit Contracts', () => {
    it('should validate search input schema', () => {
        const validSearchInput = {
            pattern: 'test pattern',
            path: '/test/path',
        };

        const result = AgentToolkitSearchInputSchema.parse(validSearchInput);
        expect(result.pattern).toBe('test pattern');
        expect(result.path).toBe('/test/path');
    });

    it('should validate search result schema', () => {
        const validSearchResult = {
            tool: 'ripgrep' as const,
            op: 'search' as const,
            inputs: {
                pattern: 'test',
                path: '/test',
            },
            results: [
                {
                    file: 'test.ts',
                    line: 42,
                    text: 'test code',
                },
            ],
        };

        const result = AgentToolkitSearchResultSchema.parse(validSearchResult);
        expect(result.tool).toBe('ripgrep');
        expect(result.results).toHaveLength(1);
        expect(result.results[0].file).toBe('test.ts');
    });

    it('should validate codemod input schema', () => {
        const validCodemodInput = {
            find: 'old_function(:[args])',
            replace: 'new_function(:[args])',
            path: '/src',
        };

        const result = AgentToolkitCodemodInputSchema.parse(validCodemodInput);
        expect(result.find).toBe('old_function(:[args])');
        expect(result.replace).toBe('new_function(:[args])');
    });

    it('should validate validation input schema', () => {
        const validValidationInput = {
            files: ['test1.ts', 'test2.js', 'test3.py'],
        };

        const result =
            AgentToolkitValidationInputSchema.parse(validValidationInput);
        expect(result.files).toHaveLength(3);
        expect(result.files).toContain('test1.ts');
    });

    it('should reject invalid search input', () => {
        const invalidInput = {
            pattern: '', // Empty pattern should be invalid
            path: '/test',
        };

        expect(() => AgentToolkitSearchInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid validation input', () => {
        const invalidInput = {
            files: [], // Empty files array should be invalid
        };

        expect(() =>
            AgentToolkitValidationInputSchema.parse(invalidInput),
        ).toThrow();
    });

    it('should validate tool result with error', () => {
        const resultWithError = {
            tool: 'ripgrep' as const,
            op: 'search' as const,
            inputs: { pattern: 'test', path: '/test' },
            results: [],
            error: 'Tool execution failed',
        };

        const result = AgentToolkitSearchResultSchema.parse(resultWithError);
        expect(result.error).toBe('Tool execution failed');
        expect(result.results).toHaveLength(0);
    });

    it('should validate search result schema', () => {
        const validSearchResult = {
            tool: 'ripgrep' as const,
            op: 'search' as const,
            inputs: {
                pattern: 'test',
                path: '/test',
            },
            results: [
                {
                    file: 'test.ts',
                    line: 42,
                    text: 'test code',
                },
            ],
        };

        const result = AgentToolkitSearchResultSchema.parse(validSearchResult);
        expect(result).toEqual(validSearchResult);
    });

    it('should validate codemod input schema', () => {
        const validCodemodInput = {
            find: 'old_function(:[args])',
            replace: 'new_function(:[args])',
            path: '/src',
        };

        const result = AgentToolkitCodemodInputSchema.parse(validCodemodInput);
        expect(result.find).toBe('old_function(:[args])');
        expect(result.replace).toBe('new_function(:[args])');
    });

    it('should validate validation input schema', () => {
        const validValidationInput = {
            files: ['test1.ts', 'test2.js', 'test3.py'],
        };

        const result = AgentToolkitValidationInputSchema.parse(
            validValidationInput,
        );
        expect(result).toEqual(validValidationInput);
    });

    it('should reject invalid search input', () => {
        const invalidInput = {
            pattern: '', // Empty pattern should be invalid
            path: '/test',
        };

        expect(() =>
            AgentToolkitSearchInputSchema.parse(invalidInput),
        ).toThrow();
    });

    it('should reject invalid validation input', () => {
        const invalidInput = {
            files: [], // Empty files array should be invalid
        };

        expect(() =>
            AgentToolkitValidationInputSchema.parse(invalidInput),
        ).toThrow();
    });

    it('should validate tool result with error', () => {
        const resultWithError = {
            tool: 'ripgrep' as const,
            op: 'search' as const,
            inputs: { pattern: 'test', path: '/test' },
            results: [],
            error: 'Tool execution failed',
        };

        const result = AgentToolkitSearchResultSchema.parse(resultWithError);
        expect(result.error).toBe('Tool execution failed');
        expect(result.results).toHaveLength(0);
    });
});
