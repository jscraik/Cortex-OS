import type { Request, Response } from 'express';
import logger from '../utils/logger';
import { getToolEvents } from '../utils/tool-store';

export async function getChatTools(req: Request, res: Response) {
	try {
		const { sessionId } = req.params;
		const events = getToolEvents(sessionId);
		res.json({ events });
	} catch (error) {
		logger.error('tool_events:fetch_failed', { error });
		res.status(500).json({ error: 'Failed to get tool events' });
	}
}
