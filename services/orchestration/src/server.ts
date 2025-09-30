import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Readable } from 'node:stream';
import type { MasterAgentOrchestrator } from './masterAgent.js';

const jsonResponse = (res: ServerResponse, status: number, body: unknown) => {
	const data = JSON.stringify(body);
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Content-Length', Buffer.byteLength(data));
	res.end(data);
};

const readBody = async (req: IncomingMessage): Promise<unknown> => {
	const chunks: Buffer[] = [];
	for await (const chunk of req as Readable) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}

	if (!chunks.length) {
		return {};
	}

	const raw = Buffer.concat(chunks).toString('utf8');
	try {
		return JSON.parse(raw);
	} catch (error) {
		throw new Error(
			`brAInwav orchestration received invalid JSON payload: ${(error as Error).message}`,
		);
	}
};

export interface OrchestrationServerDeps {
	orchestrator: MasterAgentOrchestrator;
}

export const createOrchestrationServer = (deps: OrchestrationServerDeps) =>
	createServer(async (req, res) => {
		if (!req.url) {
			jsonResponse(res, 400, { message: 'brAInwav orchestration request missing URL' });
			return;
		}

		if (req.method === 'POST' && req.url === '/agents/execute') {
			try {
				const payload = (await readBody(req)) as {
					steps: Array<{ id: string; adapterId: string; prompt: string }>;
					context: { memory: Record<string, unknown>; inputs?: Record<string, unknown> };
				};

				const result = await deps.orchestrator.execute(payload);
				jsonResponse(res, 200, {
					workflowLog: result.workflow.executionLog,
					stepLogs: result.stepLogs,
				});
				return;
			} catch (error) {
				jsonResponse(res, 500, {
					message: 'brAInwav orchestration failed to execute plan',
					detail: (error as Error).message,
				});
				return;
			}
		}

		jsonResponse(res, 404, { message: 'brAInwav orchestration endpoint not found' });
	});
