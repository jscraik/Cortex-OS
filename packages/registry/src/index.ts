import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ValidateFunction } from "ajv";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";

interface SchemaRegistryOptions {
	port?: number;
	contractsPath?: string;
}

interface SchemaMeta {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly category: string;
}

interface CategorySchemaMeta {
	readonly id: string;
	readonly title: string;
	readonly description: string;
}

interface SchemaDocument {
	readonly $id?: string;
	readonly title?: string;
	readonly description?: string;
	readonly [key: string]: unknown;
}

// Type guard to validate JSON schema structure
function isValidSchemaDocument(obj: unknown): obj is SchemaDocument {
	return typeof obj === "object" && obj !== null;
}

// Helper function to load and parse a single schema file
async function loadSchemaFile(
	schemaPath: string,
): Promise<SchemaDocument | null> {
	try {
		const schemaContent = await fs.readFile(schemaPath, "utf-8");
		const parsed: unknown = JSON.parse(schemaContent);
		return isValidSchemaDocument(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

// Helper function to check if schema matches the target ID
function schemaMatches(schema: SchemaDocument, schemaId: string): boolean {
	return schema.$id === schemaId;
}

// Helper function to get schema files from a directory
async function getSchemaFilesInDirectory(
	categoryPath: string,
): Promise<string[]> {
	try {
		const stat = await fs.stat(categoryPath);
		if (!stat.isDirectory()) {
			return [];
		}
		const files = await fs.readdir(categoryPath);
		return files.filter((file) => file.endsWith(".json"));
	} catch {
		return [];
	}
}

export class SchemaRegistry {
	private readonly app: Application;
	private readonly port: number;
	private readonly contractsPath: string;
	private readonly schemaCache = new Map<string, SchemaDocument>();
	private readonly ajv: Ajv;
	private readonly validatorCache = new Map<string, ValidateFunction>();

	constructor(options: SchemaRegistryOptions = {}) {
		this.port = options.port || 3001;
		this.contractsPath =
			options.contractsPath || path.join(process.cwd(), "contracts");
		this.app = express();
		this.ajv = new Ajv({ strict: false });
		addFormats(this.ajv);

		this.setupMiddleware();
		this.setupRoutes();
	}

	private setupMiddleware(): void {
		this.app.use(helmet());
		this.app.use(
			cors({
				origin: ["http://localhost:3000", "http://localhost:5173"],
				credentials: true,
			}),
		);
		this.app.use(express.json());
	}

	private setupRoutes(): void {
		// Health check endpoint
		this.app.get("/health", (_req, res) => {
			res.json({ status: "healthy", timestamp: new Date().toISOString() });
		});

		// List all available schemas
		this.app.get("/schemas", (_req, res) => {
			this.getAvailableSchemas()
				.then((schemas) => {
					res.json({
						schemas,
						count: schemas.length,
						timestamp: new Date().toISOString(),
					});
				})
				.catch((error) => {
					res.status(500).json({
						error: "Failed to list schemas",
						message: error instanceof Error ? error.message : "Unknown error",
					});
				});
		});

		// Get specific schema by ID
		this.app.get("/schemas/:schemaId", (req, res) => {
			const { schemaId } = req.params;

			this.getSchemaById(schemaId)
				.then((schema) => {
					if (!schema) {
						return res.status(404).json({
							error: "Schema not found",
							schemaId,
						});
					}

					res.json({
						schema,
						schemaId,
						timestamp: new Date().toISOString(),
					});
				})
				.catch((error) => {
					res.status(500).json({
						error: "Failed to retrieve schema",
						message: error instanceof Error ? error.message : "Unknown error",
					});
				});
		});

		// Validate event against schema
		this.app.post("/validate/:schemaId", (req, res) => {
			const { schemaId } = req.params;
			const eventData: unknown = req.body;

			if (
				eventData === undefined ||
				eventData === null ||
				(typeof eventData === "object" &&
					Object.keys(eventData as Record<string, unknown>).length === 0)
			) {
				return res.status(400).json({
					error: "No event data provided",
				});
			}

			this.getSchemaById(schemaId)
				.then((schema) => {
					if (!schema) {
						return res.status(404).json({
							error: "Schema not found",
							schemaId,
						});
					}

					const isValid = this.validateEvent(eventData, schema);

					res.json({
						valid: isValid,
						schemaId,
						timestamp: new Date().toISOString(),
					});
				})
				.catch((error) => {
					res.status(500).json({
						error: "Validation failed",
						message: error instanceof Error ? error.message : "Unknown error",
					});
				});
		});

		// Get schemas by category
		this.app.get("/categories/:category", (req, res) => {
			const { category } = req.params;

			this.getSchemasByCategory(category)
				.then((schemas) => {
					res.json({
						category,
						schemas,
						count: schemas.length,
						timestamp: new Date().toISOString(),
					});
				})
				.catch((error) => {
					res.status(500).json({
						error: "Failed to retrieve category schemas",
						message: error instanceof Error ? error.message : "Unknown error",
					});
				});
		});
	}

	private async getAvailableSchemas(): Promise<SchemaMeta[]> {
		const schemas: SchemaMeta[] = [];

		try {
			await fs.access(this.contractsPath);
		} catch {
			return schemas;
		}

		try {
			const categories = await fs.readdir(this.contractsPath);

			for (const category of categories) {
				const categoryPath = path.join(this.contractsPath, category);

				try {
					const stat = await fs.stat(categoryPath);
					if (!stat.isDirectory()) {
						continue;
					}

					const files = await fs.readdir(categoryPath);
					const schemaFiles = files.filter((file) => file.endsWith(".json"));

					for (const schemaFile of schemaFiles) {
						try {
							const schemaPath = path.join(categoryPath, schemaFile);
							const schemaContent = await fs.readFile(schemaPath, "utf-8");
							const parsed: unknown = JSON.parse(schemaContent);

							if (!isValidSchemaDocument(parsed)) {
								// Skip invalid schema files
								continue;
							}

							if (parsed.$id && parsed.title && parsed.description) {
								schemas.push({
									id: parsed.$id,
									title: parsed.title,
									description: parsed.description,
									category,
								});
							}
						} catch {
							// Skip invalid schema files
						}
					}
				} catch {
					// Skip invalid category
				}
			}
		} catch {
			// Error reading contracts directory
		}

		return schemas;
	}

	private async getSchemaById(
		schemaId: string,
	): Promise<SchemaDocument | null> {
		// Check cache first
		if (this.schemaCache.has(schemaId)) {
			return this.schemaCache.get(schemaId) ?? null;
		}

		const schema = await this.searchSchemaInDirectories(schemaId);
		if (schema) {
			this.schemaCache.set(schemaId, schema);
		}
		return schema;
	}

	private async searchSchemaInDirectories(
		schemaId: string,
	): Promise<SchemaDocument | null> {
		try {
			await fs.access(this.contractsPath);
			const categories = await fs.readdir(this.contractsPath);

			for (const category of categories) {
				const schema = await this.searchSchemaInCategory(category, schemaId);
				if (schema) {
					return schema;
				}
			}
		} catch {
			// Directory access failed
		}
		return null;
	}

	private async searchSchemaInCategory(
		category: string,
		schemaId: string,
	): Promise<SchemaDocument | null> {
		const categoryPath = path.join(this.contractsPath, category);
		const schemaFiles = await getSchemaFilesInDirectory(categoryPath);

		for (const schemaFile of schemaFiles) {
			const schemaPath = path.join(categoryPath, schemaFile);
			const schema = await loadSchemaFile(schemaPath);

			if (schema && schemaMatches(schema, schemaId)) {
				return schema;
			}
		}
		return null;
	}

	private async getSchemasByCategory(
		category: string,
	): Promise<CategorySchemaMeta[]> {
		const schemas: CategorySchemaMeta[] = [];
		const categoryPath = path.join(this.contractsPath, category);

		try {
			await fs.access(categoryPath);
			const stat = await fs.stat(categoryPath);
			if (!stat.isDirectory()) {
				return schemas;
			}
		} catch {
			return schemas;
		}

		try {
			const files = await fs.readdir(categoryPath);
			const schemaFiles = files.filter((file) => file.endsWith(".json"));

			for (const schemaFile of schemaFiles) {
				try {
					const schemaPath = path.join(categoryPath, schemaFile);
					const schemaContent = await fs.readFile(schemaPath, "utf-8");
					const parsed: unknown = JSON.parse(schemaContent);

					if (!isValidSchemaDocument(parsed)) {
						// Skip invalid schema files
						continue;
					}

					if (parsed.$id && parsed.title && parsed.description) {
						schemas.push({
							id: parsed.$id,
							title: parsed.title,
							description: parsed.description,
						});
					}
				} catch {
					// Skip invalid schema files
				}
			}
		} catch {
			// Skip invalid category
		}

		return schemas;
	}

	private validateEvent(eventData: unknown, schema: SchemaDocument): boolean {
		if (!schema.$id) {
			return false;
		}

		let validate = this.validatorCache.get(schema.$id);
		if (!validate) {
			try {
				validate = this.ajv.compile(schema);
				this.validatorCache.set(schema.$id, validate);
			} catch {
				return false;
			}
		}

		return validate(eventData) as boolean;
	}

	public start(): void {
		this.app.listen(this.port, () => {
			// Server started successfully
		});
	}

	public getApp(): Application {
		return this.app;
	}
}

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
	const registry = new SchemaRegistry();
	registry.start();
}
