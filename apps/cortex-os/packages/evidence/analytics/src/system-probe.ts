import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';

type CpuTimes = Array<{ idle: number; total: number }>;

export interface SystemProbeSnapshot {
	cpuPercent: number;
	memoryPercent: number;
	gpuPercent?: number;
	networkInboundBytesPerSecond: number;
	networkOutboundBytesPerSecond: number;
	diskReadBytesPerSecond: number;
	diskWriteBytesPerSecond: number;
}

export interface AgentResourceUsage {
	memory: number;
	cpu: number;
	gpu?: number;
}

export interface SystemProbe {
	sample(): Promise<SystemProbeSnapshot>;
	getAgentUsage(): Promise<AgentResourceUsage>;
}

const execFileAsync = promisify(execFile);
const SAMPLE_INTERVAL_MS = 200;
const SECTOR_SIZE_BYTES = 512;

function clamp(value: number, min = 0, max = 100): number {
	if (Number.isNaN(value)) {
		return min;
	}
	return Math.min(Math.max(value, min), max);
}

interface RawSnapshot {
	timestamp: number;
	cpuTimes: CpuTimes;
	memoryPercent: number;
	networkBytes: { rx: number; tx: number };
	diskBytes: { read: number; write: number };
}

export class NodeSystemProbe implements SystemProbe {
	private readonly sampleInterval: number;
	private gpuProbeDisabled = false;
	private lastGpuPercent?: number;

	constructor(options: { sampleIntervalMs?: number } = {}) {
		this.sampleInterval = options.sampleIntervalMs ?? SAMPLE_INTERVAL_MS;
	}

	async sample(): Promise<SystemProbeSnapshot> {
		const start = await this.captureRawSnapshot();
		await this.delay(this.sampleInterval);
		const end = await this.captureRawSnapshot();

		const elapsedMs = Math.max(end.timestamp - start.timestamp, 1);
		const cpuPercent = this.computeCpuPercent(start.cpuTimes, end.cpuTimes);
		const memoryPercent = end.memoryPercent;
		const networkInbound = this.computeRate(start.networkBytes.rx, end.networkBytes.rx, elapsedMs);
		const networkOutbound = this.computeRate(start.networkBytes.tx, end.networkBytes.tx, elapsedMs);
		const diskRead = this.computeRate(start.diskBytes.read, end.diskBytes.read, elapsedMs);
		const diskWrite = this.computeRate(start.diskBytes.write, end.diskBytes.write, elapsedMs);
		const gpuPercent = await this.trySampleGpuPercent();
		if (gpuPercent !== undefined) {
			this.lastGpuPercent = gpuPercent;
		}

		return {
			cpuPercent,
			memoryPercent,
			gpuPercent: gpuPercent ?? this.lastGpuPercent,
			networkInboundBytesPerSecond: networkInbound,
			networkOutboundBytesPerSecond: networkOutbound,
			diskReadBytesPerSecond: diskRead,
			diskWriteBytesPerSecond: diskWrite,
		};
	}

	async getAgentUsage(_agentId: string): Promise<AgentResourceUsage> {
		const memoryUsage = process.memoryUsage();
		const rssMb = memoryUsage.rss / (1024 * 1024);
		const cpuUsage = process.cpuUsage();
		const uptimeSeconds = process.uptime();
		const totalMicros = cpuUsage.user + cpuUsage.system;
		const cpuPercent =
			uptimeSeconds <= 0 ? 0 : clamp((totalMicros / (uptimeSeconds * 1_000_000)) * 100);

		return {
			memory: Number(rssMb.toFixed(2)),
			cpu: Number(cpuPercent.toFixed(2)),
			gpu: this.lastGpuPercent ?? 0,
		};
	}

	private async captureRawSnapshot(): Promise<RawSnapshot> {
		const cpuTimes = this.captureCpuTimes();
		const memoryPercent = this.captureMemoryPercent();
		const [networkBytes, diskBytes] = await Promise.all([
			this.readNetworkCounters(),
			this.readDiskCounters(),
		]);

		return {
			timestamp: Date.now(),
			cpuTimes,
			memoryPercent,
			networkBytes,
			diskBytes,
		};
	}

	private captureCpuTimes(): CpuTimes {
		return os.cpus().map((cpu) => {
			const times = cpu.times;
			const total = times.user + times.nice + times.sys + times.irq + times.idle;
			return {
				idle: times.idle,
				total,
			};
		});
	}

	private captureMemoryPercent(): number {
		const total = os.totalmem();
		const free = os.freemem();
		if (total === 0) {
			return 0;
		}
		const used = total - free;
		return clamp((used / total) * 100);
	}

	private computeCpuPercent(start: CpuTimes, end: CpuTimes): number {
		const length = Math.min(start.length, end.length);
		let idleDiff = 0;
		let totalDiff = 0;

		for (let index = 0; index < length; index += 1) {
			const startCpu = start[index];
			const endCpu = end[index];
			idleDiff += endCpu.idle - startCpu.idle;
			totalDiff += endCpu.total - startCpu.total;
		}

		if (totalDiff <= 0) {
			return 0;
		}

		return clamp(((totalDiff - idleDiff) / totalDiff) * 100);
	}

	private computeRate(start: number, end: number, elapsedMs: number): number {
		const diff = Math.max(end - start, 0);
		const perSecond = (diff / elapsedMs) * 1000;
		return Number(perSecond.toFixed(2));
	}

	private async readNetworkCounters(): Promise<{ rx: number; tx: number }> {
		try {
			const content = await readFile('/proc/net/dev', 'utf-8');
			const lines = content.split(/\r?\n/).slice(2);
			let rx = 0;
			let tx = 0;
			for (const line of lines) {
				if (!line.trim()) {
					continue;
				}
				const [iface, rest] = line.split(':');
				if (!rest || iface.trim().startsWith('lo')) {
					continue;
				}
				const parts = rest.trim().split(/\s+/);
				if (parts.length >= 9) {
					rx += Number.parseInt(parts[0] ?? '0', 10);
					tx += Number.parseInt(parts[8] ?? '0', 10);
				}
			}
			return { rx, tx };
		} catch {
			return { rx: 0, tx: 0 };
		}
	}

	private async readDiskCounters(): Promise<{ read: number; write: number }> {
		try {
			const content = await readFile('/proc/diskstats', 'utf-8');
			const lines = content.split(/\r?\n/);
			let read = 0;
			let write = 0;
			for (const line of lines) {
				const parts = line.trim().split(/\s+/);
				if (parts.length < 14) {
					continue;
				}
				const device = parts[2] ?? '';
				if (!device || device.startsWith('loop') || device.startsWith('ram')) {
					continue;
				}
				const readSectors = Number.parseInt(parts[5] ?? '0', 10);
				const writeSectors = Number.parseInt(parts[9] ?? '0', 10);
				read += readSectors * SECTOR_SIZE_BYTES;
				write += writeSectors * SECTOR_SIZE_BYTES;
			}
			return { read, write };
		} catch {
			return { read: 0, write: 0 };
		}
	}

	private async trySampleGpuPercent(): Promise<number | undefined> {
		if (this.gpuProbeDisabled) {
			return undefined;
		}

		try {
			const { stdout } = await execFileAsync('nvidia-smi', [
				'--query-gpu=utilization.gpu',
				'--format=csv,noheader,nounits',
			]);
			const firstLine = stdout.trim().split(/\r?\n/)[0];
			if (!firstLine) {
				return undefined;
			}
			const value = Number.parseFloat(firstLine.trim());
			if (Number.isNaN(value)) {
				return undefined;
			}
			return clamp(value);
		} catch {
			this.gpuProbeDisabled = true;
			return undefined;
		}
	}

	private async delay(ms: number): Promise<void> {
		await new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
}
