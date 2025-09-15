import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCb);
export async function runCommand(command, options = {}) {
	try {
		const { stdout, stderr } = await exec(command, { cwd: options.cwd });
		return { stdout, stderr };
	} catch (error) {
		// Provide a meaningful error message including command and error details
		throw new Error(
			`Failed to execute command "${command}"${options.cwd ? ` in directory "${options.cwd}"` : ''}: ${error?.message || error}`,
		);
	}
}
//# sourceMappingURL=run-command.js.map
