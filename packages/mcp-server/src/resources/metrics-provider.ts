import os from 'node:os';
import type { ResourceContent } from '../types/mcp-2025.js';
import { BRAND } from '../utils/brand.js';

const HEALTH_URI = 'metrics://cortex-os/health';

export async function readHealthMetrics(): Promise<ResourceContent> {
	const now = new Date();
	const payload = {
		brand: BRAND.prefix,
		status: 'healthy',
		timestamp: now.toISOString(),
		processUptimeSeconds: Math.round(process.uptime()),
		systemLoad: os.loadavg(),
		memoryUsage: process.memoryUsage(),
	};

	return {
		uri: HEALTH_URI,
		mimeType: 'application/json',
		blob: JSON.stringify(payload, null, 2), // Use blob instead of text for non-text/plain
	};
}
