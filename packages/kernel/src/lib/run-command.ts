import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCb);

export async function runCommand(
  command: string,
  options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await exec(command, { cwd: options.cwd });
  return { stdout, stderr };
}
