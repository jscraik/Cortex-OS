type SecurityModule = typeof import('@cortex-os/security');

let securityModulePromise: Promise<SecurityModule> | null = null;

async function loadSecurity(): Promise<SecurityModule> {
	if (!securityModulePromise) {
		securityModulePromise = import('@cortex-os/security');
	}

	return securityModulePromise;
}

export async function safeExecFileWithRetry(
	...args: Parameters<SecurityModule['safeExecFileWithRetry']>
): ReturnType<SecurityModule['safeExecFileWithRetry']> {
	const security = await loadSecurity();
	return security.safeExecFileWithRetry(...args);
}

export async function safeExecFile(
	...args: Parameters<SecurityModule['safeExecFile']>
): ReturnType<SecurityModule['safeExecFile']> {
	const security = await loadSecurity();
	return security.safeExecFile(...args);
}
