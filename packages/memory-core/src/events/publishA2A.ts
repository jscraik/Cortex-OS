import { getA2ABus } from '@cortex-os/a2a';
import { MemoryStoreEventSchema } from '@cortex-os/a2a-contracts';

export async function publishA2AMemoryEvent(
	operation: 'store' | 'search' | 'get' | 'remove',
	payload: unknown,
	correlationId?: string,
): Promise<void> {
	const bus = await getA2ABus();
	const event = {
		type: `memory.${operation}`,
		payload,
		timestamp: new Date().toISOString(),
		source: 'memory-core',
		correlationId,
	};

	const validatedEvent = MemoryStoreEventSchema.parse(event);
	await bus.publish(validatedEvent);
}
