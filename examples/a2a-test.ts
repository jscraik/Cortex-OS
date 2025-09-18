import { createEnvelope } from '../packages/a2a/a2a-contracts/src/envelope.js';
import { createBus, type Handler } from '../packages/a2a/a2a-core/src/bus.js';
import { inproc } from '../packages/a2a/a2a-transport/src/inproc.js';

async function runTest() {
	console.log('Starting A2A Native Communication Test...');

	// Create ACL to allow publishing and subscribing to test messages
	const acl = {
		'test.message.v1': {
			publish: true,
			subscribe: true,
		},
	};

	// Create bus with in-process transport and ACL
	const bus = createBus(inproc(), undefined, undefined, acl);

	// Promise to track when we receive the message
	let messageReceived = false;
	let resolvePromise: () => void;
	const messagePromise = new Promise<void>((resolve) => {
		resolvePromise = resolve;
		setTimeout(() => {
			if (!messageReceived) {
				console.error('Test failed: Message not received within timeout');
				process.exit(1);
			}
		}, 5000);
	});

	// Define message handler
	const handler: Handler = {
		type: 'test.message.v1',
		handle: (message) => {
			console.log('✅ Received message:', message.id);
			console.log('Message data:', message.data);
			messageReceived = true;

			// Verify message content
			if (message.data && typeof message.data === 'object' && 'text' in message.data) {
				const data = message.data as { text: string };
				if (data.text === 'Hello from A2A!') {
					console.log('✅ Message content verified');
				} else {
					console.error('❌ Message content mismatch');
					process.exit(1);
				}
			} else {
				console.error('❌ Invalid message data format');
				process.exit(1);
			}

			// Test successful
			console.log('✅ A2A Native Communication Test PASSED');
			resolvePromise();
			return Promise.resolve();
		},
	};

	// Bind handler to bus
	await bus.bind([handler]);
	console.log('Consumer listening for messages...');

	// Create and publish a message
	const message = createEnvelope({
		type: 'test.message.v1',
		source: 'urn:test:producer',
		data: {
			text: 'Hello from A2A!',
			timestamp: new Date().toISOString(),
		},
	});

	console.log('Publishing message:', message.id);
	await bus.publish(message);
	console.log('Message published');

	// Wait for message to be received
	await messagePromise;
}

// Run the test
runTest().catch((error) => {
	console.error('Test failed with error:', error);
	process.exit(1);
});
