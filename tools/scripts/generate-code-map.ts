import { promises as fs } from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';
import * as ts from 'typescript';
import { z } from 'zod';

const argSchema = z.object({
	targetDir: z.string().default('.'),
	gitignore: z.string().optional(),
	out: z.string().default('codemap.json'),
});

interface CodeInfo {
	imports: string[];
	functions: string[];
	classes: string[];
	docstrings: string[];
}

async function parseArgs() {
	const [targetDir, gitignore, out] = process.argv.slice(2);
	const result = argSchema.safeParse({ targetDir, gitignore, out });
	if (!result.success) {
		console.error('Invalid arguments:', result.error.flatten().fieldErrors);
		process.exit(1);
	}
	return result.data;
}

function extractTS(content: string, fileName: string) {
	const source = ts.createSourceFile(
		fileName,
		content,
		ts.ScriptTarget.Latest,
		true,
	);
	const imports: string[] = [];
	const functions: string[] = [];
	const classes: string[] = [];
	source.forEachChild((node) => {
		if (ts.isImportDeclaration(node)) {
			imports.push((node.moduleSpecifier as ts.StringLiteral).text);
		} else if (ts.isFunctionDeclaration(node) && node.name) {
			functions.push(node.name.text);
		} else if (ts.isClassDeclaration(node) && node.name) {
			classes.push(node.name.text);
		}
	});
	const docstrings: string[] = [];
	const comments = ts.getLeadingCommentRanges(content, 0) || [];
	for (const range of comments) {
		const text = content
			.slice(range.pos, range.end)
			.replace(/^\/[/*]+/, '')
			.trim();
		if (text) docstrings.push(text);
	}
	return { imports, functions, classes, docstrings };
}

function extractPy(content: string) {
	const imports: string[] = [];
	const importRegex = /^import\s+([\w.]+)/gm;
	for (const m of content.matchAll(importRegex)) {
		imports.push(m[1]);
	}
	const fromImportRegex = /^from\s+([\w.]+)\s+import/gm;
	for (const m of content.matchAll(fromImportRegex)) {
		imports.push(m[1]);
	}
	const functions = Array.from(content.matchAll(/^def\s+(\w+)/gm), (m) => m[1]);
	const classes = Array.from(content.matchAll(/^class\s+(\w+)/gm), (m) => m[1]);
	const docstringMatch = content.match(/"""([\s\S]*?)"""/);
	const docstrings = docstringMatch ? [docstringMatch[1].trim()] : [];
	return { imports, functions, classes, docstrings };
}

async function main() {
	const { targetDir, gitignore, out } = await parseArgs();
	let ignorePatterns: string[] = [];
	if (gitignore) {
		try {
			const gi = await fs.readFile(path.resolve(gitignore), 'utf8');
			ignorePatterns = gi.split(/\r?\n/).filter(Boolean);
		} catch {
			// ignore if gitignore cannot be read
		}
	}
	const files = await globby(['**/*.{ts,tsx,js,jsx,py}'], {
		cwd: targetDir,
		gitignore: true,
		ignore: ignorePatterns,
	});
	const map: Record<string, CodeInfo> = {};
	for (const file of files) {
		const fullPath = path.join(targetDir, file);
		const content = await fs.readFile(fullPath, 'utf8');
		const ext = path.extname(file);
		map[file] = ext === '.py' ? extractPy(content) : extractTS(content, file);
	}
	await fs.writeFile(out, JSON.stringify(map, null, 2));
	// eslint-disable-next-line no-console
	console.log(`Code map written to ${out}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
