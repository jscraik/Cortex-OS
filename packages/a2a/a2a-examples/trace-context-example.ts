import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import {
	addBaggage,
	createTraceContext,
} from '@cortex-os/a2a-contracts/trace-context';
import { createBus } from '@cortex-os/a2a-core/bus';

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

import { getCurrentTraceContext } from '@cortex-os/a2a-core/trace-context-manager';
import { inproc } from '@cortex-os/a2a-transport/inproc';

/**
 * Example demonstrating W3C Trace Context propagation in A2A messaging
 */

export async function runTraceContextExample() {
	console.warn('=== W3C Trace Context Example ===\n');

	const bus = createBus(inproc());

	// Set up handlers that demonstrate trace context propagation
	const ORDER_CREATED_TYPE = 'order.created.v1';
	const PAYMENT_PROCESSED_TYPE = 'payment.processed.v1';
	const SHIPPING_SCHEDULED_TYPE = 'shipping.scheduled.v1';

	const handlers = [
		{
			type: ORDER_CREATED_TYPE,
			handle: async (
				msg: import('@cortex-os/a2a-contracts/envelope').Envelope,
			) => {
				console.warn('📦 Order Created Handler:');
				console.warn(`   Message ID: ${msg.id}`);
				console.warn(`   Trace Context: ${msg.traceparent || 'none'}`);
				console.warn(
					`   Current Context: ${JSON.stringify(getCurrentTraceContext())}`,
				);

				// Simulate processing and create a child event
				await new Promise((resolve) => setTimeout(resolve, 10));

				// Create child message with propagated trace context
				const data = msg.data as { orderId: string; amount: number };
				const paymentMsg = createChildMessage(msg, {
					type: PAYMENT_PROCESSED_TYPE,
					source: '/order-service',
					data: { orderId: data.orderId, amount: data.amount },
				});

				console.warn('💳 Publishing Payment Processed Event:');
				console.warn(`   Child Message ID: ${paymentMsg.id}`);
				console.warn(`   Child Trace Context: ${paymentMsg.traceparent}`);

				await bus.publish(paymentMsg);
			},
		},
		{
			type: PAYMENT_PROCESSED_TYPE,
			handle: async (
				msg: import('@cortex-os/a2a-contracts/envelope').Envelope,
			) => {
				console.warn('💰 Payment Processed Handler:');
				console.warn(`   Message ID: ${msg.id}`);
				console.warn(`   Trace Context: ${msg.traceparent || 'none'}`);
				console.warn(
					`   Current Context: ${JSON.stringify(getCurrentTraceContext())}`,
				);

				// Simulate processing and create a child event
				await new Promise((resolve) => setTimeout(resolve, 10));

				// Create child message with propagated trace context
				const data = msg.data as { orderId: string };
				const shippingMsg = createChildMessage(msg, {
					type: SHIPPING_SCHEDULED_TYPE,
					source: '/payment-service',
					data: {
						orderId: data.orderId,
						trackingNumber: `TRK${Date.now()}`,
					},
				});

				console.warn('🚚 Publishing Shipping Scheduled Event:');
				console.warn(`   Child Message ID: ${shippingMsg.id}`);
				console.warn(`   Child Trace Context: ${shippingMsg.traceparent}`);

				await bus.publish(shippingMsg);
			},
		},
		{
			type: SHIPPING_SCHEDULED_TYPE,
			handle: async (
				msg: import('@cortex-os/a2a-contracts/envelope').Envelope,
			) => {
				console.warn('📬 Shipping Scheduled Handler:');
				console.warn(`   Message ID: ${msg.id}`);
				console.warn(`   Trace Context: ${msg.traceparent || 'none'}`);
				console.warn(
					`   Current Context: ${JSON.stringify(getCurrentTraceContext())}`,
				);
				console.warn('   ✅ Order fulfillment complete!\n');
			},
		},
	];

	// Bind handlers
	await bus.bind(handlers);

	// Create initial message with custom trace context
	const initialTraceContext = createTraceContext();
	const enhancedContext = addBaggage(initialTraceContext, 'user.id', 'user123');
	const enhancedContext2 = addBaggage(
		enhancedContext,
		'session.id',
		'session456',
	);

	const orderMsg = createEnvelope({
		type: 'order.created.v1',
		source: '/order-service',
		data: { orderId: 'ORD-001', amount: 99.99, items: ['widget'] },
		traceparent: `00-${enhancedContext2.traceId}-${enhancedContext2.spanId}-${enhancedContext2.traceFlags.toString(16).padStart(2, '0')}`,
		tracestate: enhancedContext2.traceState,
		baggage: enhancedContext2.baggage,
	});

	console.warn('🛒 Publishing Initial Order Created Event:');
	console.warn(`   Message ID: ${orderMsg.id}`);
	console.warn(`   Trace Context: ${orderMsg.traceparent}`);
	console.warn(`   Trace State: ${orderMsg.tracestate || 'none'}`);
	console.warn(`   Baggage: ${orderMsg.baggage || 'none'}\n`);

	// Publish initial message
	await bus.publish(orderMsg);

	// Wait for all messages to be processed
	await new Promise((resolve) => setTimeout(resolve, 100));

	console.warn('=== Trace Context Example Complete ===');
}

// Run the example if this file is executed directly
if (require.main === module) {
	runTraceContextExample().catch(console.error);
}
