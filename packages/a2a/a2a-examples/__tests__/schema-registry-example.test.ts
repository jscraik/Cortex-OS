import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	demonstrateManualValidation,
	runSchemaRegistryExample,
} from '../schema-registry-example.js';

// Mock the logger
const mockLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
};

vi.mock('@cortex-os/logging', () => ({
	createLogger: () => mockLogger,
}));

describe('schema-registry-example', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('runSchemaRegistryExample', () => {
		it('should run example workflow and log appropriate messages', async () => {
			await runSchemaRegistryExample();

			// Verify that logger was called for key messages
			expect(mockLogger.info).toHaveBeenCalledWith('=== Event Schema Registry Example ===');
			expect(mockLogger.info).toHaveBeenCalledWith('📋 Registering schemas...');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Schemas registered successfully');
			expect(mockLogger.info).toHaveBeenCalledWith('🔍 Demonstrating Schema Validation...');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Publishing valid user event...');
			expect(mockLogger.info).toHaveBeenCalledWith(
				'❌ Attempting to publish invalid user event...',
			);
			expect(mockLogger.info).toHaveBeenCalledWith('📊 Schema Registry Features...');
			expect(mockLogger.info).toHaveBeenCalledWith('🔄 Schema Compatibility Check...');
			expect(mockLogger.info).toHaveBeenCalledWith('=== Schema Registry Example Complete ===');
		});

		it('should handle validation errors gracefully', async () => {
			await runSchemaRegistryExample();

			// Should log validation error without throwing
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Validation Error:'));
		});
	});

	describe('demonstrateManualValidation', () => {
		it('should demonstrate manual validation and log results', async () => {
			await demonstrateManualValidation();

			expect(mockLogger.info).toHaveBeenCalledWith('=== Manual Schema Validation Example ===');
			expect(mockLogger.info).toHaveBeenCalledWith('Validating valid order:');
			expect(mockLogger.info).toHaveBeenCalledWith('Validating invalid order:');
			expect(mockLogger.info).toHaveBeenCalledWith('=== Manual Validation Example Complete ===');
		});
	});
});
