// Small, pure helpers for MDX sanitization. Each function <= 40 lines (CODESTYLE).

export type SanitizationReport = {
	fencesRepaired: number;
	genericsEscaped: number;
	pseudoJsxEscaped: number;
	htmlTagsEscaped: number;
	spuriousFencesRepaired: number;
	totalChanges: number;
};

const startsWithFence = (s: string): RegExpExecArray | null =>
	/^(`{3,5})(?:\s*(markdown|md|mdx)\b)?\s*$/i.exec(s);

const isHeading = (s: string): boolean => /^\s*#{1,6}\s/.test(s);

const stripBom = (s: string): string => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

const looksLikeDoc = (s: string): boolean => s.startsWith('---\n') || /(^|\n)#\s/.test(s);

export const unwrapSuperFence = (content: string): string => {
	const lines = content.split(/\r?\n/);
	if (lines.length <= 2) return content;
	const open = startsWithFence(lines[0]?.toLowerCase() || '');
	if (!open) return content;
	let endIdx = -1;
	for (let i = lines.length - 1; i > 0; i--) {
		const raw = lines[i]?.trimEnd() ?? '';
		if (raw === '') continue;
		if (/^`{3,5}\s*$/.test(raw)) {
			endIdx = i;
			break;
		}
		break;
	}
	if (endIdx < 0) return content;
	const inner = lines.slice(1, endIdx).join('\n');
	return looksLikeDoc(inner) ? `${inner.replace(/^[\r\n]+/, '')}\n` : content;
};

export const upgradeDoubleBacktickFences = (s: string): string => {
	const langs = [
		'ts',
		'tsx',
		'js',
		'cjs',
		'mjs',
		'jsx',
		'json',
		'jsonc',
		'bash',
		'sh',
		'shell',
		'zsh',
		'yaml',
		'yml',
		'toml',
		'ini',
		'text',
		'md',
		'markdown',
		'typescript',
		'mermaid',
		'http',
		'sql',
		'diff',
	];
	return s
		.replace(/(^|\n)``([a-zA-Z0-9_-]{1,15})\n/g, (m, pre, lang) =>
			langs.includes(lang) && !pre.endsWith('`') ? `${pre}\`\`\`${lang}\n` : m,
		)
		.replace(
			/(^|\n)( {0,3})``([a-z]{1,5})\n([\s\S]*?)\n``(\n|$)/g,
			(_m, pre, indent, lang, body, tail) =>
				langs.includes(lang) ? `${pre}${indent}\`\`\`${lang}\n${body}\n\`\`\`${tail}` : _m,
		)
		.replace(
			/```([a-zA-Z0-9_-]+)\n([\s\S]*?)\n`{1,2}(\n|$)/g,
			(_m, lang, body, tail) => `\n\n\`\`\`${lang}\n${body}\n\`\`\`${tail}`,
		);
};

export const protectInlineGenerics = (s: string): string => {
	const OPEN = '__GENO__';
	const CLOSE = '__GENC__';
	let out = s.replace(
		/\b(?:Record|Array|Promise)<[^\n<>]{1,60}>/g,
		(m) => `\`${m.replace(/</g, OPEN).replace(/>/g, CLOSE)}\``,
	);
	out = out.replace(
		/(?<!`)\b([A-Z][A-Za-z0-9_$.]{0,40})<([^\n<>]{1,80})>(?!`)/g,
		(_m, id, inner) => `\`${String(id)}${OPEN}${String(inner)}${CLOSE}\``,
	);
	out = out.replace(
		/`([^`]+?):\s*`(Promise__GENO__[^`]+?__GENC__)`/g,
		(_m, left, p) => `\`${left}: ${p}\``,
	);
	out = out.replace(/(__GENC__)``/g, '$1`');
	return out.replace(new RegExp(OPEN, 'g'), '<').replace(new RegExp(CLOSE, 'g'), '>');
};

const isSimpleIdentifier = (s: string): boolean => /^[A-Z][\w.$-]{0,80}$/.test(s);
const isBracketed = (s: string): boolean => /^[A-Z][\w.$-]*\[[^\n\]]{1,40}\]$/.test(s);
const isAttrLike = (s: string): boolean => /^[a-z][a-z0-9-]*=/.test(s);
const isBareToken = (s: string): boolean => /^[A-Za-z0-9_$.,-]+$/.test(s);

export const escapePseudoJsx = (s: string): string =>
	s
		.replace(/<([^\s<>]{1,90})>/g, (m, inner) => {
			if (!inner) return m;
			if (inner.startsWith('/')) return `</${inner.slice(1)}>`; // allow safe closers
			if (/^[a-z]+$/.test(inner)) return m; // allow safe lowercase tags
			if (
				isSimpleIdentifier(inner) ||
				isBracketed(inner) ||
				isBareToken(inner) ||
				isAttrLike(inner)
			) {
				return isAttrLike(inner) ? `\`&lt;${inner}&gt;\`` : `&lt;${inner}&gt;`;
			}
			return m;
		})
		.replace(/<([A-Z][A-Za-z0-9_$-]{0,60})\s*\/>/g, (_m, name) => `&lt;${name}/&gt;`);

const stripTrailingWhitespace = (s: string): string =>
	s
		.split('\n')
		.map((l) => l.replace(/[ \t]+$/g, ''))
		.join('\n')
		.replace(/^\s+$/gm, '');

const fenceOpenRe = /^```([A-Za-z0-9_-]+)?\s*$/;

export const isCodeLikeLine = (l: string): boolean => {
	if (/\b(import |const |let |await |async |type |interface |class |new )/.test(l)) return true;
	if (/\bfunction\b|[;{}()=]/.test(l)) return true;
	return false;
};

export const isMermaidContentLine = (l: string): boolean => {
	const t = l.trim();
	if (t.startsWith('participant ') || t.startsWith('note ') || /^(alt|loop|end|rect)\b/i.test(t))
		return true;
	if (/^classDef\b|^subgraph\b/i.test(t)) return true;
	// simple arrow patterns between identifiers
	if (/[A-Za-z0-9_$]{1,20}(?:-{1,2}|={1,2})>>[A-Za-z0-9_$]{1,20}:/.test(t)) return true;
	if (/[A-Za-z0-9_$]{1,20}-->>[A-Za-z0-9_$]{1,20}:/.test(t)) return true;
	return false;
};

export const findFenceLookahead = (
	lines: string[],
	start: number,
): { foundOpen: boolean; foundClose: number; codeLike: boolean } => {
	let codeLike = false;
	let foundClose = -1;
	let foundOpen = false;
	for (let j = start + 1; j < Math.min(lines.length, start + 120); j++) {
		const mm = fenceOpenRe.exec(lines[j] || '');
		if (mm) {
			if (mm[1]) {
				foundOpen = true;
				break;
			} else {
				foundClose = j;
				break;
			}
		}
		if (!codeLike && isCodeLikeLine(lines[j] || '')) codeLike = true;
		if (/^\s*$/.test(lines[j] || '') && /^\s*#/.test(lines[j + 1] || '')) break;
	}
	return { foundOpen, foundClose, codeLike };
};

const extendBlockOnEarlyClose = (s: string): string => {
	const lines = s.split('\n');
	const stack: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		const m = fenceOpenRe.exec(lines[i] || '');
		if (!m) continue;
		const lang = m[1];
		if (lang) {
			stack.push(i);
			continue;
		}
		if (stack.length === 0) continue;
		const res = findFenceLookahead(lines, i);
		if (!res.foundOpen && res.foundClose !== -1 && res.codeLike) {
			lines[i] = '';
		} else {
			stack.pop();
		}
	}
	return lines.join('\n');
};

const scoreMermaidContinuation = (
	lines: string[],
	start: number,
): { mermaidLike: number; total: number; hardStop: boolean } => {
	let mermaidLike = 0;
	let total = 0;
	let hardStop = false;
	for (let j = start + 1; j < Math.min(lines.length, start + 40); j++) {
		const ln = lines[j] || '';
		if (ln.startsWith('```')) break;
		if (/^\s*$/.test(ln)) {
			total++;
			continue;
		}
		if (isHeading(ln) || ln.trim() === '---') {
			hardStop = true;
			break;
		}
		total++;
		if (isMermaidContentLine(ln)) mermaidLike++;
		else break;
	}
	return { mermaidLike, total, hardStop };
};

const extendMermaidOnPrematureClose = (s: string): string => {
	const lines = s.split('\n');
	let openMermaid: number | null = null;
	for (let i = 0; i < lines.length; i++) {
		const m = /^```(mermaid)?\s*$/.exec(lines[i] || '');
		if (!m) continue;
		if (m[1] === 'mermaid') {
			openMermaid = i;
			continue;
		}
		if (openMermaid == null) continue;
		const { mermaidLike, total, hardStop } = scoreMermaidContinuation(lines, i);
		if (!hardStop && mermaidLike > 0 && mermaidLike >= Math.min(3, total)) {
			lines[i] = '';
		} else {
			openMermaid = null;
		}
	}
	return lines.join('\n');
};

const autoCloseDanglingFences = (s: string): string => {
	const lines = s.split('\n');
	const opens: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		const m = /^```([A-Za-z0-9_-]+)?\s*$/.exec(lines[i] || '');
		if (!m) continue;
		if (m[1]) opens.push(i);
		else if (opens.length) opens.pop();
	}
	if (opens.length > 0) lines.push(...Array(opens.length).fill('```'));
	return lines.join('\n');
};

export const escapeInlineAnglesInCode = (s: string): string =>
	s.replace(/`[^`]{1,160}`/g, (seg) =>
		/[<>]/.test(seg) ? seg.replace(/</g, '&lt;').replace(/>/g, '&gt;') : seg,
	);

export const normalizeWhitespace = (s: string): string =>
	stripTrailingWhitespace(s.replace(/\n{4,}/g, '\n\n\n'));

export const sanitizeMdxContent = (raw: string): string => {
	let s = stripBom(raw);
	s = unwrapSuperFence(s);
	s = s.replace(/^````(?:markdown|md|mdx)?\n([\s\S]*?)\n``?`?\s*$/i, (_m, inner) =>
		looksLikeDoc(inner) ? inner.replace(/^[\r\n]+/, '') : _m,
	);
	s = upgradeDoubleBacktickFences(s);
	s = protectInlineGenerics(s);
	s = escapePseudoJsx(s);
	s = extendBlockOnEarlyClose(s);
	s = extendMermaidOnPrematureClose(s);
	s = autoCloseDanglingFences(s);
	s = escapeInlineAnglesInCode(s);
	s = normalizeWhitespace(s);
	return s;
};

export const sanitizeMdxContentWithReport = (
	content: string,
): { content: string; report: SanitizationReport } => {
	const original = content;
	const sanitized = sanitizeMdxContent(content);
	let fencesRepaired = 0;
	let genericsEscaped = 0;
	let pseudoJsxEscaped = 0;
	const htmlTagsEscaped = 0;
	const spuriousFencesRepaired = 0;
	if (original !== sanitized) {
		const genericMatches = original.match(/\w+<[^>]+>/g) || [];
		const jsxMatches = original.match(/<[^>]*\/?>(?!\))/g) || [];
		const fenceMatches = original.match(/``[^`]/g) || [];
		genericsEscaped = genericMatches.filter(
			(m) =>
				!sanitized.includes(m) && sanitized.includes(m.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
		).length;
		pseudoJsxEscaped = jsxMatches.filter(
			(m) =>
				!sanitized.includes(m) && sanitized.includes(m.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
		).length;
		fencesRepaired = fenceMatches.filter((m) => !sanitized.includes(m)).length;
	}
	const totalChanges =
		fencesRepaired + genericsEscaped + pseudoJsxEscaped + htmlTagsEscaped + spuriousFencesRepaired;
	return {
		content: sanitized,
		report: {
			fencesRepaired,
			genericsEscaped,
			pseudoJsxEscaped,
			htmlTagsEscaped,
			spuriousFencesRepaired,
			totalChanges,
		},
	};
};
