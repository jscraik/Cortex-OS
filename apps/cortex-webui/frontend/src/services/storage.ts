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
			console.error(`Error setting item ${key} in localStorage:`, error);
		}
	}

	getItem(key: string): string | null {
		try {
			return localStorage.getItem(this.getKey(key));
		} catch (error) {
			console.error(`Error getting item ${key} from localStorage:`, error);
			return null;
		}
	}

	removeItem(key: string): void {
		try {
			localStorage.removeItem(this.getKey(key));
		} catch (error) {
			console.error(`Error removing item ${key} from localStorage:`, error);
		}
	}

	// JSON values
	setJSON<T>(key: string, value: T): void {
		try {
			const json = JSON.stringify(value);
			this.setItem(key, json);
		} catch (error) {
			console.error(`Error setting JSON item ${key} in localStorage:`, error);
		}
	}

	getJSON<T>(key: string): T | null {
		try {
			const json = this.getItem(key);
			return json ? JSON.parse(json) : null;
		} catch (error) {
			console.error(`Error getting JSON item ${key} from localStorage:`, error);
			return null;
		}
	}

	// Clear all items with prefix
	clear(): void {
		try {
			const keysToRemove: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith(this.prefix)) {
					keysToRemove.push(key);
				}
			}
			keysToRemove.forEach((key) => localStorage.removeItem(key));
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
				if (key && key.startsWith(this.prefix)) {
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
