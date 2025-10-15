export class LocalMemoryProvider {
	constructor() {}

	async store() {
		return { id: 'memory-1', createdAt: new Date().toISOString() };
	}
}
