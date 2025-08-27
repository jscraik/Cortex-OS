import express from 'express';
import { JSONSchema7 } from 'json-schema';
import { rateLimiter } from '@cortex-os/a2a-common';

interface Schema {
  id: string;
  name: string;
  version: string;
  schema: JSONSchema7;
}

const schemas: Schema[] = [];

export function createService() {
  const app = express();
  app.use(express.json());
  app.use(rateLimiter);

  app.post('/schemas', (req, res) => {
    const schema = req.body as Schema;
    schemas.push(schema);
    const location = `/schemas/${schema.name}/${schema.version}`;
    res.setHeader('Location', location);
    res.status(201).json({ ...schema, location });
  });

  app.get('/schemas/:name/:version', (req, res) => {
    const { name, version } = req.params;
    const schema = schemas.find((s) => s.name === name && s.version === version);
    if (schema) {
      res.json(schema);
    } else {
      res.status(404).send('Schema not found');
    }
  });

  app.get('/schemas/:name/latest', (req, res) => {
    const { name } = req.params;
    const latest = schemas
      .filter((s) => s.name === name)
      .sort((a, b) => (a.version > b.version ? -1 : 1))[0];
    if (latest) {
      res.json(latest);
    } else {
      res.status(404).send('Schema not found');
    }
  });

  return app;
}
