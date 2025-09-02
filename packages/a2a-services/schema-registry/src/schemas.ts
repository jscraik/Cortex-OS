import { z } from "zod";

export const schemaForSchema = z.object({
	id: z.string().describe("The unique identifier for the schema."),
	name: z.string().describe("The name of the schema."),
	version: z.string().describe("The version of the schema."),
	schema: z.record(z.any()).describe("The JSON schema itself."),
});

export type Schema = z.infer<typeof schemaForSchema>;
