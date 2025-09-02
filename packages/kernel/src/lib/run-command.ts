import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCb);

export async function runCommand(
	command: string,
	options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
	try {
		const { stdout, stderr } = await exec(command, { cwd: options.cwd });
		return { stdout, stderr };
	} catch (error: any) {
		// Provide a meaningful error message including command and error details
		throw new Error(
			`Failed to execute command "${command}"${options.cwd ? ` in directory "${options.cwd}"` : ""}: ${error?.message || error}`,
		);
	}
}
