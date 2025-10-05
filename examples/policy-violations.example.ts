// Example file to test brAInwav policy enforcement
// This file intentionally contains violations for demonstration

// ❌ VIOLATION: Math.random() in production path
export function generateUserId(): string {
	return `user_${Math.random().toString(36).substring(7)}`;
}

// ❌ VIOLATION: Mock response in production code
export function fetchUserData(): Promise<unknown> {
	return Promise.resolve({
		message: 'Mock adapter response - adapters not yet implemented',
	});
}

// ❌ VIOLATION: Placeholder implementation comment
export function processPayment(): void {
	// TODO: This will be wired later
	console.log('Payment processing pending');
}

// ❌ VIOLATION: console.warn("not implemented")
export function sendNotification(): void {
	console.warn('not implemented');
}

// ❌ VIOLATION: Console log missing [brAInwav] branding
export function logUserAction(action: string): void {
	console.log('User action:', action);
}

// ✅ CORRECT: Properly branded error
export function throwError(message: string): never {
	throw new Error(`[brAInwav] ${message}`);
}

// ✅ CORRECT: Properly branded console output
export function logWithBranding(message: string): void {
	console.log(`[brAInwav] ${message}`);
}
