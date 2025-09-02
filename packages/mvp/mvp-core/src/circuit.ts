export type CircuitState = "closed" | "open" | "half-open";

export class Circuit {
	private state: CircuitState = "closed";
	private failures = 0;
	private openedAt = 0;
	constructor(
		private threshold = 5,
		private resetMs = 30000,
	) {}

	async exec<T>(op: () => Promise<T>): Promise<T> {
		const now = Date.now();
		if (this.state === "open" && now - this.openedAt < this.resetMs)
			throw new Error("CIRCUIT_OPEN");
		if (this.state === "open") this.state = "half-open";
		try {
			const res = await op();
			this.success();
			return res;
		} catch (e) {
			this.fail();
			throw e;
		}
	}
	private success() {
		this.failures = 0;
		this.state = "closed";
	}
	private fail() {
		if (++this.failures >= this.threshold) {
			this.state = "open";
			this.openedAt = Date.now();
		}
	}
}
