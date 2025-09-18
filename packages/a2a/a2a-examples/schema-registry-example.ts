import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts/envelope';
import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import {
	PredefinedSchemas,
	SchemaValidationUtils,
} from '@cortex-os/a2a-contracts/schema-validation-utils';
import { createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { z } from 'zod';

// Helper function to create child messages with trace context propagation
function createChildMessage(
	parentMsg: Envelope,
	params: {
		type: string;
		source: string;
		data: unknown;
		subject?: string;
		causationId?: string;
		correlationId?: string;
	},
): Envelope {
	return createEnvelope({
		...params,
		causationId: params.causationId || parentMsg.id,
		correlationId: params.correlationId || parentMsg.correlationId,
		traceparent: parentMsg.traceparent,
		tracestate: parentMsg.tracestate,
		baggage: parentMsg.baggage,
	});
}

/**
 * Example demonstrating Event Schema Registry usage and validation
 */

export async function runSchemaRegistryExample() {
	console.warn('=== Event Schema Registry Example ===\n');

	// Create schema registry
	const registry = new SchemaRegistry({
		strictValidation: true,
		enableCache: true,
		validateOnRegistration: true,
	});

	// Register predefined schemas
	console.warn('📋 Registering schemas...');
	registry.register({
		...PredefinedSchemas.userCreated,
		compatibility: SchemaCompatibility.BACKWARD,
	});
	registry.register({
		...PredefinedSchemas.orderCreated,
		compatibility: SchemaCompatibility.BACKWARD,
	});
	registry.register({
		...PredefinedSchemas.paymentProcessed,
		compatibility: SchemaCompatibility.BACKWARD,
	});

	// Register a custom schema
	const customOrderSchema = SchemaValidationUtils.createVersionedSchema(
		'order.shipped.v1',
		'1.0.0',
		z.object({
			type: z.literal('order.shipped.v1'),
			data: z.object({
				orderId: z.string().uuid(),
				trackingNumber: z.string().min(1),
				carrier: z.string().min(1),
				shippedAt: z.string().datetime(),
			}),
		}),
		{
			description: 'Order shipped event',
			tags: ['order', 'shipping', 'fulfillment'],
		},
	);
	registry.register(customOrderSchema);

	console.warn('✅ Schemas registered successfully\n');

	// Create bus with schema validation
	const bus = createBus(inproc(), undefined, registry);

	// Set up event handlers
	const USER_CREATED_TYPE = 'user.created.v1';
	const ORDER_CREATED_TYPE = 'order.created.v1';
	const PAYMENT_PROCESSED_TYPE = 'payment.processed.v1';
	const ORDER_SHIPPED_TYPE = 'order.shipped.v1';

	const handlers = [
		{
			type: USER_CREATED_TYPE,
			handle: async (msg: Envelope) => {
				const data = msg.data as {
					id: string;
					firstName: string;
					lastName: string;
					email: string;
				};
				console.warn('👤 User Created Handler:');
				console.warn(`   User: ${data.firstName} ${data.lastName}`);
				console.warn(`   Email: ${data.email}`);

				// Create order event
				const orderMsg = createChildMessage(msg, {
					type: ORDER_CREATED_TYPE,
					source: '/order-service',
					data: {
						id: 'ord-001',
						userId: data.id,
						items: [
							{
								productId: 'prod-001',
								quantity: 2,
								price: 29.99,
							},
						],
						total: 59.98,
						status: 'pending',
						createdAt: new Date().toISOString(),
					},
				});

				console.warn('📦 Publishing Order Created Event...');
				await bus.publish(orderMsg);
			},
		},
		{
			type: ORDER_CREATED_TYPE,
			handle: async (msg: Envelope) => {
				const data = msg.data as {
					id: string;
					total: number;
					items: unknown[];
				};
				console.warn('🛒 Order Created Handler:');
				console.warn(`   Order ID: ${data.id}`);
				console.warn(`   Total: $${data.total}`);
				console.warn(`   Items: ${data.items.length}`);

				// Create payment event
				const paymentMsg = createChildMessage(msg, {
					type: PAYMENT_PROCESSED_TYPE,
					source: '/payment-service',
					data: {
						id: 'pay-001',
						orderId: data.id,
						amount: data.total,
						currency: 'USD',
						method: 'credit_card',
						status: 'completed',
						transactionId: 'txn_1234567890',
						processedAt: new Date().toISOString(),
					},
				});

				console.warn('💳 Publishing Payment Processed Event...');
				await bus.publish(paymentMsg);
			},
		},
		{
			type: PAYMENT_PROCESSED_TYPE,
			handle: async (msg: Envelope) => {
				const data = msg.data as {
					id: string;
					amount: number;
					currency: string;
					status: string;
					orderId: string;
				};
				console.warn('💰 Payment Processed Handler:');
				console.warn(`   Payment ID: ${data.id}`);
				console.warn(`   Amount: $${data.amount} ${data.currency}`);
				console.warn(`   Status: ${data.status}`);

				// Create shipping event
				const shippingMsg = createChildMessage(msg, {
					type: ORDER_SHIPPED_TYPE,
					source: '/shipping-service',
					data: {
						orderId: data.orderId,
						trackingNumber: 'TRK123456789',
						carrier: 'UPS',
						shippedAt: new Date().toISOString(),
					},
				});

				console.warn('🚚 Publishing Order Shipped Event...');
				await bus.publish(shippingMsg);
			},
		},
		{
			type: ORDER_SHIPPED_TYPE,
			handle: async (msg: Envelope) => {
				const data = msg.data as {
					orderId: string;
					trackingNumber: string;
					carrier: string;
				};
				console.warn('📬 Order Shipped Handler:');
				console.warn(`   Order ID: ${data.orderId}`);
				console.warn(`   Tracking: ${data.trackingNumber} (${data.carrier})`);
				console.warn('   ✅ Order fulfillment complete!\n');
			},
		},
	];

	// Bind handlers
	await bus.bind(handlers);

	// Demonstrate schema validation
	console.warn('🔍 Demonstrating Schema Validation...\n');

	// Valid event
	const validUserEvent = createEnvelope({
		type: 'user.created.v1',
		source: '/user-service',
		data: {
			id: 'user-001',
			email: 'john.doe@example.com',
			firstName: 'John',
			lastName: 'Doe',
			createdAt: new Date().toISOString(),
		},
	});

	console.warn('✅ Publishing valid user event...');
	await bus.publish(validUserEvent);

	// Invalid event (missing required field)
	const invalidUserEvent = createEnvelope({
		type: 'user.created.v1',
		source: '/user-service',
		data: {
			id: 'user-002',
			// Missing required fields: email, firstName, lastName, createdAt
		},
	});

	try {
		console.warn('❌ Attempting to publish invalid user event...');
		await bus.publish(invalidUserEvent);
	} catch (error) {
		console.warn(
			`   Validation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}

	// Wait for all events to be processed
	await new Promise((resolve) => setTimeout(resolve, 100));

	// Demonstrate schema registry features
	console.warn('📊 Schema Registry Features...\n');

	// Get registry statistics
	const stats = registry.getStats();
	console.warn('Registry Statistics:');
	console.warn(`   Total Schemas: ${stats.totalSchemas}`);
	console.warn(`   Event Types: ${stats.uniqueEventTypes}`);
	console.warn(
		`   Cache Hit Rate: ${stats.cacheHitRate ? (stats.cacheHitRate * 100).toFixed(1) : 'N/A'}%`,
	);
	console.warn(`   Avg Validation Time: ${stats.avgValidationTimeMs?.toFixed(2)}ms\n`);

	// Search schemas
	const userSchemas = registry.searchSchemas({
		eventType: 'user.created.v1',
		limit: 5,
	});
	console.warn('User Schemas:');
	userSchemas.forEach((schema) => {
		console.warn(
			`   ${schema.eventType}:${schema.version} - ${schema.description || 'No description'}`,
		);
	});

	// Demonstrate schema compatibility checking
	console.warn('\n🔄 Schema Compatibility Check...');

	// Create a new version of the user schema
	const newUserSchema = z.object({
		type: z.literal('user.created.v1'),
		data: z.object({
			id: z.string().uuid(),
			email: z.string().email(),
			firstName: z.string().min(1),
			lastName: z.string().min(1),
			phone: z.string().optional(), // New optional field
			createdAt: z.string().datetime(),
			updatedAt: z.string().datetime().optional(),
		}),
	});

	const compatibility = registry.checkCompatibility('user.created.v1', newUserSchema);
	console.warn('Compatibility Result:');
	console.warn(`   Compatible: ${compatibility.compatible}`);
	if (Array.isArray(compatibility.issues) && compatibility.issues.length > 0) {
		console.warn('   Issues:');
		for (const issue of compatibility.issues) {
			console.warn(`     - ${issue}`);
		}
	}
	if (Array.isArray(compatibility.recommendations) && compatibility.recommendations.length > 0) {
		console.warn('   Recommendations:');
		for (const rec of compatibility.recommendations) {
			console.warn(`     - ${rec}`);
		}
	}

	console.warn('\n=== Schema Registry Example Complete ===');
}

// Demonstrate manual validation
export async function demonstrateManualValidation() {
	console.warn('=== Manual Schema Validation Example ===\n');

	const registry = new SchemaRegistry();

	// Register a schema
	// Use the enum value for compatibility
	registry.register({
		...PredefinedSchemas.orderCreated,
		compatibility: SchemaCompatibility.BACKWARD,
	});

	// Test data
	const validOrder = {
		id: 'ord-123',
		userId: 'user-456',
		items: [
			{
				productId: 'prod-789',
				quantity: 2,
				price: 29.99,
			},
		],
		total: 59.98,
		status: 'pending',
		createdAt: new Date().toISOString(),
	};

	const invalidOrder = {
		id: 'ord-123',
		userId: 'user-456',
		// Missing required fields
	};

	console.warn('Validating valid order:');
	const validResult = registry.validate('order.created.v1', validOrder);
	console.warn(`   Valid: ${validResult.valid}`);
	console.warn(`   Schema Version: ${validResult.schemaVersion}`);

	console.warn('\nValidating invalid order:');
	const invalidResult = registry.validate('order.created.v1', invalidOrder);
	console.warn(`   Valid: ${invalidResult.valid}`);
	if (Array.isArray(invalidResult.errors) && invalidResult.errors.length > 0) {
		console.warn('   Errors:');
		invalidResult.errors.forEach((error) => {
			console.warn(`     - ${error.message}`);
		});
	}

	console.warn('\n=== Manual Validation Example Complete ===');
}

// Run examples if this file is executed directly
if (require.main === module) {
	runSchemaRegistryExample()
		.then(() => demonstrateManualValidation())
		.catch(console.error);
}
