import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';

export interface ExternalStorageConfig {
	enabled: boolean;
	preferredPath?: string;
	fallbackPaths: string[];
	createDirectories: boolean;
	maxStorageSizeGB?: number;
	monitorInterval?: number;
}

export interface StorageStatus {
	path: string;
	available: boolean;
	mounted: boolean;
	sizeGB: number;
	freeSpaceGB: number;
	writeable: boolean;
	lastChecked: Date;
}

export interface StorageEvent {
	type: 'mounted' | 'unmounted' | 'error' | 'low-space';
	path: string;
	details?: any;
	timestamp: Date;
}

export class ExternalStorageManager extends EventEmitter {
	private config: ExternalStorageConfig;
	private currentStorage: string | null = null;
	private status: Map<string, StorageStatus> = new Map();
	private monitorTimer?: NodeJS.Timer;

	constructor(config: ExternalStorageConfig) {
		super();
		this.config = {
			monitorInterval: 30000, // 30 seconds
			createDirectories: true,
			...config,
		};
	}

	/**
	 * Initialize external storage manager
	 */
	async initialize(): Promise<void> {
		// Check all configured paths
		for (const storagePath of this.getStoragePaths()) {
			await this.checkStoragePath(storagePath);
		}

		// Select best available storage
		this.selectBestStorage();

		// Start monitoring if enabled
		if (this.config.monitorInterval && this.config.monitorInterval > 0) {
			this.startMonitoring();
		}
	}

	/**
	 * Get all storage paths in priority order
	 */
	private getStoragePaths(): string[] {
		const paths: string[] = [];

		// Add preferred path first if specified
		if (this.config.preferredPath) {
			paths.push(this.config.preferredPath);
		}

		// Add fallback paths
		paths.push(...this.config.fallbackPaths);

		return paths;
	}

	/**
	 * Check a specific storage path
	 */
	private async checkStoragePath(storagePath: string): Promise<void> {
		try {
			const status: StorageStatus = {
				path: storagePath,
				available: false,
				mounted: false,
				sizeGB: 0,
				freeSpaceGB: 0,
				writeable: false,
				lastChecked: new Date(),
			};

			// Check if path exists
			if (!fs.existsSync(storagePath)) {
				if (this.config.createDirectories) {
					fs.mkdirSync(storagePath, { recursive: true });
				} else {
					this.status.set(storagePath, status);
					return;
				}
			}

			// Check if it's a mount point (Unix-like systems)
			try {
				const stats = fs.statfsSync(storagePath);
				status.mounted = true;
				status.sizeGB = stats.bsize * stats.blocks / (1024 * 1024 * 1024);
				status.freeSpaceGB = stats.bsize * stats.bavail / (1024 * 1024 * 1024);
			} catch {
				status.mounted = false;
			}

			// Check if path is writeable
			try {
				const testFile = path.join(storagePath, '.write-test');
				fs.writeFileSync(testFile, 'test');
				fs.unlinkSync(testFile);
				status.writeable = true;
			} catch {
				status.writeable = false;
			}

			status.available = status.mounted && status.writeable;

			// Check storage limits
			if (this.config.maxStorageSizeGB && status.sizeGB > this.config.maxStorageSizeGB) {
				status.available = false;
			}

			this.status.set(storagePath, status);

			// Emit events for state changes
			const prevStatus = this.status.get(storagePath);
			if (!prevStatus || prevStatus.available !== status.available) {
				this.emit('storage-change', {
					type: status.available ? 'mounted' : 'unmounted',
					path: storagePath,
					timestamp: new Date(),
				} as StorageEvent);
			}

			// Check for low space
			if (status.available && status.freeSpaceGB < 1) { // Less than 1GB
				this.emit('storage-change', {
					type: 'low-space',
					path: storagePath,
					details: { freeSpaceGB: status.freeSpaceGB },
					timestamp: new Date(),
				} as StorageEvent);
			}
		} catch (error) {
			this.emit('storage-change', {
				type: 'error',
				path: storagePath,
				details: error,
				timestamp: new Date(),
			} as StorageEvent);

			this.status.set(storagePath, {
				path: storagePath,
				available: false,
				mounted: false,
				sizeGB: 0,
				freeSpaceGB: 0,
				writeable: false,
				lastChecked: new Date(),
			});
		}
	}

	/**
	 * Select the best available storage path
	 */
	private selectBestStorage(): void {
		const paths = this.getStoragePaths();

		for (const path of paths) {
			const status = this.status.get(path);
			if (status?.available) {
				if (this.currentStorage !== path) {
					const previous = this.currentStorage;
					this.currentStorage = path;

					this.emit('storage-changed', {
						previous,
						current: path,
						timestamp: new Date(),
					});
				}
				return;
			}
		}

		// No storage available
		this.currentStorage = null;
	}

	/**
	 * Start monitoring storage paths
	 */
	private startMonitoring(): void {
		if (this.monitorTimer) {
			clearInterval(this.monitorTimer);
		}

		this.monitorTimer = setInterval(async () => {
			for (const path of this.getStoragePaths()) {
				await this.checkStoragePath(path);
			}
			this.selectBestStorage();
		}, this.config.monitorInterval);
	}

	/**
	 * Stop monitoring
	 */
	stopMonitoring(): void {
		if (this.monitorTimer) {
			clearInterval(this.monitorTimer);
			this.monitorTimer = undefined;
		}
	}

	/**
	 * Get the current storage path
	 */
	getCurrentStorage(): string | null {
		return this.currentStorage;
	}

	/**
	 * Get status for all storage paths
	 */
	getAllStatus(): StorageStatus[] {
		return Array.from(this.status.values());
	}

	/**
	 * Get status for a specific path
	 */
	getStatus(path: string): StorageStatus | undefined {
		return this.status.get(path);
	}

	/**
	 * Check if current storage is available
	 */
	isAvailable(): boolean {
		return this.currentStorage !== null;
	}

	/**
	 * Get data directory for memories
	 */
	getDataDirectory(): string {
		if (!this.currentStorage) {
			throw new Error('No external storage available');
		}
		return path.join(this.currentStorage, 'cortex-memories');
	}

	/**
	 * Ensure data directory exists
	 */
	ensureDataDirectory(): string {
		const dataDir = this.getDataDirectory();

		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}

		return dataDir;
	}
}

// Default configuration for external storage
export const DEFAULT_EXTERNAL_STORAGE_CONFIG: ExternalStorageConfig = {
	enabled: true,
	preferredPath: '/Volumes/ExternalSSD/cortex-memories',
	fallbackPaths: [
		'/Volumes/ExternalHDD/cortex-memories',
		'/Volumes/ExternalSSD2/cortex-memories',
		process.env.MEMORIES_EXTERNAL_STORAGE_PATH || './external-storage',
	],
	createDirectories: true,
	maxStorageSizeGB: 1000, // 1TB
	monitorInterval: 30000, // 30 seconds
};

// Singleton instance
let externalStorageManager: ExternalStorageManager | null = null;

/**
 * Get or create the external storage manager instance
 */
export function getExternalStorageManager(config?: Partial<ExternalStorageConfig>): ExternalStorageManager {
	if (!externalStorageManager) {
		const finalConfig = {
			...DEFAULT_EXTERNAL_STORAGE_CONFIG,
			...config,
		};
		externalStorageManager = new ExternalStorageManager(finalConfig);
	}
	return externalStorageManager;
}

/**
 * Initialize external storage with environment configuration
 */
export async function initializeExternalStorage(): Promise<ExternalStorageManager> {
	const config: Partial<ExternalStorageConfig> = {
		enabled: process.env.MEMORIES_EXTERNAL_STORAGE_ENABLED === 'true',
		preferredPath: process.env.MEMORIES_EXTERNAL_STORAGE_PREFERRED_PATH,
		fallbackPaths: process.env.MEMORIES_EXTERNAL_STORAGE_FALLBACK_PATHS?.split(',') || [],
		maxStorageSizeGB: process.env.MEMORIES_EXTERNAL_STORAGE_MAX_SIZE_GB
			? parseInt(process.env.MEMORIES_EXTERNAL_STORAGE_MAX_SIZE_GB, 10)
			: undefined,
		monitorInterval: process.env.MEMORIES_EXTERNAL_STORAGE_MONITOR_INTERVAL_MS
			? parseInt(process.env.MEMORIES_EXTERNAL_STORAGE_MONITOR_INTERVAL_MS, 10)
			: undefined,
	};

	const manager = getExternalStorageManager(config);
	await manager.initialize();

	return manager;
}