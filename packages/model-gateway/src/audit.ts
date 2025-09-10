import { promises as fs } from 'node:fs';

export type AuditEvent = {
	service: string;
	operation: string;
	context: Record<string, any>;
	data: any;
	timestamp: string;
};

export function auditEvent(
	service: string,
	operation: string,
	context: Record<string, any>,
	data: any,
): AuditEvent {
	return {
		service,
		operation,
		context,
		data,
		timestamp: new Date().toISOString(),
	};
}

export async function record(event: AuditEvent): Promise<void> {
	const logPath = process.env.CORTEX_AUDIT_LOG;
	const line = `${JSON.stringify(event)}\n`;
	if (logPath) {
		await fs.appendFile(logPath, line, 'utf8');
	} else {
		console.log('audit', line.trim());
	}
}
