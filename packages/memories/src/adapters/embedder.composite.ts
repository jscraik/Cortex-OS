import type { Embedder } from "../ports/Embedder.js";
import { MLXEmbedder } from "./embedder.mlx.js";

export class CompositeEmbedder implements Embedder {
	private readonly embedder: Embedder;

	constructor(embedder: Embedder = new MLXEmbedder()) {
		this.embedder = embedder;
	}

	name(): string {
		return this.embedder.name();
	}

	async embed(texts: string[]): Promise<number[][]> {
		return this.embedder.embed(texts);
	}

	getCurrentEmbedder(): Embedder {
		return this.embedder;
	}

	async testEmbedders(): Promise<Array<{ name: string; available: boolean }>> {
		try {
			await this.embedder.embed(["test"]);
			return [{ name: this.embedder.name(), available: true }];
		} catch {
			return [{ name: this.embedder.name(), available: false }];
		}
	}
}
