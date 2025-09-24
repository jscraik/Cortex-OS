import type { Request, Response } from 'express';
import { authUtils } from '../auth';
import { authMonitoringService } from '../services/authMonitoringService.js';

export class AuthMonitoringController {
	async getMetrics(req: Request, res: Response) {
		try {
			const { timeRange } = req.query as { timeRange?: '1h' | '24h' | '7d' | '30d' };

			// Verify authentication
			const session = await authUtils.getSession(req);
			if (!session?.user) {
				return res.status(401).json({ error: 'Unauthorized' });
			}

			// Check admin permissions
			if (session.user.role !== 'admin') {
				return res.status(403).json({ error: 'Forbidden' });
			}

			const metrics = await authMonitoringService.getMetrics(timeRange);
			res.json({ metrics });
		} catch (error) {
			console.error('Failed to get auth metrics:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}

	async getRecentEvents(req: Request, res: Response) {
		try {
			const { limit } = req.query as { limit?: string };

			// Verify authentication
			const session = await authUtils.getSession(req);
			if (!session?.user) {
				return res.status(401).json({ error: 'Unauthorized' });
			}

			// Check admin permissions
			if (session.user.role !== 'admin') {
				return res.status(403).json({ error: 'Forbidden' });
			}

			const events = await authMonitoringService.getRecentEvents(parseInt(limit, 10) || 50);
			res.json({ events });
		} catch (error) {
			console.error('Failed to get recent auth events:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}

	async getSecurityAlerts(req: Request, res: Response) {
		try {
			// Verify authentication
			const session = await authUtils.getSession(req);
			if (!session?.user) {
				return res.status(401).json({ error: 'Unauthorized' });
			}

			// Check admin permissions
			if (session.user.role !== 'admin') {
				return res.status(403).json({ error: 'Forbidden' });
			}

			const alerts = await authMonitoringService.getSecurityAlerts();
			res.json({ alerts });
		} catch (error) {
			console.error('Failed to get security alerts:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	}
}

export const authMonitoringController = new AuthMonitoringController();
