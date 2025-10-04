export const openApiDocument = {
	openapi: '3.1.0',
	info: {
		title: 'Cortex Memory API',
		version: '0.1.0',
		description: 'REST API for Cortex Memory system with SQLite + Qdrant backend',
		contact: {
			name: 'Cortex OS Team',
			url: 'https://github.com/cortex-os/cortex-os',
		},
	},
	servers: [
		{
			url: 'http://localhost:9700/api/v1',
			description: 'Development server',
		},
	],
	paths: {
		'/memory/store': {
			post: {
				tags: ['Memory'],
				summary: 'Store a memory',
				description: 'Store a new memory with content, tags, and metadata',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['content'],
								properties: {
									content: {
										type: 'string',
										minLength: 1,
										maxLength: 8192,
										description: 'The memory content to store',
									},
									importance: {
										type: 'integer',
										minimum: 1,
										maximum: 10,
										default: 5,
										description: 'Importance level (1-10)',
									},
									tags: {
										type: 'array',
										items: { type: 'string' },
										maxItems: 32,
										description: 'Tags for categorization',
									},
									domain: {
										type: 'string',
										description: 'Domain/category for the memory',
									},
									metadata: {
										type: 'object',
										description: 'Additional metadata',
									},
								},
							},
						},
					},
				},
				responses: {
					'201': {
						description: 'Memory stored successfully',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean' },
										data: {
											type: 'object',
											properties: {
												id: { type: 'string' },
												vectorIndexed: { type: 'boolean' },
											},
										},
										timestamp: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
		},
                '/memory/search': {
                        get: {
                                tags: ['Memory'],
                                summary: 'Search memories',
				description: 'Search memories using semantic, keyword, or hybrid search',
				parameters: [
					{
						name: 'query',
						in: 'query',
						required: true,
						schema: { type: 'string', minLength: 1 },
					},
					{
						name: 'search_type',
						in: 'query',
						schema: {
							type: 'string',
							enum: ['semantic', 'tags', 'hybrid', 'keyword'],
							default: 'semantic',
						},
					},
					{
						name: 'limit',
						in: 'query',
						schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
					},
					{
						name: 'domain',
						in: 'query',
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': {
						description: 'Search results',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean' },
										data: {
											type: 'array',
											items: {
												type: 'object',
												properties: {
													id: { type: 'string' },
													content: { type: 'string' },
													score: { type: 'number' },
													matchType: { type: 'string' },
												},
											},
										},
										count: { type: 'integer' },
										timestamp: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
			post: {
				tags: ['Memory'],
				summary: 'Search memories (POST)',
				description: 'Search memories with complex query parameters',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['query'],
								properties: {
									query: { type: 'string', minLength: 1 },
									search_type: {
										type: 'string',
										enum: ['semantic', 'tags', 'hybrid', 'keyword'],
										default: 'semantic',
									},
									tags: {
										type: 'array',
										items: { type: 'string' },
										maxItems: 10,
									},
									domain: { type: 'string' },
									limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
									score_threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
								},
							},
						},
					},
				},
				responses: {
					'200': {
						description: 'Search results',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean' },
										data: {
											type: 'array',
											items: { type: 'object' },
										},
										count: { type: 'integer' },
										timestamp: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
		},
		'/memory/analysis': {
			post: {
				tags: ['Memory'],
				summary: 'Analyze memories',
				description: 'Perform analysis on stored memories',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									analysis_type: {
										type: 'string',
										enum: [
											'summary',
											'temporal_patterns',
											'tag_clusters',
											'concept_network',
											'custom',
										],
									},
									domain: { type: 'string' },
									tags: {
										type: 'array',
										items: { type: 'string' },
										maxItems: 10,
									},
									max_memories: { type: 'integer', minimum: 10, maximum: 1000, default: 100 },
								},
							},
						},
					},
				},
				responses: {
					'200': {
						description: 'Analysis results',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean' },
										data: { type: 'object' },
										timestamp: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
		},
		'/memory/relationships': {
			post: {
				tags: ['Memory'],
				summary: 'Manage memory relationships',
				description: 'Create, find, or manage relationships between memories',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['action'],
								properties: {
									action: {
										type: 'string',
										enum: ['create', 'find', 'map_graph', 'delete'],
									},
									source_id: { type: 'string' },
									target_id: { type: 'string' },
									relationship_type: {
										type: 'string',
										enum: [
											'references',
											'extends',
											'contradicts',
											'supports',
											'precedes',
											'follows',
											'related_to',
										],
									},
									strength: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
									bidirectional: { type: 'boolean', default: false },
								},
							},
						},
					},
				},
				responses: {
					'200': {
						description: 'Relationship operation result',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean' },
										data: { type: 'object' },
										timestamp: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
		},
		'/memory/stats': {
			get: {
				tags: ['Memory'],
				summary: 'Get memory statistics',
				description: 'Retrieve statistics about stored memories',
				parameters: [
					{
						name: 'include',
						in: 'query',
						style: 'form',
						explode: false,
						schema: {
							type: 'array',
							items: {
								type: 'string',
								enum: [
									'total_count',
									'domain_distribution',
									'tag_distribution',
									'importance_distribution',
									'storage_size',
									'qdrant_stats',
								],
							},
							default: ['total_count', 'domain_distribution', 'tag_distribution'],
						},
					},
				],
				responses: {
					'200': {
						description: 'Memory statistics',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean' },
										data: {
											type: 'object',
											properties: {
												totalCount: { type: 'integer' },
												domainDistribution: { type: 'object' },
												tagDistribution: { type: 'object' },
												importanceDistribution: { type: 'object' },
											},
										},
										timestamp: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
		},
		'/healthz': {
			get: {
				tags: ['Health'],
				summary: 'Health check',
				description: 'Check if the API and its dependencies are healthy',
				responses: {
					'200': {
						description: 'Healthy',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										status: { type: 'string', enum: ['healthy', 'unhealthy'] },
										timestamp: { type: 'string' },
										version: { type: 'string' },
										details: { type: 'object' },
									},
								},
							},
						},
					},
					'503': {
						description: 'Unhealthy',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										status: { type: 'string', enum: ['healthy', 'unhealthy'] },
										timestamp: { type: 'string' },
										error: { type: 'string' },
									},
								},
							},
						},
					},
				},
                        },
                },
                '/graphrag/query': {
                        post: {
                                tags: ['GraphRAG'],
                                summary: 'Execute GraphRAG retrieval',
                                description: 'Runs hybrid Qdrant search with graph expansion and returns citations.',
                                requestBody: {
                                        required: true,
                                        content: {
                                                'application/json': {
                                                        schema: {
                                                                type: 'object',
                                                                properties: {
                                                                        question: { type: 'string', minLength: 1 },
                                                                        k: { type: 'integer', minimum: 1, maximum: 50, default: 8 },
                                                                        maxHops: { type: 'integer', minimum: 1, maximum: 3, default: 1 },
                                                                        maxChunks: { type: 'integer', minimum: 1, maximum: 100, default: 24 },
                                                                        includeCitations: { type: 'boolean', default: true },
                                                                        includeVectors: { type: 'boolean', default: false },
                                                                        threshold: { type: 'number', minimum: 0, maximum: 1 },
                                                                        namespace: { type: 'string' },
                                                                        filters: { type: 'object' },
                                                                },
                                                        },
                                                },
                                        },
                                },
                                responses: {
                                        '200': {
                                                description: 'GraphRAG result with sources and citations',
                                                content: {
                                                        'application/json': {
                                                                schema: {
                                                                        type: 'object',
                                                                        properties: {
                                                                                success: { type: 'boolean' },
                                                                                data: {
                                                                                        type: 'object',
                                                                                        properties: {
                                                                                                sources: { type: 'array', items: { type: 'object' } },
                                                                                                graphContext: { type: 'object' },
                                                                                                metadata: { type: 'object' },
                                                                                                citations: { type: 'array', items: { type: 'object' } },
                                                                                        },
                                                                                },
                                                                                timestamp: { type: 'string', format: 'date-time' },
                                                                        },
                                                                },
                                                        },
                                                },
                                        },
                                },
                        },
                },
                '/graphrag/health': {
                        get: {
                                tags: ['GraphRAG'],
                                summary: 'GraphRAG health check',
                                description: 'Returns health status for Qdrant and Prisma graph stores.',
                                responses: {
                                        '200': {
                                                description: 'Service health status',
                                                content: {
                                                        'application/json': {
                                                                schema: {
                                                                        type: 'object',
                                                                        properties: {
                                                                                success: { type: 'boolean' },
                                                                                data: { type: 'object' },
                                                                        },
                                                                },
                                                        },
                                                },
                                        },
                                        '503': {
                                                description: 'GraphRAG unhealthy',
                                        },
                                },
                        },
                },
                '/graphrag/stats': {
                        get: {
                                tags: ['GraphRAG'],
                                summary: 'GraphRAG graph statistics',
                                description: 'Aggregated node, edge, and chunk counts for observability.',
                                responses: {
                                        '200': {
                                                description: 'Graph statistics',
                                                content: {
                                                        'application/json': {
                                                                schema: {
                                                                        type: 'object',
                                                                        properties: {
                                                                                success: { type: 'boolean' },
                                                                                data: { type: 'object' },
                                                                        },
                                                                },
                                                        },
                                                },
                                        },
                                },
                        },
                },
        },
        components: {
		schemas: {
			Error: {
				type: 'object',
				properties: {
					success: { type: 'boolean', example: false },
					error: {
						type: 'object',
						properties: {
							code: { type: 'string' },
							message: { type: 'string' },
							details: { type: 'object' },
						},
					},
					timestamp: { type: 'string', format: 'date-time' },
					path: { type: 'string' },
				},
			},
		},
	},
};
