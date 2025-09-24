// Model controller for Cortex WebUI backend

import type { Request, Response } from 'express';
import { getAllModels, getModelById as getModelByIdService } from '../services/modelService.js';

export function getModels(_req: Request, res: Response): void {
	try {
		const models = getAllModels();
		res.json(models);
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
}

export function getModelById(req: Request, res: Response): void {
	try {
		const { id } = req.params;
		const model = getModelByIdService(id);
		if (!model) {
			res.status(404).json({ error: 'Model not found' });
			return;
		}
		res.json(model);
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
}
