export function startScheduler(
	task: () => void,
	intervalMs: number,
): () => void {
	const id = setInterval(task, intervalMs);
	return () => clearInterval(id);
}
