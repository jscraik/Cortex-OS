// Model controller for Cortex WebUI backend

import { Request, Response } from 'express';
import { ModelService } from '../services/modelService';

export class ModelController {
  static async getModels(req: Request, res: Response): Promise<void> {
    try {
      const models = await ModelService.getAllModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getModelById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const model = await ModelService.getModelById(id);

      if (!model) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }

      res.json(model);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
