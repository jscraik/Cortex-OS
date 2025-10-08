#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { loadDotenv } from '../utils/dotenv-loader.mjs';

const envOutcome = await loadDotenv({ debug: Boolean(process.env.DEBUG || process.env.VERBOSE) });
if (!envOutcome.skipped) {
	console.log(`✅ brAInwav env loaded from ${envOutcome.path}`);
} else if (envOutcome.reason === 'fifo') {
	console.warn('⚠️  brAInwav env points to a FIFO. Run `op run --env-file=<file> -- <command>` first.');
} else if (envOutcome.reason === 'dotenv-error') {
	console.warn('⚠️  brAInwav env failed to load via dotenv. Check file permissions and syntax.');
} else {
	console.warn('⚠️  No brAInwav .env file detected. Proceeding without MLX-specific overrides.');
}

const envKeys = [
	'MLX_MODEL_PATH',
	'MLX_CACHE_DIR',
	'HF_HOME',
	'MEMORIES_EMBEDDER',
	'MLX_EMBED_BASE_URL',
	'TRANSFORMERS_CACHE',
];

console.log('\n🔍 brAInwav MLX Doctor - ExternalSSD Configuration Check');
console.log(`=${'='.repeat(60)}`);

console.log('\n📋 Environment Configuration:');
for (const k of envKeys) {
	const value = process.env[k] ?? '';
	const status = value ? '✅' : '❌';
	console.log(`  ${status} ${k}=${value}`);
}

// Check ExternalSSD mount
console.log('\n💾 ExternalSSD Status:');
const externalSSDPath = '/Volumes/ExternalSSD';
if (existsSync(externalSSDPath)) {
	try {
		const stats = statSync(externalSSDPath);
		console.log(`  ✅ ExternalSSD mounted at ${externalSSDPath}`);
		console.log(`  📊 Mount type: ${stats.isDirectory() ? 'Directory' : 'Other'}`);

		// Check key directories
		const keyDirs = [
			'/Volumes/ExternalSSD/ai-models',
			'/Volumes/ExternalSSD/ai-cache',
			'/Volumes/ExternalSSD/huggingface_cache',
		];

		for (const dir of keyDirs) {
			const exists = existsSync(dir);
			const status = exists ? '✅' : '❌';
			console.log(`  ${status} ${dir}`);
			if (exists) {
				try {
					const count = spawnSync('find', [dir, '-maxdepth', '2', '-type', 'd'], {
						encoding: 'utf8',
					});
					const dirCount = count.stdout.split('\n').filter((l) => l.trim()).length - 1;
					console.log(`      📁 Contains ${dirCount} subdirectories`);
				} catch {
					console.log('      📁 Directory scan failed');
				}
			}
		}
	} catch (error) {
		console.log(`  ❌ ExternalSSD access error: ${error.message}`);
	}
} else {
	console.log(`  ❌ ExternalSSD not mounted at ${externalSSDPath}`);
	console.log('     💡 Ensure your external SSD is connected and mounted');
}

console.log('\n🔧 mlx-knife Availability:');
const whichKnife = spawnSync('bash', ['-lc', 'command -v mlx-knife || true'], { encoding: 'utf8' });
if (whichKnife.status === 0 && whichKnife.stdout.trim()) {
	console.log('  ✅ mlx-knife found at:', whichKnife.stdout.trim());
} else {
	console.log('  ❌ mlx-knife not found in PATH');
	console.log('     💡 Install with: pip install mlx-knife');
}

console.log('\n📦 mlx-knife Version:');
const versionResult = spawnSync(
	'bash',
	['-lc', 'mlx-knife --version 2>/dev/null || echo "(not installed)"'],
	{ encoding: 'utf8' },
);
console.log(`  ${versionResult.stdout.trim()}`);

console.log('\n🎯 Available MLX Models:');
const listResult = spawnSync(
	'bash',
	['-lc', 'mlx-knife list 2>/dev/null || echo "(mlx-knife not installed or no models found)"'],
	{ encoding: 'utf8' },
);
const models = listResult.stdout.trim();
if (models && !models.includes('not installed') && !models.includes('no models')) {
	console.log('  ✅ Models detected:');
	models.split('\n').forEach((line) => {
		if (line.trim() && !line.includes('NAME')) {
			console.log(`    • ${line.trim()}`);
		}
	});
} else {
	console.log('  ❌ No models found');
	console.log('     💡 Use mlx-knife to download models to your ExternalSSD');
}

if (process.env.MLX_MODEL_PATH) {
	console.log(`\n📂 MLX_MODEL_PATH Contents: ${process.env.MLX_MODEL_PATH}`);
	if (existsSync(process.env.MLX_MODEL_PATH)) {
		const listFiles = spawnSync(
			'bash',
			[
				'-lc',
				`ls -la "${process.env.MLX_MODEL_PATH}" 2>/dev/null | head -20 || echo "(path not readable)"`,
			],
			{ encoding: 'utf8' },
		);
		console.log('  ✅ Path accessible:');
		console.log(
			listFiles.stdout
				.split('\n')
				.map((line) => `    ${line}`)
				.join('\n'),
		);
	} else {
		console.log('  ❌ Path does not exist');
	}
}

console.log('\n🐍 Python MLX Environment:');
// Use a simpler Python check to avoid f-string issues
const pythonCheck = spawnSync(
	'python3',
	[
		'-c',
		`import sys, platform
print("  ✅ Python: " + sys.version.split()[0] + " at " + sys.executable)
print("  🖥️  Platform: " + platform.platform())
try:
    import mlx
    print("  ✅ MLX package: Available")
except ImportError:
    print("  ❌ MLX package: Not installed")`,
	],
	{ encoding: 'utf8' },
);
console.log(pythonCheck.stdout || '  ❌ Python check failed');
if (pythonCheck.stderr) {
	console.log('  ⚠️  Python warnings:', pythonCheck.stderr);
}

console.log('\n🏥 Health Summary:');
const summary = [];
if (existsSync('/Volumes/ExternalSSD')) summary.push('✅ ExternalSSD mounted');
else summary.push('❌ ExternalSSD missing');

if (whichKnife.status === 0 && whichKnife.stdout.trim()) summary.push('✅ mlx-knife available');
else summary.push('❌ mlx-knife missing');

if (process.env.MLX_MODEL_PATH && existsSync(process.env.MLX_MODEL_PATH))
	summary.push('✅ MLX_MODEL_PATH configured');
else summary.push('❌ MLX_MODEL_PATH invalid');

for (const item of summary) {
	console.log(`  ${item}`);
}

const hasErrors = summary.some((item) => item.includes('❌'));
if (hasErrors) {
	console.log('\n🚨 Issues detected! See above for recommended fixes.');
	console.log('\n📖 Quick Setup Guide:');
	console.log('   1. Connect and mount your ExternalSSD');
	console.log('   2. Install mlx-knife: pip install mlx-knife');
	console.log('   3. Verify .env.local has correct ExternalSSD paths');
	process.exit(1);
} else {
	console.log('\n🎉 brAInwav MLX setup looks healthy!');
	process.exit(0);
}
