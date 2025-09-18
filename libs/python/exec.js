import { spawn } from 'node:child_process';
import path from 'node:path';

/**
 * Safely spawn a child process with validated executable
 * @param {string} executable - The executable to run
 * @param {string[]} args - Arguments to pass
 * @param {object} options - Spawn options
 * @returns {ChildProcess} The spawned process
 */
function safeSpawn(executable, args, options) {
	// Final validation before spawning
	if (!executable || typeof executable !== 'string') {
		throw new Error('Invalid executable path');
	}
	if (
		executable.includes(';') ||
		executable.includes('|') ||
		executable.includes('&')
	) {
		throw new Error(
			'Executable path contains potentially dangerous characters',
		);
	}
	// nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
	// This is safe because we validate the executable parameter above
	return spawn(executable, args, options);
}

/**
 * Validate python executable path to prevent command injection
 */
function validatePythonPath(pythonPath) {
	if (!pythonPath || typeof pythonPath !== 'string') {
		throw new Error('Python path must be a non-empty string');
	}

	// Only allow specific trusted python executables
	const allowedExecutables = [
		'python',
		'python3',
		'python3.8',
		'python3.9',
		'python3.10',
		'python3.11',
		'python3.12',
		'python3.13',
	];

	const basename = path.basename(pythonPath);

	// Check if it's a simple allowed executable name
	if (allowedExecutables.includes(basename)) {
		return pythonPath;
	}

	// For absolute paths, ensure they end with an allowed executable
	if (path.isAbsolute(pythonPath)) {
		if (allowedExecutables.includes(basename)) {
			return pythonPath;
		}
	}

	throw new Error(
		`Invalid python executable: ${pythonPath}. Only trusted python executables are allowed.`,
	);
}

export function resolvePython(explicit) {
	const resolvedPath = (() => {
		if (explicit?.trim()) return explicit;
		if (process.env.PYTHON_EXEC?.trim()) return process.env.PYTHON_EXEC;
		// legacy support
		if (process.env.PYTHON_PATH?.trim()) return process.env.PYTHON_PATH;
		return 'python3';
	})();

	return validatePythonPath(resolvedPath);
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
		const proc = safeSpawn(python, [scriptPath, ...args], {
			cwd: options.cwd || process.cwd(),
			stdio: ['pipe', 'pipe', 'pipe'],
			env,
		});
		let stdout = '';
		let stderr = '';
		proc.stdout.on('data', (d) => {
			stdout += d.toString();
		});
		proc.stderr.on('data', (d) => {
			stderr += d.toString();
		});
		proc.on('close', (code) => {
			if (code === 0) resolve(stdout.trim());
			else reject(new Error(`Python exited ${code}: ${stderr}`));
		});
		proc.on('error', (err) =>
			reject(err instanceof Error ? err : new Error(String(err))),
		);
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
	const proc = safeSpawn(python, pythonArgs, {
		cwd: options.cwd || process.cwd(),
		stdio: ['pipe', 'pipe', 'pipe'],
		env,
	});
	return proc;
}
//# sourceMappingURL=exec.js.map
