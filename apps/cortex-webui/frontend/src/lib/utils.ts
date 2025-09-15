export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch (_e) {
		// ignore
	}
	return false;
}

export function generateInitialsImage(_name: string | undefined): string {
	// Return a simple data URL placeholder (not a real image) for tests
	return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>`;
}
