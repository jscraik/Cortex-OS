import micromatch from 'micromatch';

const patterns = [
	'**/*.secret',
	'**/.venv*/**',
	'**/__pycache__/**',
	'**/.pytest_cache/**',
	'**/.mypy_cache/**',
	'**/.ruff_cache/**',
	'**/node_modules/**',
];

const testPath =
	'packages/mcp/.venv-mcp313/lib/python3.13/site-packages/jwt/__pycache__/jwk_set_cache.cpython-313.pyc';

console.log('Testing path:', testPath);
patterns.forEach((pattern) => {
	const isMatch = micromatch.isMatch(testPath, pattern, { dot: true });
	console.log(`Pattern "${pattern}": ${isMatch ? 'MATCH' : 'NO MATCH'}`);
});

console.log(
	'\nOverall match result:',
	micromatch.isMatch(testPath, patterns, { dot: true }),
);
