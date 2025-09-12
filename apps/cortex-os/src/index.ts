import { startRuntime } from './runtime';

startRuntime()
	.then(() => console.warn('Cortex-OS runtime started'))
	.catch((e) => {
		console.error('Runtime failed', e);
		process.exit(1);
	});
