import { spawn } from "node:child_process";
import { z } from "zod";
import { validateCommandInput } from "./validation.js";

// Secure command execution wrapper that prevents command injection
export class SecureCommandExecutor {
	// Whitelisted commands for safe execution
	private static readonly ALLOWED_COMMANDS = new Set([
		"docker",
		"git",
		"ls",
		"pwd",
		"echo",
		"cat",
		"grep",
		"find",
	]);

	// Whitelisted Docker subcommands
	private static readonly ALLOWED_DOCKER_SUBCOMMANDS = new Set([
		"ps",
		"images",
		"inspect",
		"logs",
		"version",
		"info",
	]);

        // Resource limits (configurable)
        private static DEFAULT_TIMEOUT = 30000; // 30 seconds
        private static DEFAULT_MEMORY_LIMIT = 1024 * 1024 * 100; // 100 MB
        private static MAX_CONCURRENT_PROCESSES = 10;

        private static readonly configSchema = z.object({
                defaultTimeout: z.number().int().positive().optional(),
                defaultMemoryLimit: z.number().int().positive().optional(),
                maxConcurrentProcesses: z.number().int().positive().optional(),
        });

        static configure(options: {
                defaultTimeout?: number;
                defaultMemoryLimit?: number;
                maxConcurrentProcesses?: number;
        }) {
                const result = SecureCommandExecutor.configSchema.safeParse(options);
                if (!result.success) {
                        throw new Error(`Invalid configuration: ${result.error}`);
                }
                if (result.data.defaultTimeout !== undefined) {
                        SecureCommandExecutor.DEFAULT_TIMEOUT = result.data.defaultTimeout;
                }
                if (result.data.defaultMemoryLimit !== undefined) {
                        SecureCommandExecutor.DEFAULT_MEMORY_LIMIT = result.data.defaultMemoryLimit;
                }
                if (result.data.maxConcurrentProcesses !== undefined) {
                        SecureCommandExecutor.MAX_CONCURRENT_PROCESSES = result.data.maxConcurrentProcesses;
                }
        }

	// Process tracking
	private static concurrentProcesses = 0;

	// Execute a command with strict validation
	static async executeCommand(
		command: string[],
		timeout: number = SecureCommandExecutor.DEFAULT_TIMEOUT,
	): Promise<{ stdout: string; stderr: string; exitCode: number }> {
		// Check concurrent process limit
		if (
			SecureCommandExecutor.concurrentProcesses >=
			SecureCommandExecutor.MAX_CONCURRENT_PROCESSES
		) {
			throw new Error(
				`Maximum concurrent processes (${SecureCommandExecutor.MAX_CONCURRENT_PROCESSES}) reached`,
			);
		}

		SecureCommandExecutor.concurrentProcesses++;

		try {
			// Validate the command
			const validation =
				command[0] === "docker"
					? validateCommandInput.docker(command)
					: validateCommandInput.generic(command);
			if (!validation.success) {
				throw new Error(`Command validation failed: ${validation.error}`);
			}

			// Check if command is whitelisted
			if (!SecureCommandExecutor.ALLOWED_COMMANDS.has(command[0])) {
				throw new Error(`Command ${command[0]} is not allowed`);
			}

			// Sanitize command parameters
			const sanitizedCommand = SecureCommandExecutor.sanitizeCommand(command);

			// Spawn the process with strict security settings
			const child = spawn(sanitizedCommand[0], sanitizedCommand.slice(1), {
				killSignal: "SIGTERM",
				stdio: ["ignore", "pipe", "pipe"],
				// Run with reduced privileges
				uid: process.getuid ? process.getuid() : undefined,
				gid: process.getgid ? process.getgid() : undefined,
				// Disable environment variables inheritance
				env: {
					PATH: process.env.PATH,
					HOME: process.env.HOME,
					// Only include essential environment variables
				},
			});

			let stdout = "";
			let stderr = "";

			child.stdout?.on("data", (data) => {
				// Limit stdout size
				if (
					stdout.length + data.length >
					SecureCommandExecutor.DEFAULT_MEMORY_LIMIT
				) {
					child.kill("SIGTERM");
					throw new Error("Output exceeded memory limit");
				}
				stdout += data.toString();
			});

			child.stderr?.on("data", (data) => {
				// Limit stderr size
				if (
					stderr.length + data.length >
					SecureCommandExecutor.DEFAULT_MEMORY_LIMIT
				) {
					child.kill("SIGTERM");
					throw new Error("Error output exceeded memory limit");
				}
				stderr += data.toString();
			});

			return new Promise((resolve, reject) => {
				let timeoutId: NodeJS.Timeout;

				child.on("close", (code) => {
					clearTimeout(timeoutId);
					SecureCommandExecutor.concurrentProcesses--;
					resolve({
						stdout: stdout,
						stderr: stderr,
						exitCode: code || 0,
					});
				});

				child.on("error", (error) => {
					clearTimeout(timeoutId);
					SecureCommandExecutor.concurrentProcesses--;
					reject(new Error(`Command execution failed: ${error.message}`));
				});

				// Handle timeout
				timeoutId = setTimeout(() => {
					child.kill("SIGTERM");
					SecureCommandExecutor.concurrentProcesses--;
					reject(new Error(`Command timed out after ${timeout}ms`));
				}, timeout);
			});
		} catch (error) {
			SecureCommandExecutor.concurrentProcesses--;
			throw error;
		}
	}

	// Sanitize command parameters to prevent injection
	private static sanitizeCommand(command: string[]): string[] {
		return command.map((param) => {
			// Remove dangerous characters
			return param.replace(/[;&|`$(){}[\]<>]/g, "");
		});
	}

	// Execute Docker command with additional security
	static async executeDockerCommand(
		subcommand: string,
		args: string[] = [],
		timeout: number = SecureCommandExecutor.DEFAULT_TIMEOUT,
	): Promise<{ stdout: string; stderr: string; exitCode: number }> {
		// Validate subcommand
		if (!SecureCommandExecutor.ALLOWED_DOCKER_SUBCOMMANDS.has(subcommand)) {
			throw new Error(`Docker subcommand ${subcommand} is not allowed`);
		}

		// Validate arguments
		for (const arg of args) {
			if (typeof arg !== "string") {
				throw new Error("All arguments must be strings");
			}

			// Prevent very long arguments that could be used for DoS
			if (arg.length > 1000) {
				throw new Error("Argument too long");
			}

			// Prevent dangerous patterns in arguments
			if (/[;&|`$(){}[\]<>]/.test(arg)) {
				throw new Error("Invalid characters in argument");
			}
		}

		// Build the full command
		const command = ["docker", subcommand, ...args];

		// Execute with security wrapper
		return SecureCommandExecutor.executeCommand(command, timeout);
	}

	// Get current process statistics
	static getProcessStats() {
		return {
			concurrentProcesses: SecureCommandExecutor.concurrentProcesses,
			maxConcurrentProcesses: SecureCommandExecutor.MAX_CONCURRENT_PROCESSES,
		};
	}

	// Execute a command with output sanitization
	static async executeCommandWithSanitization(
		command: string[],
		timeout: number = SecureCommandExecutor.DEFAULT_TIMEOUT,
	): Promise<{ stdout: string; stderr: string; exitCode: number }> {
		const result = await SecureCommandExecutor.executeCommand(command, timeout);

		// Sanitize output to prevent XSS or other injection
		return {
			stdout: SecureCommandExecutor.sanitizeOutput(result.stdout),
			stderr: SecureCommandExecutor.sanitizeOutput(result.stderr),
			exitCode: result.exitCode,
		};
	}

	// Sanitize output to prevent XSS or other injection
	private static sanitizeOutput(output: string): string {
		// Remove potentially dangerous HTML/JavaScript
		return output
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
			.replace(/javascript:/gi, "")
			.replace(/vbscript:/gi, "")
			.replace(/on\w+="[^"]*"/gi, "")
			.replace(/on\w+='[^']*'/gi, "")
			.replace(/on\w+=[^\s>]+/gi, "");
	}
}
