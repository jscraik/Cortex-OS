import fs from 'fs';
import path from 'path';

const forbiddenTokens: string[] = ['TODO:', 'Mock', 'not yet implemented'];
const allowlist: RegExp[] = [/docs\//, /README\.md$/];

function isAllowed(file: string): boolean {
	return allowlist.some((regex) => regex.test(file));
}

type PlaceholderResult = { file: string; token: string };

export async function scanRepoForPlaceholders(
	tokens: string[] = forbiddenTokens,
): Promise<PlaceholderResult[]> {
	const results: PlaceholderResult[] = [];
	function scanDir(dir: string) {
		for (const entry of fs.readdirSync(dir)) {
			const fullPath = path.join(dir, entry);
			const stat = fs.statSync(fullPath);
			if (stat.isDirectory()) {
				if (!['node_modules', '.git'].includes(entry)) scanDir(fullPath);
			} else if (!isAllowed(fullPath)) {
				const content = fs.readFileSync(fullPath, 'utf8');
				tokens.forEach((token) => {
					if (content.includes(token)) {
						results.push({ file: fullPath, token });
					}
				});
			}
		}
	}
	scanDir(process.cwd());
	return results;
}

if (require.main === module) {
	(async () => {
		const found = await scanRepoForPlaceholders();
		if (found.length) {
			console.error('brAInwav production guard failed:', found);
			process.exit(1);
		} else {
			console.log('brAInwav production guard passed.');
		}
	})();
}
