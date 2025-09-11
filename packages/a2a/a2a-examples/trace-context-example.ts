import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import {
	addBaggage,
	createTraceContext,
} from '@cortex-os/a2a-contracts/trace-context';
import { createBus } from '@cortex-os/a2a-core/bus';
import { createChildMessage } from '@cortex-os/a2a-core/message-utils';
import { getCurrentTraceContext } from '@cortex-os/a2a-core/trace-context-manager';
import { inproc } from '@cortex-os/a2a-transport/inproc';

/**
 * Example demonstrating W3C Trace Context propagation in A2A messaging
 */

export async function runTraceContextExample() {
	console.log('=== W3C Trace Context Example ===\n');

	const bus = createBus(inproc());

	// Set up handlers that demonstrate trace context propagation
	const handlers = [
		{
			type: 'order.created.v1',
			handle: async (msg: any) => {
				console.log('📦 Order Created Handler:');
				console.log(`   Message ID: ${msg.id}`);
				console.log(`   Trace Context: ${msg.traceparent || 'none'}`);
				console.log(
					`   Current Context: ${JSON.stringify(getCurrentTraceContext())}`,
				);

				// Simulate processing and create a child event
				await new Promise((resolve) => setTimeout(resolve, 10));

				// Create child message with propagated trace context
				const paymentMsg = createChildMessage(msg, {
					type: 'payment.processed.v1',
					source: '/order-service',
					data: { orderId: msg.data.orderId, amount: msg.data.amount },
				});

				console.log('💳 Publishing Payment Processed Event:');
				console.log(`   Child Message ID: ${paymentMsg.id}`);
				console.log(`   Child Trace Context: ${paymentMsg.traceparent}`);

				await bus.publish(paymentMsg);
			},
		},
		{
			type: 'payment.processed.v1',
			handle: async (msg: any) => {
				console.log('💰 Payment Processed Handler:');
				console.log(`   Message ID: ${msg.id}`);
				console.log(`   Trace Context: ${msg.traceparent || 'none'}`);
				console.log(
					`   Current Context: ${JSON.stringify(getCurrentTraceContext())}`,
				);

				// Simulate processing and create a child event
				await new Promise((resolve) => setTimeout(resolve, 10));

				// Create child message with propagated trace context
				const shippingMsg = createChildMessage(msg, {
					type: 'shipping.scheduled.v1',
					source: '/payment-service',
					data: {
						orderId: msg.data.orderId,
						trackingNumber: `TRK${Date.now()}`,
					},
				});

				console.log('🚚 Publishing Shipping Scheduled Event:');
				console.log(`   Child Message ID: ${shippingMsg.id}`);
				console.log(`   Child Trace Context: ${shippingMsg.traceparent}`);

				await bus.publish(shippingMsg);
			},
		},
		{
			type: 'shipping.scheduled.v1',
			handle: async (msg: any) => {
				console.log('📬 Shipping Scheduled Handler:');
				console.log(`   Message ID: ${msg.id}`);
				console.log(`   Trace Context: ${msg.traceparent || 'none'}`);
				console.log(
					`   Current Context: ${JSON.stringify(getCurrentTraceContext())}`,
				);
				console.log('   ✅ Order fulfillment complete!\n');
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

	console.log('🛒 Publishing Initial Order Created Event:');
	console.log(`   Message ID: ${orderMsg.id}`);
	console.log(`   Trace Context: ${orderMsg.traceparent}`);
	console.log(`   Trace State: ${orderMsg.tracestate || 'none'}`);
	console.log(`   Baggage: ${orderMsg.baggage || 'none'}\n`);

	// Publish initial message
	await bus.publish(orderMsg);

	// Wait for all messages to be processed
	await new Promise((resolve) => setTimeout(resolve, 100));

	console.log('=== Trace Context Example Complete ===');
}

// Run the example if this file is executed directly
if (require.main === module) {
	runTraceContextExample().catch(console.error);
}
