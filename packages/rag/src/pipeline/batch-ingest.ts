import { z } from "zod";
import type { Pipeline } from "../lib";
import { createWorker, resolveFileList, runWorkers } from "../lib/batch-ingest";

const ingestFilesSchema = z
	.object({
		pipeline: z.custom<Pipeline>(
			(p): p is Pipeline =>
				typeof p === "object" &&
				p !== null &&
				typeof (p as Record<string, unknown>).ingest === "function",
		),
		files: z.array(z.string()).default([]),
		root: z.string().optional(),
		include: z.array(z.string()).default(["**/*"]),
		exclude: z.array(z.string()).default([]),
		includePriority: z.boolean().default(false),
		chunkSize: z.number().int().positive().default(300),
		overlap: z.number().int().nonnegative().default(0),
		concurrency: z.number().int().positive().max(10).default(4),
	})
	.refine((v) => v.files.length > 0 || v.root, {
		message: "files or root is required",
		path: ["files"],
	});

export type IngestFilesParams = z.infer<typeof ingestFilesSchema>;

/**
 * Ingest multiple files concurrently using the provided RAG pipeline.
 * Inspired by batch processing in the RAG-Anything project.
 */
export async function ingestFiles(params: IngestFilesParams): Promise<void> {
	const {
		pipeline,
		files,
		root,
		include,
		exclude,
		includePriority,
		chunkSize,
		overlap,
		concurrency,
	} = ingestFilesSchema.parse(params);

	const uniqueFiles = await resolveFileList({
		files,
		root,
		include,
		exclude,
		includePriority,
	});
	const queue = [...uniqueFiles];

	const worker = createWorker({ pipeline, queue, chunkSize, overlap });
	await runWorkers(worker, concurrency, uniqueFiles.length);
}
