import { createEnvelope } from "@cortex-os/a2a-contracts/envelope";
import {
	PredefinedSchemas,
	SchemaValidationUtils,
} from "@cortex-os/a2a-contracts/schema-validation-utils";
import { createBus } from "@cortex-os/a2a-core/bus";
import { SchemaRegistry } from "@cortex-os/a2a-core/schema-registry";
import { inproc } from "@cortex-os/a2a-transport/inproc";
import { z } from "zod";

import { createChildMessage } from "./utils/childMessage";

/**
 * Example demonstrating Event Schema Registry usage and validation
 */

export async function runSchemaRegistryExample() {
	console.log("=== Event Schema Registry Example ===\n");

	// Create schema registry
	const registry = new SchemaRegistry({
		strictValidation: true,
		enableCache: true,
		validateOnRegistration: true,
	});

	// Register predefined schemas
	console.log("📋 Registering schemas...");
	registry.register(PredefinedSchemas.userCreated);
	registry.register(PredefinedSchemas.orderCreated);
	registry.register(PredefinedSchemas.paymentProcessed);

	// Register a custom schema
	const customOrderSchema = SchemaValidationUtils.createVersionedSchema(
		"order.shipped.v1",
		"1.0.0",
		z.object({
			type: z.literal("order.shipped.v1"),
			data: z.object({
				orderId: z.string().uuid(),
				trackingNumber: z.string().min(1),
				carrier: z.string().min(1),
				shippedAt: z.string().datetime(),
			}),
		}),
		{
			description: "Order shipped event",
			tags: ["order", "shipping", "fulfillment"],
		},
	);
	registry.register(customOrderSchema);

	console.log("✅ Schemas registered successfully\n");

	// Create bus with schema validation
	const bus = createBus(inproc(), undefined, registry);

	// Set up event handlers
	const handlers = [
		{
			type: "user.created.v1",
			handle: async (msg: any) => {
				console.log("👤 User Created Handler:");
				console.log(`   User: ${msg.data.firstName} ${msg.data.lastName}`);
				console.log(`   Email: ${msg.data.email}`);

				// Create order event
				const orderMsg = createChildMessage(msg, {
					type: "order.created.v1",
					source: "/order-service",
					data: {
						id: "ord-001",
						userId: msg.data.id,
						items: [
							{
								productId: "prod-001",
								quantity: 2,
								price: 29.99,
							},
						],
						total: 59.98,
						status: "pending",
						createdAt: new Date().toISOString(),
					},
				});

				console.log("📦 Publishing Order Created Event...");
				await bus.publish(orderMsg);
			},
		},
		{
			type: "order.created.v1",
			handle: async (msg: any) => {
				console.log("🛒 Order Created Handler:");
				console.log(`   Order ID: ${msg.data.id}`);
				console.log(`   Total: $${msg.data.total}`);
				console.log(`   Items: ${msg.data.items.length}`);

				// Create payment event
				const paymentMsg = createChildMessage(msg, {
					type: "payment.processed.v1",
					source: "/payment-service",
					data: {
						id: "pay-001",
						orderId: msg.data.id,
						amount: msg.data.total,
						currency: "USD",
						method: "credit_card",
						status: "completed",
						transactionId: "txn_1234567890",
						processedAt: new Date().toISOString(),
					},
				});

				console.log("💳 Publishing Payment Processed Event...");
				await bus.publish(paymentMsg);
			},
		},
		{
			type: "payment.processed.v1",
			handle: async (msg: any) => {
				console.log("💰 Payment Processed Handler:");
				console.log(`   Payment ID: ${msg.data.id}`);
				console.log(`   Amount: $${msg.data.amount} ${msg.data.currency}`);
				console.log(`   Status: ${msg.data.status}`);

				// Create shipping event
				const shippingMsg = createChildMessage(msg, {
					type: "order.shipped.v1",
					source: "/shipping-service",
					data: {
						orderId: msg.data.orderId,
						trackingNumber: "TRK123456789",
						carrier: "UPS",
						shippedAt: new Date().toISOString(),
					},
				});

				console.log("🚚 Publishing Order Shipped Event...");
				await bus.publish(shippingMsg);
			},
		},
		{
			type: "order.shipped.v1",
			handle: async (msg: any) => {
				console.log("📬 Order Shipped Handler:");
				console.log(`   Order ID: ${msg.data.orderId}`);
				console.log(
					`   Tracking: ${msg.data.trackingNumber} (${msg.data.carrier})`,
				);
				console.log("   ✅ Order fulfillment complete!\n");
			},
		},
	];

	// Bind handlers
	await bus.bind(handlers);

	// Demonstrate schema validation
	console.log("🔍 Demonstrating Schema Validation...\n");

	// Valid event
	const validUserEvent = createEnvelope({
		type: "user.created.v1",
		source: "/user-service",
		data: {
			id: "user-001",
			email: "john.doe@example.com",
			firstName: "John",
			lastName: "Doe",
			createdAt: new Date().toISOString(),
		},
	});

	console.log("✅ Publishing valid user event...");
	await bus.publish(validUserEvent);

	// Invalid event (missing required field)
	const invalidUserEvent = createEnvelope({
		type: "user.created.v1",
		source: "/user-service",
		data: {
			id: "user-002",
			// Missing required fields: email, firstName, lastName, createdAt
		},
	});

	try {
		console.log("❌ Attempting to publish invalid user event...");
		await bus.publish(invalidUserEvent);
	} catch (error) {
		console.log(
			`   Validation Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}

	// Wait for all events to be processed
	await new Promise((resolve) => setTimeout(resolve, 100));

	// Demonstrate schema registry features
	console.log("📊 Schema Registry Features...\n");

	// Get registry statistics
	const stats = registry.getStats();
	console.log("Registry Statistics:");
	console.log(`   Total Schemas: ${stats.totalSchemas}`);
	console.log(`   Event Types: ${stats.uniqueEventTypes}`);
	console.log(`   Cache Hit Rate: ${(stats.cacheHitRate! * 100).toFixed(1)}%`);
	console.log(
		`   Avg Validation Time: ${stats.avgValidationTimeMs?.toFixed(2)}ms\n`,
	);

	// Search schemas
	const userSchemas = registry.searchSchemas({
		eventType: "user.created.v1",
		limit: 5,
	});
	console.log("User Schemas:");
	userSchemas.forEach((schema) => {
		console.log(
			`   ${schema.eventType}:${schema.version} - ${schema.description || "No description"}`,
		);
	});

	// Demonstrate schema compatibility checking
	console.log("\n🔄 Schema Compatibility Check...");

	// Create a new version of the user schema
	const newUserSchema = z.object({
		type: z.literal("user.created.v1"),
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

	const compatibility = registry.checkCompatibility(
		"user.created.v1",
		newUserSchema,
	);
	console.log("Compatibility Result:");
	console.log(`   Compatible: ${compatibility.compatible}`);
	if (compatibility.issues?.length > 0) {
		console.log("   Issues:");
		for (const issue of compatibility.issues) {
			console.log(`     - ${issue}`);
		}
	}
	if (compatibility.recommendations?.length > 0) {
		console.log("   Recommendations:");
		for (const rec of compatibility.recommendations) {
			console.log(`     - ${rec}`);
		}
	}

	console.log("\n=== Schema Registry Example Complete ===");
}

// Demonstrate manual validation
export async function demonstrateManualValidation() {
	console.log("=== Manual Schema Validation Example ===\n");

	const registry = new SchemaRegistry();

	// Register a schema
	registry.register(PredefinedSchemas.orderCreated);

	// Test data
	const validOrder = {
		id: "ord-123",
		userId: "user-456",
		items: [
			{
				productId: "prod-789",
				quantity: 2,
				price: 29.99,
			},
		],
		total: 59.98,
		status: "pending",
		createdAt: new Date().toISOString(),
	};

	const invalidOrder = {
		id: "ord-123",
		userId: "user-456",
		// Missing required fields
	};

	console.log("Validating valid order:");
	const validResult = registry.validate("order.created.v1", validOrder);
	console.log(`   Valid: ${validResult.valid}`);
	console.log(`   Schema Version: ${validResult.schemaVersion}`);

	console.log("\nValidating invalid order:");
	const invalidResult = registry.validate("order.created.v1", invalidOrder);
	console.log(`   Valid: ${invalidResult.valid}`);
	if (invalidResult.errors) {
		console.log("   Errors:");
		invalidResult.errors.forEach((error) => {
			console.log(`     - ${error.message}`);
		});
	}

	console.log("\n=== Manual Validation Example Complete ===");
}

// Run examples if this file is executed directly
if (require.main === module) {
	runSchemaRegistryExample()
		.then(() => demonstrateManualValidation())
		.catch(console.error);
}
