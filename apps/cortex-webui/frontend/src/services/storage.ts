// Local storage service for persisting user preferences and data

const STORAGE_PREFIX = 'cortex_webui_';

class StorageService {
	private prefix: string;

	constructor(prefix: string = STORAGE_PREFIX) {
		this.prefix = prefix;
	}

	private getKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	// String values
	setItem(key: string, value: string): void {
		try {
			localStorage.setItem(this.getKey(key), value);
		} catch (error) {
			console.error('Error setting item in localStorage', { key, error });
		}
	}

	getItem(key: string): string | null {
		try {
			return localStorage.getItem(this.getKey(key));
		} catch (error) {
			console.error('Error getting item from localStorage', { key, error });
			return null;
		}
	}

	removeItem(key: string): void {
		try {
			localStorage.removeItem(this.getKey(key));
		} catch (error) {
			console.error('Error removing item from localStorage', { key, error });
		}
	}

	// JSON values
	setJSON<T>(key: string, value: T): void {
		try {
			const json = JSON.stringify(value);
			this.setItem(key, json);
		} catch (error) {
			console.error('Error setting JSON item in localStorage', { key, error });
		}
	}

	getJSON<T>(key: string): T | null {
		try {
			const json = this.getItem(key);
			if (!json) return null;
			const parsed: unknown = JSON.parse(json);
			return parsed as T;
		} catch (error) {
			console.error('Error getting JSON item from localStorage', {
				key,
				error,
			});
			return null;
		}
	}

	// Clear all items with prefix
	clear(): void {
		try {
			const keysToRemove: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith(this.prefix)) {
					keysToRemove.push(key);
				}
			}
			keysToRemove.forEach((k) => {
				localStorage.removeItem(k);
			});
		} catch (error) {
			console.error('Error clearing localStorage:', error);
		}
	}

	// Get all keys with prefix
	getKeys(): string[] {
		try {
			const keys: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith(this.prefix)) {
					keys.push(key.substring(this.prefix.length));
				}
			}
			return keys;
		} catch (error) {
			console.error('Error getting keys from localStorage:', error);
			return [];
		}
	}
}

// Export singleton instance
export default new StorageService();
