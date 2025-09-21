import { execa } from 'execa';

type Runner = 'uv' | 'python3' | null;

export type MlxAvailability = {
	available: boolean;
	runner: Runner;
	details?: string;
	error?: string;
};

const probe = async (
	cmd: string,
	args: string[],
): Promise<{ ok: boolean; out: string; err: string }> => {
	try {
		const { stdout, stderr } = await execa(cmd, args, { timeout: 8000 });
		return { ok: true, out: stdout ?? '', err: stderr ?? '' };
	} catch (e) {
		return { ok: false, out: '', err: e instanceof Error ? e.message : String(e) };
	}
};

const tryRunner = async (runner: Runner): Promise<MlxAvailability> => {
	const code = "import mlx.core as mx\nimport mlx_lm\nprint('OK')";
	if (runner === 'uv') {
		const uvExists = (await probe('uv', ['--version'])).ok;
		if (!uvExists) return { available: false, runner: null, error: 'uv not installed' };
		const res = await probe('uv', ['run', 'python', '-c', code]);
		return res.ok
			? { available: true, runner: 'uv', details: 'mlx.core + mlx_lm OK (uv)' }
			: { available: false, runner: 'uv', error: res.err };
	}
	if (runner === 'python3') {
		const pyOk = (await probe('python3', ['-c', 'print(1)'])).ok;
		if (!pyOk) return { available: false, runner: null, error: 'python3 not available' };
		const res = await probe('python3', ['-c', code]);
		return res.ok
			? { available: true, runner: 'python3', details: 'mlx.core + mlx_lm OK (python3)' }
			: { available: false, runner: 'python3', error: res.err };
	}
	return { available: false, runner: null, error: 'no runner' };
};

export const checkMlxAvailability = async (): Promise<MlxAvailability> => {
	const uv = await tryRunner('uv');
	if (uv.available) return uv;
	const py = await tryRunner('python3');
	if (py.available) return py;
	return { available: false, runner: null, error: uv.error || py.error || 'Unknown MLX error' };
};
