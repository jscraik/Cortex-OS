import type { Embedder } from "../ports/Embedder.js";
import { MLXEmbedder } from "./embedder.mlx.js";
import { OllamaEmbedder } from "./embedder.ollama.js";
import { NoopEmbedder } from "./embedder.noop.js";

/**
 * Composite embedder that attempts multiple embedders in order until one succeeds.
 */
export class CompositeEmbedder implements Embedder {
        private readonly embedders: Embedder[];
        private current: Embedder;

        constructor(
                embedders: Embedder[] = [
                        new MLXEmbedder(),
                        new OllamaEmbedder(),
                        new NoopEmbedder(),
                ],
        ) {
                if (embedders.length === 0) throw new Error("embedders:empty");
                this.embedders = embedders;
                this.current = embedders[0];
        }

        name(): string {
                return this.current.name();
        }

        async embed(texts: string[]): Promise<number[][]> {
                let lastError: unknown;
                for (const emb of this.embedders) {
                        try {
                                const res = await emb.embed(texts);
                                this.current = emb;
                                return res;
                        } catch (err) {
                                lastError = err;
                        }
                }
                throw lastError instanceof Error
                        ? lastError
                        : new Error("All embedders failed");
        }

        getCurrentEmbedder(): Embedder {
                return this.current;
        }

        async testEmbedders(): Promise<Array<{ name: string; available: boolean }>> {
                const results: Array<{ name: string; available: boolean }> = [];
                for (const emb of this.embedders) {
                        try {
                                await emb.embed(["test"]);
                                results.push({ name: emb.name(), available: true });
                        } catch {
                                results.push({ name: emb.name(), available: false });
                        }
                }
                return results;
        }
}
