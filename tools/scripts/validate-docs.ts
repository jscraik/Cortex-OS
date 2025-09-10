import { existsSync } from 'node:fs';

if (!existsSync('docs')) {
	console.warn('docs/ missing');
}
console.log('Docs validation complete');
