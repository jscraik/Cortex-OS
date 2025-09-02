/**
 * MLX Thermal and Memory Monitoring
 *
 * System resource monitoring for thermal management
 */

import type { MemoryStatus, ThermalStatus } from "./types.js";

export const checkThermalStatus = async (): Promise<ThermalStatus> => {
	try {
		const { spawn } = await import("node:child_process");
		const process = spawn("sysctl", ["-n", "machdep.xcpm.cpu_thermal_state"]);

		return new Promise((resolve) => {
			let output = "";

			process.stdout?.on("data", (data) => {
				output += data.toString();
			});

			process.on("close", (_code) => {
				const thermalState = parseInt(output.trim(), 10) || 0;
				const temperature = Math.min(100, thermalState * 10 + 40);

				let level: ThermalStatus["level"] = "normal";
				if (temperature > 90) level = "critical";
				else if (temperature > 80) level = "hot";
				else if (temperature > 70) level = "warm";

				resolve({
					temperature,
					level,
					throttled: level === "critical" || level === "hot",
					timestamp: Date.now(),
				});
			});

			process.on("error", () => {
				resolve({
					temperature: 65,
					level: "normal",
					throttled: false,
					timestamp: Date.now(),
				});
			});
		});
	} catch {
		return {
			temperature: 65,
			level: "normal",
			throttled: false,
			timestamp: Date.now(),
		};
	}
};

export const checkMemoryStatus = async (): Promise<MemoryStatus> => {
	try {
		const { spawn } = await import("node:child_process");
		const process = spawn("vm_stat");

		return new Promise((resolve) => {
			let output = "";

			process.stdout?.on("data", (data) => {
				output += data.toString();
			});

			process.on("close", () => {
				const lines = output.split("\n");
				let free = 0,
					active = 0,
					inactive = 0,
					wired = 0;

				for (const line of lines) {
					if (line.includes("Pages free:")) {
						free = parseInt(line.split(":")[1], 10) || 0;
					} else if (line.includes("Pages active:")) {
						active = parseInt(line.split(":")[1], 10) || 0;
					} else if (line.includes("Pages inactive:")) {
						inactive = parseInt(line.split(":")[1], 10) || 0;
					} else if (line.includes("Pages wired down:")) {
						wired = parseInt(line.split(":")[1], 10) || 0;
					}
				}

				const pageSize = 4096;
				const totalPages = free + active + inactive + wired;
				const usedPages = active + inactive + wired;
				const used = (usedPages * pageSize) / (1024 * 1024 * 1024);
				const available = (totalPages * pageSize) / (1024 * 1024 * 1024);
				const usageRatio = used / available;

				let pressure: MemoryStatus["pressure"] = "normal";
				if (usageRatio > 0.9) pressure = "critical";
				else if (usageRatio > 0.75) pressure = "warning";

				resolve({
					used,
					available,
					pressure,
					swapUsed: 0,
				});
			});

			process.on("error", () => {
				resolve({
					used: 8,
					available: 16,
					pressure: "normal",
					swapUsed: 0,
				});
			});
		});
	} catch {
		return {
			used: 8,
			available: 16,
			pressure: "normal",
			swapUsed: 0,
		};
	}
};
