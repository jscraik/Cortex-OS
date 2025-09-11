import { z } from 'zod';

/**
 * Common schema validation utilities and patterns for A2A events
 */

/**
 * Base event envelope schema (extends CloudEvents)
 */
export const BaseEventSchema = z.object({
	id: z.string().uuid(),
	type: z.string().min(1),
	source: z.string().url(),
	specversion: z.literal('1.0'),
	time: z.string().datetime().optional(),
	data: z.unknown().optional(),
	datacontenttype: z.string().optional(),
	dataschema: z.string().url().optional(),
	subject: z.string().optional(),
});

/**
 * Common data types for event payloads
 */
export const CommonSchemas = {
	// Basic types
	uuid: z.string().uuid(),
	email: z.string().email(),
	url: z.string().url(),
	timestamp: z.string().datetime(),
	positiveInteger: z.number().int().positive(),
	nonNegativeInteger: z.number().int().nonnegative(),

	// Money and currency
	money: z.object({
		amount: z.number().positive(),
		currency: z.string().length(3).toUpperCase(),
	}),

	// Address
	address: z.object({
		street: z.string().min(1),
		city: z.string().min(1),
		state: z.string().min(1),
		zipCode: z.string().min(1),
		country: z.string().length(2).toUpperCase(),
	}),

	// User
	user: z.object({
		id: z.string().uuid(),
		email: z.string().email(),
		firstName: z.string().min(1),
		lastName: z.string().min(1),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime().optional(),
	}),

	// Product
	product: z.object({
		id: z.string().uuid(),
		name: z.string().min(1),
		description: z.string().optional(),
		price: z.number().positive(),
		category: z.string().min(1),
		inStock: z.boolean(),
		tags: z.array(z.string()).optional(),
	}),

	// Order
	order: z.object({
		id: z.string().uuid(),
		userId: z.string().uuid(),
		items: z.array(
			z.object({
				productId: z.string().uuid(),
				quantity: z.number().int().positive(),
				price: z.number().positive(),
			}),
		),
		total: z.number().positive(),
		status: z.enum([
			'pending',
			'confirmed',
			'shipped',
			'delivered',
			'cancelled',
		]),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime().optional(),
	}),

	// Payment
	payment: z.object({
		id: z.string().uuid(),
		orderId: z.string().uuid(),
		amount: z.number().positive(),
		currency: z.string().length(3).toUpperCase(),
		method: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer']),
		status: z.enum([
			'pending',
			'processing',
			'completed',
			'failed',
			'refunded',
		]),
		transactionId: z.string().optional(),
		processedAt: z.string().datetime().optional(),
	}),

	// Shipping
	shipping: z.object({
		id: z.string().uuid(),
		orderId: z.string().uuid(),
		carrier: z.string().min(1),
		trackingNumber: z.string().min(1),
		status: z.enum([
			'preparing',
			'shipped',
			'in_transit',
			'delivered',
			'returned',
		]),
		shippedAt: z.string().datetime().optional(),
		deliveredAt: z.string().datetime().optional(),
		estimatedDelivery: z.string().datetime().optional(),
	}),
};

/**
 * Event type patterns for common domains
 */
export const EventPatterns = {
	// User domain
	userCreated: z.object({
		type: z.literal('user.created.v1'),
		data: CommonSchemas.user,
	}),

	userUpdated: z.object({
		type: z.literal('user.updated.v1'),
		data: CommonSchemas.user,
	}),

	// Product domain
	productCreated: z.object({
		type: z.literal('product.created.v1'),
		data: CommonSchemas.product,
	}),

	productUpdated: z.object({
		type: z.literal('product.updated.v1'),
		data: CommonSchemas.product,
	}),

	// Order domain
	orderCreated: z.object({
		type: z.literal('order.created.v1'),
		data: CommonSchemas.order,
	}),

	orderStatusChanged: z.object({
		type: z.literal('order.status.changed.v1'),
		data: z.object({
			orderId: z.string().uuid(),
			oldStatus: z.string(),
			newStatus: z.string(),
			changedAt: z.string().datetime(),
		}),
	}),

	// Payment domain
	paymentProcessed: z.object({
		type: z.literal('payment.processed.v1'),
		data: CommonSchemas.payment,
	}),

	paymentFailed: z.object({
		type: z.literal('payment.failed.v1'),
		data: z.object({
			orderId: z.string().uuid(),
			amount: z.number().positive(),
			reason: z.string().min(1),
			failedAt: z.string().datetime(),
		}),
	}),

	// Shipping domain
	shipmentCreated: z.object({
		type: z.literal('shipment.created.v1'),
		data: CommonSchemas.shipping,
	}),

	shipmentStatusChanged: z.object({
		type: z.literal('shipment.status.changed.v1'),
		data: z.object({
			shipmentId: z.string().uuid(),
			oldStatus: z.string(),
			newStatus: z.string(),
			changedAt: z.string().datetime(),
		}),
	}),
};

/**
 * Schema validation utilities
 */
/**
 * Schema validation utilities
 */
export function createVersionedSchema<T extends z.ZodType>(
	eventType: string,
	version: string,
	schema: T,
	opts: {
		description?: string;
		examples?: z.infer<T>[];
		tags?: string[];
	} = {},
) {
	const { description, examples, tags } = opts;
	return {
		eventType,
		version,
		schema,
		description,
		examples,
		tags: tags || [],
	};
}

/**
 * Validate event against multiple schema versions
 */
export function validateAgainstVersions<T>(
	event: unknown,
	schemas: Array<{ version: string; schema: z.ZodSchema<T> }>,
): Array<{ version: string; result: z.SafeParseReturnType<T, T> }> {
	return schemas.map(({ version, schema }) => ({
		version,
		result: schema.safeParse(event),
	}));
}

/**
 * Check if new schema is backward compatible with old schema
 */
export function isBackwardCompatible(
	oldSchema: z.ZodSchema,
	newSchema: z.ZodSchema,
	testData: unknown[] = [],
): { compatible: boolean; issues: string[] } {
	const issues: string[] = [];

	// Test with provided data
	for (const data of testData) {
		const oldResult = oldSchema.safeParse(data);
		const newResult = newSchema.safeParse(data);

		if (oldResult.success && !newResult.success) {
			issues.push(
				`Data ${JSON.stringify(data)} is valid in old schema but invalid in new schema`,
			);
		}
	}

	// Additional compatibility checks could be added here
	// For example, checking schema structure differences

	return {
		compatible: issues.length === 0,
		issues,
	};
}

/**
 * Generate schema documentation
 */
export function generateSchemaDocs(
	schema: z.ZodSchema,
	eventType: string,
): string {
	let shape: string[] = [];
	let isObject = false;

	// Check if it's a ZodObject using instanceof for better compatibility
	if (schema instanceof z.ZodObject) {
		isObject = true;
		// Cast to ZodObject to access shape safely
		const obj = schema as unknown as z.ZodObject<any>;
		shape = Object.keys(obj.shape);
	}

	let docs = `# ${eventType}\n\n`;

	if (isObject) {
		docs += '## Properties\n\n';
		// This is a simplified documentation generation
		// In production, you might use a library like zod-to-json-schema
		docs += '| Property | Type | Required |\n';
		docs += '|----------|------|----------|\n';

		for (const key of shape) {
			docs += `| ${key} | any | Yes |\n`;
		}
	}

	return docs;
}

/**
 * Create migration guide between schema versions
 */
export function createMigrationGuide(
	fromVersion: string,
	toVersion: string,
	changes: Array<{
		field: string;
		change: 'added' | 'removed' | 'modified';
		description: string;
	}>,
): string {
	let guide = `# Migration Guide: ${fromVersion} → ${toVersion}\n\n`;

	if (changes.length === 0) {
		guide += 'No breaking changes. Migration should be seamless.\n';
	} else {
		guide += '## Changes\n\n';
		for (const change of changes) {
			guide += `- **${change.change.toUpperCase()}** ${change.field}: ${change.description}\n`;
		}

		guide += '\n## Migration Steps\n\n';
		guide += '1. Update your event producers to use the new schema\n';
		guide += '2. Ensure consumers can handle both old and new formats\n';
		guide += '3. Deploy schema registry with new version\n';
		guide += '4. Monitor for any validation errors\n';
	}

	return guide;
}

/**
 * Predefined schemas for common event types
 */
export const PredefinedSchemas = {
	// User events
	userCreated: createVersionedSchema(
		'user.created.v1',
		'1.0.0',
		EventPatterns.userCreated,
		{
			description: 'User account created',
			examples: [
				{
					type: 'user.created.v1',
					data: {
						id: '123e4567-e89b-12d3-a456-426614174000',
						email: 'user@example.com',
						firstName: 'John',
						lastName: 'Doe',
						createdAt: '2023-01-01T00:00:00Z',
					},
				},
			],
			tags: ['user', 'creation'],
		},
	),

	// Order events
	orderCreated: createVersionedSchema(
		'order.created.v1',
		'1.0.0',
		EventPatterns.orderCreated,
		{
			description: 'New order placed',
			examples: [
				{
					type: 'order.created.v1',
					data: {
						id: '123e4567-e89b-12d3-a456-426614174001',
						userId: '123e4567-e89b-12d3-a456-426614174000',
						items: [
							{
								productId: '123e4567-e89b-12d3-a456-426614174002',
								quantity: 2,
								price: 29.99,
							},
						],
						total: 59.98,
						status: 'pending',
						createdAt: '2023-01-01T00:00:00Z',
					},
				},
			],
			tags: ['order', 'creation', 'ecommerce'],
		},
	),

	// Payment events
	paymentProcessed: createVersionedSchema(
		'payment.processed.v1',
		'1.0.0',
		EventPatterns.paymentProcessed,
		{
			description: 'Payment successfully processed',
			examples: [
				{
					type: 'payment.processed.v1',
					data: {
						id: '123e4567-e89b-12d3-a456-426614174003',
						orderId: '123e4567-e89b-12d3-a456-426614174001',
						amount: 59.98,
						currency: 'USD',
						method: 'credit_card',
						status: 'completed',
						transactionId: 'txn_1234567890',
						processedAt: '2023-01-01T00:05:00Z',
					},
				},
			],
			tags: ['payment', 'success', 'ecommerce'],
		},
	),
};
