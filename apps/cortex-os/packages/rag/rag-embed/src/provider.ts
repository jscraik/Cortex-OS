export interface Embeddings {
  model: string;
  dim: number;
  embed(texts: string[]): Promise<number[][]>;
}
