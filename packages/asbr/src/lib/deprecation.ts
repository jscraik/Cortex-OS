import { logWarn } from './logger.js';

let warned = false;

export function emitAsbrDeprecationOnce(): void {
	if (warned) return;
	warned = true;
	logWarn('DEPRECATION: @cortex-os/asbr is deprecated. Migrate to apps/cortex-os (ASBR-lite).', {
		migration: 'Use apps/cortex-os runtime',
		docs: 'apps/cortex-os/docs/deployment.md',
		package: '@cortex-os/asbr',
	});
}
