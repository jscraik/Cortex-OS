export class VectorSizeError extends Error {
	constructor(expected: number, got: number) {
		super(`Vector size mismatch: expected ${expected}, but got ${got}`);
		this.name = "VectorSizeError";
	}
}
