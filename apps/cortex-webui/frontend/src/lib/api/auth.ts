export async function createAPIKey(): Promise<string | null> {
	// Test stub: return a fake key
	return 'test-api-key-123';
}

export async function getAPIKey(): Promise<string | null> {
	// Test stub: no key by default
	return null;
}

export async function updateUserProfile(_data: Record<string, unknown>): Promise<any> {
	// Test stub: echo back a minimal user object
	return { id: 'user-1', name: _data.name ?? 'Test User' };
}
