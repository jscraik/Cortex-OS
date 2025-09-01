import { spawn } from 'child_process';
import path from 'path';
export function resolvePython(explicit) {
  if (explicit && explicit.trim()) return explicit;
  if (process.env.PYTHON_EXEC && process.env.PYTHON_EXEC.trim()) return process.env.PYTHON_EXEC;
  // legacy support
  if (process.env.PYTHON_PATH && process.env.PYTHON_PATH.trim()) return process.env.PYTHON_PATH;
  return 'python3';
}
export function runPython(scriptPath, args = [], options = {}) {
  const python = resolvePython(options.python);
  const env = { ...process.env, ...(options.envOverrides || {}) };
  if (options.setModulePath) {
    const existing = process.env.PYTHONPATH || '';
    env.PYTHONPATH = existing
      ? `${options.setModulePath}${path.delimiter}${existing}`
      : options.setModulePath;
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(python, [scriptPath, ...args], {
      cwd: options.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`Python exited ${code}: ${stderr}`));
    });
    proc.on('error', (err) => reject(err instanceof Error ? err : new Error(String(err))));
  });
}
export default { resolvePython, runPython };
// Spawn a long-running Python process (returns the ChildProcess) with centralized env handling.
export function spawnPythonProcess(pythonArgs, options = {}) {
  const python = resolvePython(options.python);
  const env = { ...process.env, ...(options.envOverrides || {}) };
  // If a module path is provided, merge with existing PYTHONPATH rather than replace
  if (options.setModulePath) {
    const existing = process.env.PYTHONPATH || '';
    env.PYTHONPATH = existing
      ? `${options.setModulePath}${path.delimiter}${existing}`
      : options.setModulePath;
  }
  const proc = spawn(python, pythonArgs, {
    cwd: options.cwd || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });
  return proc;
}
//# sourceMappingURL=exec.js.map
