import type { MemoryTemplate } from './types.js';

export interface TemplateValidationError {
	field: string;
	message: string;
	value: any;
}

export interface TemplateValidationResult {
	valid: boolean;
	errors: TemplateValidationError[];
	warnings?: string[];
}

export interface TemplateMigrationContext {
	fromVersion: string;
	toVersion: string;
	namespace: string;
	timestamp: string;
}

export class TemplateDomainService {
	/**
	 * Validates a template definition
	 */
	validateTemplate(template: MemoryTemplate): TemplateValidationResult {
		const errors: TemplateValidationError[] = [];

		// Check required fields
		if (!template.id || typeof template.id !== 'string') {
			errors.push({
				field: 'id',
				message: 'Template ID is required and must be a string',
				value: template.id
			});
		}

		if (!template.name || typeof template.name !== 'string') {
			errors.push({
				field: 'name',
				message: 'Template name is required and must be a string',
				value: template.name
			});
		}

		if (!template.version || typeof template.version !== 'string') {
			errors.push({
				field: 'version',
				message: 'Template version is required and must be a string',
				value: template.version
			});
		}

		// Validate schema
		if (!template.schema || typeof template.schema !== 'object' || Array.isArray(template.schema)) {
			errors.push({
				field: 'schema',
				message: 'Template schema is required and must be an object',
				value: template.schema
			});
		}

		// Validate semantic version format
		if (template.version && !/^\d+\.\d+\.\d+$/.test(template.version)) {
			errors.push({
				field: 'version',
				message: 'Template version must follow semantic versioning (e.g., 1.0.0)',
				value: template.version
			});
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Validates data against a template schema
	 */
	async validateData(data: any, template: MemoryTemplate): Promise<TemplateValidationResult> {
		const errors: TemplateValidationError[] = [];

		// Basic schema validation (in production, use a proper JSON Schema validator)
		if (template.schema) {
			const schemaErrors = this.validateAgainstSchema(data, template.schema);
			errors.push(...schemaErrors);
		}

		// Custom validation
		if (template.validation?.custom) {
			try {
				const customValid = await template.validation.custom(data);
				if (!customValid) {
					errors.push({
						field: 'custom',
						message: 'Custom validation failed',
						value: data
					});
				}
			} catch (error) {
				errors.push({
					field: 'custom',
					message: `Custom validation error: ${error instanceof Error ? error.message : String(error)}`,
					value: data
				});
			}
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Applies template defaults to data
	 */
	applyDefaults(data: any, template: MemoryTemplate): any {
		const result = { ...data };

		if (template.defaults) {
			for (const [key, defaultValue] of Object.entries(template.defaults)) {
				if (result[key] === undefined || result[key] === null) {
					result[key] = defaultValue;
				}
			}
		}

		return result;
	}

	/**
	 * Merges template metadata with data metadata
	 * Note: 'data' parameter is the metadata object, not the full memory
	 */
	mergeMetadata(data: any, template: MemoryTemplate): any {
		// Merge template metadata into the data metadata
		let result = { ...data };

		if (template.metadata) {
			result = {
				...template.metadata,
				...result
			};
		}

		// Add template info
		result.template = template.id;
		result.templateVersion = template.version;

		return result;
	}

	/**
	 * Compares two versions
	 */
	compareVersions(v1: string, v2: string): number {
		const normalize = (v: string) => {
			const parts = v.split('.').map(Number);
			while (parts.length < 3) parts.push(0);
			return parts;
		};

		const n1 = normalize(v1);
		const n2 = normalize(v2);

		for (let i = 0; i < 3; i++) {
			if (n1[i] > n2[i]) return 1;
			if (n1[i] < n2[i]) return -1;
		}

		return 0;
	}

	private validateAgainstSchema(data: any, schema: any): TemplateValidationError[] {
		const errors: TemplateValidationError[] = [];

		// Simplified schema validation - in production, use a proper JSON Schema library
		const validateType = (value: any, type: string, path: string) => {
			if (value === undefined || value === null) return;

			let isValid = true;
			switch (type) {
				case 'string':
					isValid = typeof value === 'string';
					break;
				case 'number':
					isValid = typeof value === 'number' && !isNaN(value);
					break;
				case 'boolean':
					isValid = typeof value === 'boolean';
					break;
				case 'array':
					isValid = Array.isArray(value);
					break;
				case 'object':
					isValid = typeof value === 'object' && !Array.isArray(value) && value !== null;
					break;
			}

			if (!isValid) {
				errors.push({
					field: path,
					message: `Expected ${type}, got ${typeof value}`,
					value
				});
			}
		};

		const validateConstraints = (value: any, constraints: any, path: string) => {
			if (value === undefined || value === null) return;

			if (constraints.minimum !== undefined && typeof value === 'number') {
				if (value < constraints.minimum) {
					errors.push({
						field: path,
						message: `Value must be >= ${constraints.minimum}`,
						value
					});
				}
			}

			if (constraints.enum !== undefined) {
				if (!constraints.enum.includes(value)) {
					errors.push({
						field: path,
						message: `Value must be one of: ${constraints.enum.join(', ')}`,
						value
					});
				}
			}
		};

		const traverse = (obj: any, schema: any, path: string = '') => {
			if (schema.type) {
				validateType(obj, schema.type, path);

				// Validate constraints
				const constraints: any = {};
				if (schema.minimum !== undefined) constraints.minimum = schema.minimum;
				if (schema.enum !== undefined) constraints.enum = schema.enum;
				if (Object.keys(constraints).length > 0) {
					validateConstraints(obj, constraints, path);
				}
			}

			if (schema.properties && typeof obj === 'object' && obj !== null) {
				for (const [key, propSchema] of Object.entries(schema.properties as any)) {
					traverse(obj[key], propSchema, path ? `${path}.${key}` : key);
				}
			}

			if (schema.required && Array.isArray(schema.required)) {
				for (const required of schema.required) {
					if (obj[required] === undefined || obj[required] === null) {
						errors.push({
							field: path ? `${path}.${required}` : required,
							message: 'Required field is missing',
							value: undefined
						});
					}
				}
			}
		};

		traverse(data, schema);
		return errors;
	}
}