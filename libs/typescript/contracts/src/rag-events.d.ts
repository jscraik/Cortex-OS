/**
 * RAG Event Contracts for A2A Communication
 * Contract-first definitions for RAG package events
 */
import { z } from 'zod';
export declare const RagEventTypes: {
	readonly QueryExecuted: 'rag.query.executed';
	readonly QueryCompleted: 'rag.query.completed';
	readonly IngestStarted: 'rag.ingest.started';
	readonly IngestCompleted: 'rag.ingest.completed';
	readonly EmbeddingGenerated: 'rag.embedding.generated';
	readonly IndexUpdated: 'rag.index.updated';
};
export declare const ragQueryExecutedSchema: z.ZodObject<
	{
		queryId: z.ZodString;
		query: z.ZodString;
		topK: z.ZodNumber;
		userId: z.ZodOptional<z.ZodString>;
		timestamp: z.ZodString;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		queryId: string;
		query: string;
		topK: number;
		metadata?: Record<string, unknown> | undefined;
		userId?: string | undefined;
	},
	{
		timestamp: string;
		queryId: string;
		query: string;
		topK: number;
		metadata?: Record<string, unknown> | undefined;
		userId?: string | undefined;
	}
>;
export declare const ragQueryCompletedSchema: z.ZodObject<
	{
		queryId: z.ZodString;
		results: z.ZodArray<
			z.ZodObject<
				{
					text: z.ZodString;
					score: z.ZodNumber;
					source: z.ZodOptional<z.ZodString>;
					metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
				},
				'strip',
				z.ZodTypeAny,
				{
					text: string;
					score: number;
					metadata?: Record<string, unknown> | undefined;
					source?: string | undefined;
				},
				{
					text: string;
					score: number;
					metadata?: Record<string, unknown> | undefined;
					source?: string | undefined;
				}
			>,
			'many'
		>;
		provider: z.ZodString;
		duration: z.ZodNumber;
		timestamp: z.ZodString;
		evidence: z.ZodOptional<
			z.ZodArray<
				z.ZodEffects<
					z.ZodObject<
						{
							id: z.ZodOptional<z.ZodString>;
							kind: z.ZodDefault<
								z.ZodEnum<['document', 'code', 'web', 'memory', 'log', 'other']>
							>;
							text: z.ZodOptional<z.ZodString>;
							uri: z.ZodOptional<z.ZodString>;
							startOffset: z.ZodOptional<z.ZodNumber>;
							endOffset: z.ZodOptional<z.ZodNumber>;
							score: z.ZodOptional<z.ZodNumber>;
							metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
							hash: z.ZodOptional<z.ZodString>;
							timestamp: z.ZodOptional<z.ZodString>;
						},
						'strip',
						z.ZodTypeAny,
						{
							kind: 'code' | 'document' | 'web' | 'memory' | 'log' | 'other';
							text?: string | undefined;
							id?: string | undefined;
							timestamp?: string | undefined;
							uri?: string | undefined;
							startOffset?: number | undefined;
							endOffset?: number | undefined;
							score?: number | undefined;
							metadata?: Record<string, unknown> | undefined;
							hash?: string | undefined;
						},
						{
							text?: string | undefined;
							id?: string | undefined;
							timestamp?: string | undefined;
							kind?:
								| 'code'
								| 'document'
								| 'web'
								| 'memory'
								| 'log'
								| 'other'
								| undefined;
							uri?: string | undefined;
							startOffset?: number | undefined;
							endOffset?: number | undefined;
							score?: number | undefined;
							metadata?: Record<string, unknown> | undefined;
							hash?: string | undefined;
						}
					>,
					{
						kind: 'code' | 'document' | 'web' | 'memory' | 'log' | 'other';
						text?: string | undefined;
						id?: string | undefined;
						timestamp?: string | undefined;
						uri?: string | undefined;
						startOffset?: number | undefined;
						endOffset?: number | undefined;
						score?: number | undefined;
						metadata?: Record<string, unknown> | undefined;
						hash?: string | undefined;
					},
					{
						text?: string | undefined;
						id?: string | undefined;
						timestamp?: string | undefined;
						kind?:
							| 'code'
							| 'document'
							| 'web'
							| 'memory'
							| 'log'
							| 'other'
							| undefined;
						uri?: string | undefined;
						startOffset?: number | undefined;
						endOffset?: number | undefined;
						score?: number | undefined;
						metadata?: Record<string, unknown> | undefined;
						hash?: string | undefined;
					}
				>,
				'many'
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		duration: number;
		results: {
			text: string;
			score: number;
			metadata?: Record<string, unknown> | undefined;
			source?: string | undefined;
		}[];
		queryId: string;
		provider: string;
		evidence?:
			| {
					kind: 'code' | 'document' | 'web' | 'memory' | 'log' | 'other';
					text?: string | undefined;
					id?: string | undefined;
					timestamp?: string | undefined;
					uri?: string | undefined;
					startOffset?: number | undefined;
					endOffset?: number | undefined;
					score?: number | undefined;
					metadata?: Record<string, unknown> | undefined;
					hash?: string | undefined;
			  }[]
			| undefined;
	},
	{
		timestamp: string;
		duration: number;
		results: {
			text: string;
			score: number;
			metadata?: Record<string, unknown> | undefined;
			source?: string | undefined;
		}[];
		queryId: string;
		provider: string;
		evidence?:
			| {
					text?: string | undefined;
					id?: string | undefined;
					timestamp?: string | undefined;
					kind?:
						| 'code'
						| 'document'
						| 'web'
						| 'memory'
						| 'log'
						| 'other'
						| undefined;
					uri?: string | undefined;
					startOffset?: number | undefined;
					endOffset?: number | undefined;
					score?: number | undefined;
					metadata?: Record<string, unknown> | undefined;
					hash?: string | undefined;
			  }[]
			| undefined;
	}
>;
export declare const ragIngestStartedSchema: z.ZodObject<
	{
		ingestId: z.ZodString;
		source: z.ZodOptional<z.ZodString>;
		contentLength: z.ZodNumber;
		expectedChunks: z.ZodNumber;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		ingestId: string;
		contentLength: number;
		expectedChunks: number;
		source?: string | undefined;
	},
	{
		timestamp: string;
		ingestId: string;
		contentLength: number;
		expectedChunks: number;
		source?: string | undefined;
	}
>;
export declare const ragIngestCompletedSchema: z.ZodObject<
	{
		ingestId: z.ZodString;
		success: z.ZodBoolean;
		documentsProcessed: z.ZodNumber;
		embeddingsGenerated: z.ZodNumber;
		duration: z.ZodNumber;
		timestamp: z.ZodString;
		error: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		duration: number;
		success: boolean;
		ingestId: string;
		documentsProcessed: number;
		embeddingsGenerated: number;
		error?: string | undefined;
	},
	{
		timestamp: string;
		duration: number;
		success: boolean;
		ingestId: string;
		documentsProcessed: number;
		embeddingsGenerated: number;
		error?: string | undefined;
	}
>;
export declare const ragEmbeddingGeneratedSchema: z.ZodObject<
	{
		embeddingId: z.ZodString;
		text: z.ZodString;
		provider: z.ZodString;
		dimensions: z.ZodNumber;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		text: string;
		timestamp: string;
		provider: string;
		embeddingId: string;
		dimensions: number;
	},
	{
		text: string;
		timestamp: string;
		provider: string;
		embeddingId: string;
		dimensions: number;
	}
>;
export declare const ragIndexUpdatedSchema: z.ZodObject<
	{
		indexId: z.ZodString;
		operation: z.ZodEnum<['add', 'update', 'delete']>;
		affectedDocuments: z.ZodNumber;
		indexSize: z.ZodNumber;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		operation: 'add' | 'update' | 'delete';
		indexId: string;
		affectedDocuments: number;
		indexSize: number;
	},
	{
		timestamp: string;
		operation: 'add' | 'update' | 'delete';
		indexId: string;
		affectedDocuments: number;
		indexSize: number;
	}
>;
export type RagQueryExecutedEvent = z.infer<typeof ragQueryExecutedSchema>;
export type RagQueryCompletedEvent = z.infer<typeof ragQueryCompletedSchema>;
export type RagIngestStartedEvent = z.infer<typeof ragIngestStartedSchema>;
export type RagIngestCompletedEvent = z.infer<typeof ragIngestCompletedSchema>;
export type RagEmbeddingGeneratedEvent = z.infer<
	typeof ragEmbeddingGeneratedSchema
>;
export type RagIndexUpdatedEvent = z.infer<typeof ragIndexUpdatedSchema>;
export declare const RagEventSchemas: {
	readonly 'rag.query.executed': z.ZodObject<
		{
			queryId: z.ZodString;
			query: z.ZodString;
			topK: z.ZodNumber;
			userId: z.ZodOptional<z.ZodString>;
			timestamp: z.ZodString;
			metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			queryId: string;
			query: string;
			topK: number;
			metadata?: Record<string, unknown> | undefined;
			userId?: string | undefined;
		},
		{
			timestamp: string;
			queryId: string;
			query: string;
			topK: number;
			metadata?: Record<string, unknown> | undefined;
			userId?: string | undefined;
		}
	>;
	readonly 'rag.query.completed': z.ZodObject<
		{
			queryId: z.ZodString;
			results: z.ZodArray<
				z.ZodObject<
					{
						text: z.ZodString;
						score: z.ZodNumber;
						source: z.ZodOptional<z.ZodString>;
						metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
					},
					'strip',
					z.ZodTypeAny,
					{
						text: string;
						score: number;
						metadata?: Record<string, unknown> | undefined;
						source?: string | undefined;
					},
					{
						text: string;
						score: number;
						metadata?: Record<string, unknown> | undefined;
						source?: string | undefined;
					}
				>,
				'many'
			>;
			provider: z.ZodString;
			duration: z.ZodNumber;
			timestamp: z.ZodString;
			evidence: z.ZodOptional<
				z.ZodArray<
					z.ZodEffects<
						z.ZodObject<
							{
								id: z.ZodOptional<z.ZodString>;
								kind: z.ZodDefault<
									z.ZodEnum<
										['document', 'code', 'web', 'memory', 'log', 'other']
									>
								>;
								text: z.ZodOptional<z.ZodString>;
								uri: z.ZodOptional<z.ZodString>;
								startOffset: z.ZodOptional<z.ZodNumber>;
								endOffset: z.ZodOptional<z.ZodNumber>;
								score: z.ZodOptional<z.ZodNumber>;
								metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
								hash: z.ZodOptional<z.ZodString>;
								timestamp: z.ZodOptional<z.ZodString>;
							},
							'strip',
							z.ZodTypeAny,
							{
								kind: 'code' | 'document' | 'web' | 'memory' | 'log' | 'other';
								text?: string | undefined;
								id?: string | undefined;
								timestamp?: string | undefined;
								uri?: string | undefined;
								startOffset?: number | undefined;
								endOffset?: number | undefined;
								score?: number | undefined;
								metadata?: Record<string, unknown> | undefined;
								hash?: string | undefined;
							},
							{
								text?: string | undefined;
								id?: string | undefined;
								timestamp?: string | undefined;
								kind?:
									| 'code'
									| 'document'
									| 'web'
									| 'memory'
									| 'log'
									| 'other'
									| undefined;
								uri?: string | undefined;
								startOffset?: number | undefined;
								endOffset?: number | undefined;
								score?: number | undefined;
								metadata?: Record<string, unknown> | undefined;
								hash?: string | undefined;
							}
						>,
						{
							kind: 'code' | 'document' | 'web' | 'memory' | 'log' | 'other';
							text?: string | undefined;
							id?: string | undefined;
							timestamp?: string | undefined;
							uri?: string | undefined;
							startOffset?: number | undefined;
							endOffset?: number | undefined;
							score?: number | undefined;
							metadata?: Record<string, unknown> | undefined;
							hash?: string | undefined;
						},
						{
							text?: string | undefined;
							id?: string | undefined;
							timestamp?: string | undefined;
							kind?:
								| 'code'
								| 'document'
								| 'web'
								| 'memory'
								| 'log'
								| 'other'
								| undefined;
							uri?: string | undefined;
							startOffset?: number | undefined;
							endOffset?: number | undefined;
							score?: number | undefined;
							metadata?: Record<string, unknown> | undefined;
							hash?: string | undefined;
						}
					>,
					'many'
				>
			>;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			duration: number;
			results: {
				text: string;
				score: number;
				metadata?: Record<string, unknown> | undefined;
				source?: string | undefined;
			}[];
			queryId: string;
			provider: string;
			evidence?:
				| {
						kind: 'code' | 'document' | 'web' | 'memory' | 'log' | 'other';
						text?: string | undefined;
						id?: string | undefined;
						timestamp?: string | undefined;
						uri?: string | undefined;
						startOffset?: number | undefined;
						endOffset?: number | undefined;
						score?: number | undefined;
						metadata?: Record<string, unknown> | undefined;
						hash?: string | undefined;
				  }[]
				| undefined;
		},
		{
			timestamp: string;
			duration: number;
			results: {
				text: string;
				score: number;
				metadata?: Record<string, unknown> | undefined;
				source?: string | undefined;
			}[];
			queryId: string;
			provider: string;
			evidence?:
				| {
						text?: string | undefined;
						id?: string | undefined;
						timestamp?: string | undefined;
						kind?:
							| 'code'
							| 'document'
							| 'web'
							| 'memory'
							| 'log'
							| 'other'
							| undefined;
						uri?: string | undefined;
						startOffset?: number | undefined;
						endOffset?: number | undefined;
						score?: number | undefined;
						metadata?: Record<string, unknown> | undefined;
						hash?: string | undefined;
				  }[]
				| undefined;
		}
	>;
	readonly 'rag.ingest.started': z.ZodObject<
		{
			ingestId: z.ZodString;
			source: z.ZodOptional<z.ZodString>;
			contentLength: z.ZodNumber;
			expectedChunks: z.ZodNumber;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			ingestId: string;
			contentLength: number;
			expectedChunks: number;
			source?: string | undefined;
		},
		{
			timestamp: string;
			ingestId: string;
			contentLength: number;
			expectedChunks: number;
			source?: string | undefined;
		}
	>;
	readonly 'rag.ingest.completed': z.ZodObject<
		{
			ingestId: z.ZodString;
			success: z.ZodBoolean;
			documentsProcessed: z.ZodNumber;
			embeddingsGenerated: z.ZodNumber;
			duration: z.ZodNumber;
			timestamp: z.ZodString;
			error: z.ZodOptional<z.ZodString>;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			duration: number;
			success: boolean;
			ingestId: string;
			documentsProcessed: number;
			embeddingsGenerated: number;
			error?: string | undefined;
		},
		{
			timestamp: string;
			duration: number;
			success: boolean;
			ingestId: string;
			documentsProcessed: number;
			embeddingsGenerated: number;
			error?: string | undefined;
		}
	>;
	readonly 'rag.embedding.generated': z.ZodObject<
		{
			embeddingId: z.ZodString;
			text: z.ZodString;
			provider: z.ZodString;
			dimensions: z.ZodNumber;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			text: string;
			timestamp: string;
			provider: string;
			embeddingId: string;
			dimensions: number;
		},
		{
			text: string;
			timestamp: string;
			provider: string;
			embeddingId: string;
			dimensions: number;
		}
	>;
	readonly 'rag.index.updated': z.ZodObject<
		{
			indexId: z.ZodString;
			operation: z.ZodEnum<['add', 'update', 'delete']>;
			affectedDocuments: z.ZodNumber;
			indexSize: z.ZodNumber;
			timestamp: z.ZodString;
		},
		'strip',
		z.ZodTypeAny,
		{
			timestamp: string;
			operation: 'add' | 'update' | 'delete';
			indexId: string;
			affectedDocuments: number;
			indexSize: number;
		},
		{
			timestamp: string;
			operation: 'add' | 'update' | 'delete';
			indexId: string;
			affectedDocuments: number;
			indexSize: number;
		}
	>;
};
//# sourceMappingURL=rag-events.d.ts.map
