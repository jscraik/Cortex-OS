import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import { InMemoryOutboxRepository } from './in-memory-outbox-repository.js';
import { createA2AOutboxIntegration } from './outbox-integration.js';

// Mock transport
const mockTransport = {
	async publish(envelope: Envelope) {
		console.log('Publishing envelope:', envelope);
		return Promise.resolve();
	},
};

// Create repository and integration
const repository = new InMemoryOutboxRepository();
const integration = createA2AOutboxIntegration(mockTransport, repository);

// Create a test envelope
const testEnvelope = createEnvelope({
	type: 'test.event',
	source: 'https://test-source',
	data: { message: 'Hello, World!' },
});

// Test publishing
async function testPublish() {
	console.log('Testing publish...');
	await integration.publish(testEnvelope);
	console.log('Publish test completed');
}

// Run the test
testPublish().catch(console.error);
