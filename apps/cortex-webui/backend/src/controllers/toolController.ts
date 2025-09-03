import type { Request, Response } from 'express';
import { getToolEvents } from '../utils/tool-store';

export async function getChatTools(req: Request, res: Response) {
	try {
		const { sessionId } = req.params;
		const events = getToolEvents(sessionId);
		res.json({ events });
	} catch (error) {
		console.error('Error getting tool events:', error);
		res.status(500).json({ error: 'Failed to get tool events' });
	}
}
