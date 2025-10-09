import fs from 'node:fs';
import path from 'node:path';

function collectTsconfigFiles(baseDir) {
	const out = [];
	function walk(dir) {
		for (const name of fs.readdirSync(dir)) {
			const abs = path.join(dir, name);
			const stat = fs.statSync(abs);
			if (stat.isDirectory()) {
				if (name === 'node_modules' || name === '.git') continue;
				walk(abs);
			} else if (/^tsconfig.*\.json$/i.test(name)) {
				out.push(abs);
			}
		}
	}
	walk(baseDir);
	return out;
}

function analyzeFile(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	const moduleResolutionMatch = content.match(/"moduleResolution"\s*:\s*"([^"\\]+)"/);
	const moduleMatch = content.match(/"module"\s*:\s*"([^"\\]+)"/);
	const ignoreDeprecationsMatch = content.match(/"ignoreDeprecations"\s*:\s*"([^"\\]+)"/);
	return {
		moduleResolution: moduleResolutionMatch ? moduleResolutionMatch[1] : undefined,
		moduleVal: moduleMatch ? moduleMatch[1] : undefined,
		ignoreVal: ignoreDeprecationsMatch ? ignoreDeprecationsMatch[1] : undefined,
	};
}

function resolveExtendsChain(filePath, root) {
	const chain = [filePath];
	let current = filePath;
	while (true) {
		const content = fs.readFileSync(current, 'utf8');
		const m = content.match(/"extends"\s*:\s*"([^"]+)"/);
		if (!m) break;
		const ext = m[1];
		// Only resolve relative paths; if it's a package name, stop.
		if (!ext.includes('/') && !ext.startsWith('./') && !ext.startsWith('../')) break;
		// Normalize and append .json if necessary
		let resolved = path.resolve(path.dirname(current), ext);
		if (!resolved.toLowerCase().endsWith('.json')) resolved = `${resolved}.json`;
		if (!resolved.startsWith(root)) break; // avoid escaping repo
		if (!fs.existsSync(resolved)) break;
		chain.push(resolved);
		current = resolved;
	}
	return chain;
}

function findModuleDeclInChain(chain) {
	for (const file of chain) {
		const { moduleVal } = analyzeFile(file);
		if (typeof moduleVal !== 'undefined') return file;
	}
	return chain[chain.length - 1];
}

function collectFailures(files) {
	const failures = [];
	for (const file of files) {
		const { moduleResolution, moduleVal, ignoreVal } = analyzeFile(file);
		if (moduleResolution === 'NodeNext' && moduleVal !== 'NodeNext') {
			failures.push({
				file,
				reason: `moduleResolution=NodeNext but module=${moduleVal || '<missing>'}`,
			});
		}
		if (ignoreVal === '6.0') {
			failures.push({
				file,
				reason: `ignoreDeprecations=6.0 is unsupported; set to 5.0 or remove`,
			});
		}
	}
	return failures;
}

function applyFixes(failures, root) {
	const fixed = [];
	for (const f of failures.slice()) {
		let target = f.file;
		// If the issue relates to moduleResolution/module, prefer fixing the
		// top-most local config or the file that declares `module` in the chain.
		if (f.reason?.includes('moduleResolution=NodeNext')) {
			const chain = resolveExtendsChain(f.file, root);
			const candidate = findModuleDeclInChain(chain);
			target = candidate;
		}
		const ok = fixOneFile(target, failures);
		if (ok && !fixed.includes(target)) fixed.push(target);
	}
	// Remove resolved failures
	for (const p of fixed) {
		for (let i = failures.length - 1; i >= 0; i--) {
			if (failures[i].file === p) failures.splice(i, 1);
		}
	}
	return fixed;
}

function applyFixesToContent(content) {
	let out = content;
	// Update ignoreDeprecations 6.0 -> 5.0
	out = out.replace(/("ignoreDeprecations"\s*:\s*")6\.0(")/g, '$15.0$2');
	// If moduleResolution NodeNext, ensure module is NodeNext
	if (/"moduleResolution"\s*:\s*"NodeNext"/.test(out)) {
		if (/"module"\s*:\s*"[^"]+"/.test(out)) {
			out = out.replace(/("module"\s*:\s*")([^"]+)(")/g, '$1NodeNext$3');
		} else if (/"moduleResolution"\s*:\s*"NodeNext"/.test(out)) {
			out = out.replace(
				/("moduleResolution"\s*:\s*"NodeNext"\s*,?)/,
				'$1\n    "module": "NodeNext",',
			);
		} else {
			out = out.replace(/("compilerOptions"\s*:\s*\{)/, '$1\n    "module": "NodeNext",');
		}
	}
	return out;
}

function generateUnifiedDiff(original, updated) {
	const oLines = original.split(/\r?\n/);
	const uLines = updated.split(/\r?\n/);
	const max = Math.max(oLines.length, uLines.length);
	const out = [];
	out.push('--- original');
	out.push('+++ updated');
	for (let i = 0; i < max; i++) {
		const o = oLines[i];
		const u = uLines[i];
		if (o === u) {
			out.push(` ${o === undefined ? '' : o}`);
		} else {
			if (typeof o !== 'undefined') out.push(`-${o}`);
			if (typeof u !== 'undefined') out.push(`+${u}`);
		}
	}
	return out.join('\n');
}

function previewFixes(failures, root, previewMode = 'diff') {
	const diffs = [];
	const { execSync } = require('node:child_process');
	for (const f of failures.slice()) {
		let target = f.file;
		if (f.reason?.includes('moduleResolution=NodeNext')) {
			const chain = resolveExtendsChain(f.file, root);
			const candidate = findModuleDeclInChain(chain);
			target = candidate;
		}
		try {
			const original = fs.readFileSync(target, 'utf8');
			const updated = applyFixesToContent(original);
			if (updated !== original) {
				if (previewMode === 'patch') {
					// Create a temp file with updated content and use git to produce a
					// proper unified patch suitable for git apply.
					const tmp = `${target}.preview.tmp`;
					fs.writeFileSync(tmp, updated);
					try {
						// Use git --no-pager diff --no-index to produce a portable patch
						const cmd = `git --no-pager diff --no-index -- ${escapeShellArg(target)} ${escapeShellArg(tmp)}`;
						const patch = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
						diffs.push({ file: target, diff: patch });
					} finally {
						try {
							fs.unlinkSync(tmp);
						} catch {
							/* ignore */
						}
					}
				} else {
					const diff = generateUnifiedDiff(original, updated);
					diffs.push({ file: target, diff });
				}
			}
		} catch (err) {
			diffs.push({ file: target, diff: `error generating preview: ${String(err)}` });
		}
	}
	return diffs;
}

function escapeShellArg(s) {
	// Basic shell-escaping for unix-like shells
	return `'${String(s).replace(/'/g, "'" + "'" + "'")}'`;
}

function fixOneFile(filePath, failures) {
	try {
		const original = fs.readFileSync(filePath, 'utf8');
		const updated = applyFixesToContent(original);
		if (updated !== original) {
			fs.copyFileSync(filePath, `${filePath}.bak`);
			fs.writeFileSync(filePath, updated);
			return true;
		}
	} catch (err) {
		failures.push({ file: filePath, reason: `fix-failed: ${String(err)}` });
	}
	return false;
}

/**
 * Validate all tsconfig*.json files under the repository root.
 * Returns { success: boolean, failures: Array<{file, reason}> }
 */
async function validateTsconfigsCore(opts = {}) {
	const root = opts.root || process.cwd();
	const files = collectTsconfigFiles(root);
	const failures = collectFailures(files);

	// helpers hoisted to module scope

	// Optionally fix safe issues or preview fixes.
	let fixed = [];
	let diffs = [];
	const previewMode = opts.previewMode || (opts.preview ? 'diff' : undefined);
	if (previewMode && failures.length > 0) {
		diffs = previewFixes(failures, root, previewMode);
	} else if (opts.fix && failures.length > 0) {
		fixed = applyFixes(failures, root);
	}

	return { success: failures.length === 0, failures, files, fixed, diffs };
}

export async function validateTsconfigs(opts = {}) {
	return validateTsconfigsCore(opts);
}
