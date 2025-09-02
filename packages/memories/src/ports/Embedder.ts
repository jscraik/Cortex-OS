export interface Embedder {
	name(): string;
	embed(texts: string[]): Promise<number[][]>;
}
