--- a/packages/mcp/src/tools/refresh.ts
+++ b/packages/mcp/src/tools/refresh.ts
@@ -1,3 +1,4 @@
+import { randomUUID } from 'crypto';
 import type { MCPNotificationHandler } from '../notifications/handlers.js';
 import type { Server, ServerLogger } from '../server.js';
 
@@ -208,7 +209,7 @@ export class ManualRefreshTool {
 	 * Generate correlation ID for tracking
 	 */
 	private generateCorrelationId(): string {
-		return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
+		return `refresh_${Date.now()}_${randomUUID().substring(0, 8)}`;
 	}
 
 	/**

--- a/packages/mcp/src/handlers/toolsCall.ts
+++ b/packages/mcp/src/handlers/toolsCall.ts
@@ -1,3 +1,4 @@
+import { randomUUID } from 'crypto';
 import { MCPToolVersionException } from '../errors.js';
 import type { ToolDescriptor, VersionConstraint } from '../registry/toolRegistry.js';
 import type { Server } from '../server.js';
@@ -254,7 +255,7 @@ export class VersionedToolCallHandler {
 	 * Generate correlation ID for tracking
 	 */
 	private generateCorrelationId(): string {
-		return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
+		return `tool_${Date.now()}_${randomUUID().substring(0, 8)}`;
 	}
 
 	/**

--- a/packages/rag/src/lib/mlx/index.ts
+++ b/packages/rag/src/lib/mlx/index.ts
@@ -375,8 +375,10 @@ export async function createEmbeddings(texts: string[]): Promise<number[][]> {
 		await client.initialize();
 		return await client.embed(texts);
 	} catch {
-		// Fallback to mock implementation for testing
-		return texts.map(() => Array.from({ length: 384 }, () => Math.random()));
+		// [brAInwav] Constitutional violation fix: No fake data in production
+		throw new Error('[brAInwav] MLX embeddings not implemented - use production embedding service', {
+			cause: new Error('MLX adapter requires proper implementation')
+		});
 	} finally {
 		await client.cleanup();
 	}
@@ -391,9 +393,9 @@ export function rankDocuments(
 	documents: string[],
 ): Promise<RankedDocument[]> {
-	// Simple relevance scoring implementation
+	// [brAInwav] Constitutional fix: Use deterministic scoring algorithm
 	return documents
 		.map((text, index) => ({
 			text,
-			score: text.toLowerCase().includes(query.toLowerCase()) ? 0.9 : Math.random() * 0.5,
+			score: text.toLowerCase().includes(query.toLowerCase()) ? 0.9 : 0.1,
 			index,
 		}))
 		.sort((a, b) => b.score - a.score);

--- a/packages/agents/src/langgraph/nodes.ts
+++ b/packages/agents/src/langgraph/nodes.ts
@@ -381,12 +381,12 @@ async function executeTool(toolName: string, toolArgs: any): Promise<any> {
 		};
 	}
 
-	// Mock response for other tools
+	// [brAInwav] Constitutional fix: Proper error handling instead of mock responses
 	if (toolName.includes('failing')) {
-		throw new Error(`Tool ${toolName} failed`);
+		throw new Error(`[brAInwav] Tool ${toolName} failed`, {
+			cause: new Error('Tool execution failure')
+		});
 	}
 
-	return {
-		success: true,
-		result: `Tool ${toolName} executed successfully`,
-		timestamp: new Date().toISOString(),
-	};
+	// [brAInwav] Throw proper NotImplementedError for unhandled tools
+	throw new Error(`[brAInwav] Tool not implemented: ${toolName}`, {
+		cause: new Error('Feature not implemented')
+	});

--- a/packages/rag/src/agent/dispatcher.ts
+++ b/packages/rag/src/agent/dispatcher.ts
@@ -7,6 +7,7 @@ export interface Strategy {
 export interface DispatcherOptions {
 	epsilon?: number; // exploration probability for A/B (0..1)
 	learningRate?: number; // weight update step
+	seed?: number; // [brAInwav] Seed for reproducible agent behavior
 }
 
 export interface FeedbackEvent {
@@ -24,15 +25,21 @@ import { generateRunId, recordOperation } from '@cortex-os/observability';
 export class AgenticDispatcher {
 	private readonly strategies: Strategy[];
 	private readonly eps: number;
 	private readonly lr: number;
 	private readonly weights = new Map<string, WeightTable>(); // by docType
+	private readonly rng: () => number; // [brAInwav] Seeded PRNG for reproducibility
 
 	constructor(strategies: Strategy[], options?: DispatcherOptions) {
 		this.strategies = strategies.slice();
 		this.eps = clamp01(options?.epsilon ?? 0.1);
 		this.lr = Math.max(0.0001, options?.learningRate ?? 0.05);
+		
+		// [brAInwav] Use seeded PRNG for reproducible agent behavior
+		const seed = options?.seed ?? 42;
+		this.rng = this.createSeededRNG(seed);
 	}
 
 	choose(meta?: Record<string, unknown>): Strategy {
 		const docType = getDocType(meta);
-		if (Math.random() < this.eps) return this.randomStrategy();
+		if (this.rng() < this.eps) return this.randomStrategy();
 		return this.bestStrategyFor(docType);
 	}
@@ -84,6 +91,16 @@ export class AgenticDispatcher {
 	}
 
 	private randomStrategy(): Strategy {
-		const i = Math.floor(Math.random() * Math.max(1, this.strategies.length));
+		const i = Math.floor(this.rng() * Math.max(1, this.strategies.length));
 		return this.strategies[Math.min(i, this.strategies.length - 1)];
 	}
+
+	/**
+	 * [brAInwav] Create seeded PRNG for reproducible agent behavior
+	 * Simple linear congruential generator for deterministic randomness
+	 */
+	private createSeededRNG(seed: number): () => number {
+		let state = seed;
+		return () => {
+			state = (state * 1664525 + 1013904223) % 0x100000000;
+			return state / 0x100000000;
+		};
+	}