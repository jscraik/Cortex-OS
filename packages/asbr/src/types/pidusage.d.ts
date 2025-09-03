declare module "pidusage" {
	interface ProcessStats {
		cpu: number;
		memory: number;
		pid: number;
		ppid: number;
		ctime: number;
		elapsed: number;
		timestamp: number;
	}

	function pidusage(pid: number): Promise<ProcessStats>;
	function pidusage(
		pids: number[],
	): Promise<{ [pid: string]: ProcessStats }>;

	export = pidusage;
}
