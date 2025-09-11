// Model controller for Cortex WebUI backend

import type { Request, Response } from 'express';
import { ModelService } from '../services/modelService';

export class ModelController {
  static getModels(req: Request, res: Response): void {
    try {
      const models = ModelService.getAllModels();
      res.json(models);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static getModelById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const model = ModelService.getModelById(id);

      if (!model) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.json(model);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
