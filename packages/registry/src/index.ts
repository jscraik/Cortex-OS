import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import { collectDefaultMetrics, Registry as MetricsRegistry } from "prom-client";
import { z } from "zod";
import { logger } from "./logger.js";

interface SchemaRegistryOptions {
  readonly port?: number;
  readonly contractsPath?: string;
}

interface SchemaDocument {
  readonly $id?: string;
  readonly title?: string;
  readonly description?: string;
  readonly [key: string]: unknown;
}

interface SchemaMeta {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly version: string;
  readonly hash: string;
}

function isValidSchemaDocument(obj: unknown): obj is SchemaDocument {
  return typeof obj === "object" && obj !== null;
}

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function parseFileName(file: string): { id: string; version: string } | null {
  const match = file.match(/^(.+)@(\d+\.\d+\.\d+)\.json$/);
  return match ? { id: match[1], version: match[2] } : null;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export class SchemaRegistry {
  private readonly app: Application;
  private readonly port: number;
  private readonly contractsPath: string;
  private readonly ajv: Ajv;
  private readonly schemaCache = new Map<string, SchemaDocument>();
  private readonly validatorCache = new Map<string, ValidateFunction>();
  private readonly metricsRegistry = new MetricsRegistry();

  constructor(options: SchemaRegistryOptions = {}) {
    this.port = options.port ?? 3001;
    this.contractsPath = options.contractsPath ?? path.join(process.cwd(), "contracts");
    this.app = express();
    this.ajv = new Ajv({ strict: true });
    addFormats(this.ajv);
    collectDefaultMetrics({ register: this.metricsRegistry });
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(
      cors({ origin: ["http://localhost:3000", "http://localhost:5173"], credentials: true })
    );
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      if (req.path === "/health" || req.path === "/metrics") return next();
      const expectedKey = process.env.REGISTRY_API_KEY;
      if (expectedKey && req.get("x-api-key") !== expectedKey) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get("/health", (_req, res) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });

    this.app.get("/metrics", async (_req, res) => {
      try {
        res.set("Content-Type", this.metricsRegistry.contentType);
        res.end(await this.metricsRegistry.metrics());
      } catch (err) {
        logger.error({ err }, "Failed to collect metrics");
        res.status(500).end();
      }
    });

    this.app.get("/schemas", async (_req, res) => {
      const schemas = await this.getAvailableSchemas();
      res.json({ schemas, count: schemas.length, timestamp: new Date().toISOString() });
    });

    this.app.post("/schemas", async (req, res) => {
      const bodySchema = z.object({
        category: z.string(),
        version: z.string(),
        schema: z.record(z.any()),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid schema payload", issues: parsed.error.issues });
      }
      const { category, version, schema } = parsed.data;
      if (typeof schema.$id !== "string") {
        return res.status(400).json({ error: "Schema must include $id" });
      }

      try {
        this.ajv.compile(schema);
      } catch (err) {
        logger.error({ err }, "Invalid schema");
        return res.status(400).json({ error: "Invalid schema" });
      }

      const categoryDir = path.join(this.contractsPath, category);
      const fileName = `${schema.$id.replace(/[^a-zA-Z0-9-_]/g, "_")}@${version}.json`;
      const filePath = path.join(categoryDir, fileName);

      try {
        await fs.mkdir(categoryDir, { recursive: true });
        const content = JSON.stringify(schema, null, 2);
        await fs.writeFile(filePath, content);
        const hash = computeHash(content);
        const cacheKey = `${schema.$id}@${version}`;
        this.schemaCache.set(cacheKey, schema);
        this.validatorCache.delete(cacheKey);
        res.status(201).json({ message: "Schema registered", schemaId: schema.$id, version, hash });
      } catch (err) {
        logger.error({ err }, "Failed to register schema");
        res.status(500).json({ error: "Failed to register schema" });
      }
    });

    this.app.get("/schemas/:schemaId", async (req, res) => {
      const { schemaId } = req.params;
      const version = typeof req.query.version === "string" ? req.query.version : undefined;
      const result = await this.getSchemaById(schemaId, version);
      if (!result) {
        return res.status(404).json({ error: "Schema not found", schemaId });
      }
      res.json({
        schema: result.schema,
        schemaId,
        version: result.version,
        hash: result.hash,
        timestamp: new Date().toISOString(),
      });
    });

    this.app.post("/validate/:schemaId", async (req, res) => {
      const { schemaId } = req.params;
      const version = typeof req.query.version === "string" ? req.query.version : undefined;
      const eventData: unknown = req.body;
      if (eventData === undefined || eventData === null ||
          (typeof eventData === "object" && Object.keys(eventData as Record<string, unknown>).length === 0)) {
        return res.status(400).json({ error: "No event data provided" });
      }

      const result = await this.getSchemaById(schemaId, version);
      if (!result) {
        return res.status(404).json({ error: "Schema not found", schemaId });
      }

      const cacheKey = `${schemaId}@${result.version}`;
      const valid = this.validateEvent(cacheKey, eventData, result.schema);
      res.json({ valid, schemaId, version: result.version, timestamp: new Date().toISOString() });
    });

    this.app.get("/categories/:category", async (req, res) => {
      const { category } = req.params;
      const schemas = await this.getSchemasByCategory(category);
      res.json({ category, schemas, count: schemas.length, timestamp: new Date().toISOString() });
    });

    this.app.use((err: unknown, _req: express.Request, res: express.Response) => {
      logger.error({ err }, "Unhandled error");
      res.status(500).json({ error: "Internal Server Error" });
    });
  }

  private async getAvailableSchemas(): Promise<SchemaMeta[]> {
    const schemas: SchemaMeta[] = [];
    try {
      const categories = await fs.readdir(this.contractsPath);
      for (const category of categories) {
        const categorySchemas = await this.getSchemasByCategory(category);
        schemas.push(...categorySchemas.map((s) => ({ ...s, category })));
      }
    } catch {
      /* ignore */
    }
    return schemas;
  }

  private async getSchemaById(
    schemaId: string,
    version?: string
  ): Promise<{ schema: SchemaDocument; version: string; hash: string } | null> {
    const categories = await fs.readdir(this.contractsPath).catch(() => []);
    for (const category of categories) {
      const result = await this.searchSchemaInCategory(category, schemaId, version);
      if (result) return result;
    }
    return null;
  }

  private async searchSchemaInCategory(
    category: string,
    schemaId: string,
    version?: string
  ): Promise<{ schema: SchemaDocument; version: string; hash: string } | null> {
    const categoryPath = path.join(this.contractsPath, category);
    const files = await fs.readdir(categoryPath).catch(() => []);
    let candidate: { schema: SchemaDocument; version: string; hash: string } | null = null;
    for (const file of files) {
      const parsed = parseFileName(file);
      if (!parsed || parsed.id !== schemaId) continue;
      if (version && parsed.version !== version) continue;
      const schemaPath = path.join(categoryPath, file);
      const content = await fs.readFile(schemaPath, "utf-8");
      const schemaData: unknown = JSON.parse(content);
      if (!isValidSchemaDocument(schemaData) || schemaData.$id !== schemaId) continue;
      const hash = computeHash(content);
      if (version) return { schema: schemaData, version: parsed.version, hash };
      if (!candidate || compareVersions(parsed.version, candidate.version) > 0) {
        candidate = { schema: schemaData, version: parsed.version, hash };
      }
    }
    return candidate;
  }

  private async getSchemasByCategory(category: string): Promise<SchemaMeta[]> {
    const schemas: SchemaMeta[] = [];
    const categoryPath = path.join(this.contractsPath, category);
    const files = await fs.readdir(categoryPath).catch(() => []);
    for (const file of files) {
      const parsed = parseFileName(file);
      if (!parsed) continue;
      const schemaPath = path.join(categoryPath, file);
      try {
        const content = await fs.readFile(schemaPath, "utf-8");
        const schemaData: unknown = JSON.parse(content);
        if (
          isValidSchemaDocument(schemaData) &&
          schemaData.$id === parsed.id &&
          schemaData.title &&
          schemaData.description
        ) {
          const hash = computeHash(content);
          schemas.push({
            id: schemaData.$id,
            title: schemaData.title,
            description: schemaData.description,
            category,
            version: parsed.version,
            hash,
          });
        }
      } catch {
        /* ignore invalid schema */
      }
    }
    return schemas;
  }

  private validateEvent(
    cacheKey: string,
    eventData: unknown,
    schema: SchemaDocument
  ): boolean {
    let validate = this.validatorCache.get(cacheKey);
    if (!validate) {
      try {
        validate = this.ajv.compile(schema);
        this.validatorCache.set(cacheKey, validate);
      } catch {
        return false;
      }
    }
    return validate(eventData) as boolean;
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`Schema Registry listening on port ${this.port}`);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  new SchemaRegistry().start();
}

