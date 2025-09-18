#!/usr/bin/env tsx

/**
 * Documentation Sync Script for Cortex-OS
 * Sept 2025 Standards: Functional-first, TypeScript, ESM, proper error handling
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, '..');
const WEBSITE_DIR = __dirname;
const DOCS_DIR = join(WEBSITE_DIR, 'docs');

// Type-safe configuration structure
interface DocsStructure {
	readonly [category: string]: Record<string, string>;
}

// Sanitization tracking for dry-run reporting
interface SanitizationReport {
	readonly fencesRepaired: number;
	readonly genericsEscaped: number;
	readonly pseudoJsxEscaped: number;
	readonly htmlTagsEscaped: number;
	readonly spuriousFencesRepaired: number;
	readonly totalChanges: number;
}

const DOCS_STRUCTURE: DocsStructure = {
	'.cortex': {
		docs: 'Cortex Platform Core',
	},
	apps: {
		'cortex-os': 'Core Runtime',
		'cortex-cli': 'Command Line Interface',
		'cortex-webui': 'Web Interface',
		'cortex-py': 'Python Integration',
		'cortex-marketplace': 'Marketplace',
		'cortex-code': 'Code Editor',
	},
	packages: {
		mcp: 'Model Context Protocol',
		'mcp-core': 'MCP Core',
		'mcp-bridge': 'MCP Bridge',
		'mcp-registry': 'MCP Registry',
		agents: 'Autonomous Agents',
		'agent-toolkit': 'Agent Toolkit',
		a2a: 'Agent-to-Agent Communication',
		'a2a-services': 'A2A Services',
		memories: 'Memory Management',
		rag: 'Retrieval Augmented Generation',
		orchestration: 'Workflow Orchestration',
		security: 'Security Framework',
		'cortex-sec': 'Cortex Security',
		observability: 'Monitoring & Observability',
		simlab: 'Simulation Laboratory',
		evals: 'Evaluation Framework',
		'model-gateway': 'Model Gateway',
		gateway: 'Gateway Services',
		kernel: 'Cortex Kernel',
		github: 'GitHub Integration',
		services: 'Core Services',
		mvp: 'MVP Framework',
		'mvp-core': 'MVP Core',
		'mvp-group': 'MVP Group',
		'mvp-server': 'MVP Server',
		'prp-runner': 'PRP Runner',
		'tdd-coach': 'TDD Coach',
		asbr: 'ASBR Framework',
	},
} as const;

interface SyncResult {
	readonly success: boolean;
	readonly packageName: string;
	readonly fileCount: number;
	readonly error?: string;
	readonly sanitizationReport?: SanitizationReport;
}

// Functional utilities (≤40 lines each)
const VERBOSE = process.env.DOCS_SYNC_VERBOSE === '1';
const log = (...args: unknown[]) => {
	if (VERBOSE) console.warn('[docs-sync]', ...args);
};
const info = (...args: unknown[]) => {
	console.warn('[docs-sync]', ...args);
}; // use warn (allowed)
const ensureDir = async (dir: string): Promise<void> => {
	try {
		await fs.mkdir(dir, { recursive: true });
	} catch (error) {
		throw new Error(`Failed to create directory ${dir}: ${error}`);
	}
};

const isMarkdownFile = (filename: string): boolean => filename.endsWith('.md');

const shouldSkipFile = (filename: string): boolean => {
	const skipPatterns = [
		/^tdd-plan.*\.md$/i,
		/^initiative-summary\.md$/i,
		/^.*-summary\.md$/i,
		/^temp-.*\.md$/i,
	];
	return skipPatterns.some((pattern) => pattern.test(filename));
};

// Reference link normalization map (root docs -> internal references section)
const REFERENCE_LINK_MAP: Record<string, string> = {
	'CONTRIBUTING.md': 'contributing',
	'CODE_OF_CONDUCT.md': 'code-of-conduct',
	'COMMERCIAL-LICENSE.md': 'commercial-license',
	'CHANGELOG.md': 'changelog',
	'CHANGES.md': 'changelog',
	'SECURITY.md': 'security',
	'AGENTS.md': 'agents',
	'POLICY.md': 'policy',
	'POLICY-TERMS.md': 'policy-terms',
};

const normalizeReferenceLinks = (md: string): string => {
	const pattern =
		/(\]\()(?:\/|\.\/|\.\.\/)*(CONTRIBUTING\.md|CODE_OF_CONDUCT\.md|COMMERCIAL-LICENSE\.md|CHANGELOG\.md|CHANGES\.md|SECURITY\.md|AGENTS\.md|POLICY\.md|POLICY-TERMS\.md)(#[^)]+)?\)/g;
	return md.replace(
		pattern,
		(_full, prefix: string, file: string, hash: string = '') => {
			const slug = REFERENCE_LINK_MAP[file];
			if (!slug) return _full;
			return `${prefix}/docs/references/${slug}${hash}`;
		},
	);
};
// Improved MDX sanitization - comprehensive approach
// eslint-disable-next-line sonarjs/cognitive-complexity
// Enhanced sanitizer that returns both content and change tracking
const sanitizeMdxContentWithReport = (
	content: string,
): { content: string; report: SanitizationReport } => {
	const report: SanitizationReport = {
		fencesRepaired: 0,
		genericsEscaped: 0,
		pseudoJsxEscaped: 0,
		htmlTagsEscaped: 0,
		spuriousFencesRepaired: 0,
		totalChanges: 0,
	};

	// Original sanitizer logic with change tracking
	const sanitizeMdxContent = (content: string): string => {
		// Normalize leading BOM and stray leading spaces so fence detection is reliable
		if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
		// Early manual super-fence unwrap (more robust than legacy regex approach)
		// Handles:
		//  - Leading line starting with ``` or ```` (3–5 backticks) optionally followed by markdown|md|mdx (case-insensitive) and optional spaces
		//  - Closing fence consisting solely of same count of backticks (allow trailing spaces)
		//  - CRLF or LF line endings
		//  - Mismatched close of different length (we still unwrap if inner looks like doc and a close fence of 3–5 backticks exists at end)
		// Heuristic: inner must contain frontmatter (--- at start) or at least one ATX heading (# ) to qualify as real doc; otherwise we leave as-is.
		{
			const lines = content.split(/\r?\n/);
			if (lines.length > 2) {
				const first = lines[0];
				const openMatch = /^(`{3,5})(?:\s*(markdown|md|mdx)\b)?\s*$/.exec(
					first.toLowerCase(),
				);
				if (openMatch) {
					// Find last fence line scanning from bottom (ignore trailing blanks)
					let endIdx = -1;
					for (let i = lines.length - 1; i > 0; i--) {
						const raw = lines[i].trimEnd();
						if (raw === '') continue; // skip trailing blank lines
						if (/^`{3,5}\s*$/.test(raw)) {
							endIdx = i;
							break;
						}
						break; // first non blank non fence -> stop
					}
					if (endIdx > 0) {
						const innerLines = lines.slice(1, endIdx);
						const inner = innerLines.join('\n');
						const looksLikeDoc =
							inner.startsWith('---\n') || /(^|\n)#\s/.test(inner);
						if (looksLikeDoc) {
							content = `${inner.replace(/^[\r\n]+/, '')}\n`;
						}
					}
				}
			}
		}
		// Pre-pass: unwrap whole-document super-fence (````markdown ... ````) or degraded triple/ plain variants.
		// Some upstream generators wrap the ENTIRE markdown (including frontmatter) in a single fence.
		// This produces an MDX parse error because the frontmatter/header become literal code.
		// We conservatively unwrap only when the inner block looks like real doc content (frontmatter or heading present).
		// Mismatched variant: opening ````markdown ... closing ``` (quad -> triple) – unwrap too.
		content = content.replace(
			/^````(?:markdown|md|mdx)?\n([\s\S]*?)\n```\s*$/i,
			(_m, inner) => {
				const looksLikeDoc =
					inner.startsWith('---\n') || /(^|\n)#\s/.test(inner);
				if (looksLikeDoc) return inner.replace(/^[\r\n]+/, '');
				return _m;
			},
		);
		// Quad-backtick variant unwrap
		content = content.replace(
			/^````(?:markdown|md|mdx)?\n([\s\S]*?)\n````\s*$/i,
			(_m, inner) => {
				const looksLikeDoc =
					inner.startsWith('---\n') || /(^|\n)#\s/.test(inner);
				if (looksLikeDoc) return inner.replace(/^[\r\n]+/, '');
				return _m;
			},
		);
		// Triple-backtick variant unwrap
		content = content.replace(
			/^```(?:markdown|md|mdx)?\n([\s\S]*?)\n```\s*$/i,
			(_m, inner) => {
				const looksLikeDoc =
					inner.startsWith('---\n') || /(^|\n)#\s/.test(inner);
				if (looksLikeDoc) return inner.replace(/^[\r\n]+/, '');
				return _m;
			},
		);
		// Trailing orphan super-fence cleanup (safe, no heavy regex):
		// If the document ends with a blank line followed by a solitary ``` or ```` we remove it.
		{
			const trimmedEnd = content.trimEnd();
			const fenceMatch = /(\n)(````|```)$/.exec(trimmedEnd);
			if (fenceMatch) {
				const body = `${trimmedEnd.slice(0, -fenceMatch[0].length)}\n`;
				// Only remove if body appears to be real doc (frontmatter or heading somewhere before)
				if (/^---\n[\s\S]*?\n---\n/.test(body) || /(^|\n)#\s/.test(body)) {
					content = body;
				}
			}
		}
		// New: normalize mismatched double-backtick opened blocks that later close with triple backticks.
		// Pattern: ``lang (start) ... later ``` (end) -> upgrade start to ```lang for MDX correctness.
		content = content.replace(
			/(^|\n)``([a-zA-Z0-9_-]{1,15})\n([\s\S]*?)\n```/g,
			(_m, pre, lang, body) => {
				return `${pre}\n\`\`\`${lang}\n${body}\n\`\`\``; // will be processed again safely later
			},
		);
		// (debug removed)
		// First decode any HTML entities that already exist
		const decoded = content
			.replace(/&lt;/g, '<') // Decode HTML entities
			.replace(/&gt;/g, '>') // Decode HTML entities
			.replace(/&#61;/g, '=') // Decode HTML entities
			.replace(/&amp;/g, '&') // Decode HTML entities
			.replace(/&quot;/g, '"') // Decode HTML entities
			.replace(/&#39;/g, "'"); // Decode HTML entities
		// Remove HTML comments (non-greedy)
		let out = decoded.replace(/<!--[^]*?-->/g, '');

		// Process fenced code blocks safely line-by-line (done later after protecting inline generics)
		out = out.replace(/```([a-zA-Z0-9_-]+)?\n[^]*?```/g, (block) => {
			const lines = block.split('\n');
			if (lines.length < 3) return block;
			const fence = lines[0];
			const lang = fence.replace(/```/, '').trim();
			const code = lines
				.slice(1, -1)
				.join('\n')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
			return `\`\`\`${lang || ''}\n${code}\n\`\`\``;
		});

		// Inline generic types first: protect angle brackets so we don't escape them later
		const GENERIC_SENTINEL_OPEN = '__GENO__';
		const GENERIC_SENTINEL_CLOSE = '__GENC__';
		out = out.replace(/\b(?:Record|Array|Promise)<[^\n<>]{1,60}>/g, (m) => {
			const unescaped = m.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
			const protectedAngles = unescaped
				.replace(/</g, GENERIC_SENTINEL_OPEN)
				.replace(/>/g, GENERIC_SENTINEL_CLOSE);
			return `\`${protectedAngles}\``;
		});

		// Additional pass: wrap bare Identifier<...> generic tokens (capitalized identifiers or snake_case) not already backticked.
		// These often appear in prose lists and MDX attempts to treat <...> as JSX.
		// Safeguards:
		//  - Skip if inside existing code span (quick negative lookbehind for backtick within same line segment)
		//  - Limit inner generic body size to avoid catastrophic matches
		//  - Do not double wrap tokens already containing our sentinel (already processed above)
		out = out.replace(
			/(?<!`)(\b[A-Z][A-Za-z0-9_$.]{0,40}<[^\n<>]{1,80}>)(?!`)/g,
			(m) => {
				if (m.includes(GENERIC_SENTINEL_OPEN)) return m; // already processed
				return `\`${m.replace(/</g, GENERIC_SENTINEL_OPEN).replace(/>/g, GENERIC_SENTINEL_CLOSE)}\``;
			},
		);

		// Multi-line generics (e.g., Promise<\n  Record<string, Array<Item>>\n>) that span newlines cause MDX JSX parsing issues.
		// Strategy:
		//  1. Split document into text vs code-fence segments (avoid touching code blocks).
		//  2. Inside text segments, find leading generic tokens (Promise|Record|Array|Map|Set or Capitalized Identifiers) followed by < ... > containing at least one newline.
		//  3. Collapse internal whitespace/newlines to single spaces, trim around angle brackets, wrap in backticks with sentinel-protected angle brackets.
		//  4. Skip if already backticked or already sentinelized.
		{
			const fenceRe = /```[a-zA-Z0-9_-]*\n[\s\S]*?\n```/g;
			const segments: Array<{ type: 'code' | 'text'; value: string }> = [];
			let lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = fenceRe.exec(out)) !== null) {
				if (m.index > lastIndex)
					segments.push({ type: 'text', value: out.slice(lastIndex, m.index) });
				segments.push({ type: 'code', value: m[0] });
				lastIndex = fenceRe.lastIndex;
			}
			if (lastIndex < out.length)
				segments.push({ type: 'text', value: out.slice(lastIndex) });
			const multilineGenericRe =
				/(?<!`)(\b(?:Promise|Record|Array|Map|Set|[A-Z][A-Za-z0-9_$]{2,})<([\s\S]{1,400}?)>)(?!`)/g;
			for (const seg of segments) {
				if (seg.type === 'code') continue;
				seg.value = seg.value.replace(
					multilineGenericRe,
					(full, whole, inner) => {
						if (!/\n/.test(inner)) return full; // not multi-line
						if (full.includes(GENERIC_SENTINEL_OPEN)) return full; // already processed earlier
						// Heuristic guard: require at most 12 angle brackets to avoid runaway for extremely nested constructs
						const angleCount = (inner.match(/[<>]/g) || []).length;
						if (angleCount > 24) return full;
						// Collapse whitespace including newlines
						let collapsed = (whole as string).replace(/\s+/g, ' ').trim();
						// Remove space right after '<' and before '>' with linear scan
						{
							let rebuilt = '';
							let i = 0;
							while (i < collapsed.length) {
								const ch = collapsed[i];
								if (ch === '<' && collapsed[i + 1] === ' ') {
									// skip extra space after '<'
									rebuilt += '<';
									i += 2;
									continue;
								}
								if (ch === ' ' && collapsed[i + 1] === '>') {
									// skip space before '>'
									i++;
									continue;
								}
								rebuilt += ch;
								i++;
							}
							collapsed = rebuilt;
						}
						// Re-verify looks like a generic after collapsing (simple heuristic: must contain '<' then later '>')
						const firstLt = collapsed.indexOf('<');
						const lastGt = collapsed.lastIndexOf('>');
						if (firstLt === -1 || lastGt === -1 || lastGt <= firstLt + 1)
							return full;
						collapsed = collapsed
							.replace(/</g, GENERIC_SENTINEL_OPEN)
							.replace(/>/g, GENERIC_SENTINEL_CLOSE);
						return `\`${collapsed}\``;
					},
				);
			}
			out = segments.map((s) => s.value).join('');
		}

		// Fix malformed inline code sequences like: `name(args): `Promise<Type>`` -> collapse to single code span
		out = out.replace(
			/`([^`]+?):\s*`(Promise__GENO__[^`]+?__GENC__)`/g,
			(_m, left, promisePart) => {
				return `\`${left}: ${promisePart}\``;
			},
		);
		// Collapse stray doubled trailing backticks after generics (Promise<Type>`` -> Promise<Type>`)
		out = out.replace(/(__GENC__)``/g, '$1`');
		// Normalize incorrect two-backtick fences (``ts) into proper triple backticks.
		// Safeguard: do NOT touch already-correct triple fences or accidental double backticks that are inline.
		// Extended language list for upgrading malformed double-backtick code fences.
		const FENCE_LANGS = [
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
		// NOTE: do not inject an extra blank line before the upgraded fence – preserve existing spacing.
		out = out.replace(/(^|\n)``([a-zA-Z0-9_-]{1,15})\n/g, (_m, pre, lang) => {
			if (pre.endsWith('`')) return _m;
			if (!FENCE_LANGS.includes(lang)) return _m; // only upgrade known languages
			return `${pre}\`\`\`${lang}\n`;
		});

		// Secondary pass: upgrade malformed fenced blocks that opened with ``lang and closed with `` (missing third backtick)
		// Pattern: beginning of line ``lang\n ... \n`` (no trailing backtick). We'll conservatively upgrade only if language token <=5 chars.
		out = out.replace(
			/(^|\n)``([a-z]{1,5})\n([\s\S]*?)\n``(\n|$)/g,
			(_m, pre, lang, body, tail) => {
				if (!FENCE_LANGS.includes(lang)) return _m;
				return `${pre}\n\`\`\`${lang}\n${body}\n\`\`\`${tail}`;
			},
		);

		// Normalize function signature headings or lines that have pattern: ## name(args): Promise<Type>
		// Convert to: ## `name(args): Promise<Type>` ensuring single code span (protect generics already sentinelized)
		// Constrained heading signature regex (no nested quantifiers)
		out = out.replace(
			/^(#{2,4}) ([A-Za-z0-9_$][A-Za-z0-9_$.<>-]*?\([^\n)]*\)):\s*(Promise__GENO__[A-Za-z0-9_<>, ]+__GENC__)(\s*)$/gm,
			(_m, hashes, left, promisePart, trail) => {
				const signature = `${left.trim()}: ${promisePart}`;
				return `${hashes} \`${signature}\`${trail}`;
			},
		);
		// Lines without heading hashes but starting at line beginning (list or paragraph) containing signature pattern
		out = out.replace(
			/^(?![#>-])([^`\n]{1,80}?)\(([^\n`]{0,80})\):\s*(Promise__GENO__[^`]+?__GENC__)(\s*)$/gm,
			(_m, fnName, args, promisePart, trail) => {
				const core = `${fnName}(${args}): ${promisePart}`
					.replace(/\s+/g, ' ')
					.trim();
				return `\`${core}\`${trail}`;
			},
		);
		// Collapse accidental double code spans around same signature (`` `code` `` -> `code`)
		out = out.replace(/`{2}([^`]+?)`{2}/g, (_m, inner) => `\`${inner}\``);

		// Now process fenced code blocks (escape angle brackets inside code blocks only)

		// Operators -> unicode
		out = out
			.replace(/\s<=\s/g, ' ≤ ')
			.replace(/\s>=\s/g, ' ≥ ')
			.replace(/\s=>\s/g, ' ⇒ ');

		// Inline code containing angle brackets or equals (excluding those already protected)
		out = out.replace(/`[^`]{1,160}`/g, (segment) => {
			if (segment.includes(GENERIC_SENTINEL_OPEN)) return segment; // skip protected generics
			if (!/[<>=]/.test(segment)) return segment; // quick filter
			return segment
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/=/g, '&#61;');
		});

		// Table line processing (escape generics & pipes inside cells)
		out = out
			.split('\n')
			.map((line) => {
				if (!line.startsWith('|')) return line;
				const cells = line.split('|').map((c) => c.trim());
				return cells
					.map((c, i, arr) => {
						if (i === 0 || i === arr.length - 1) return c; // edges
						let v = c;
						if (/[<>]/.test(v) && !v.startsWith('`')) {
							v = `\`${v.replace(/`/g, '')}\``;
						}
						if (/\\\|/.test(v)) {
							v = v.replace(/\\\|/g, '\\|');
						}
						return ` ${v} `;
					})
					.join('|');
			})
			.join('\n');

		// Normalize unicode punctuation
		out = out
			.replace(/[\u2018\u2019]/g, "'")
			.replace(/[\u201C\u201D]/g, '"')
			.replace(/[\u2013\u2014]/g, '-')
			.replace(/\u2026/g, '...');

		// Strip empty links / images
		// Remove empty links/images with manual scan (avoid complex regex)
		const imageTargetEnd = (s: string, start: number): number => {
			const close = s.indexOf(']', start + 2);
			if (close === -1 || s[close + 1] !== '(') return -1;
			const par = s.indexOf(')', close + 2);
			return par === -1 ? -1 : par + 1;
		};
		const emptyLinkInfo = (
			s: string,
			start: number,
		): { end: number; label: string } | null => {
			const close = s.indexOf(']', start + 1);
			if (close === -1 || s[close + 1] !== '(') return null;
			const par = s.indexOf(')', close + 2);
			if (par === -1) return null;
			if (s.slice(close + 2, par).trim() !== '') return null;
			return { end: par + 1, label: s.slice(start + 1, close) };
		};
		const processLinks = (line: string): string => {
			if (line.indexOf('](') === -1) return line; // fast path
			let outLine = '';
			let i = 0;
			while (i < line.length) {
				const ch = line[i];
				if (ch === '!' && line[i + 1] === '[') {
					const end = imageTargetEnd(line, i + 1);
					if (end !== -1) {
						i = end;
						continue;
					}
				}
				if (ch === '[') {
					const info = emptyLinkInfo(line, i);
					if (info) {
						outLine += info.label;
						i = info.end;
						continue;
					}
				}
				outLine += ch;
				i++;
			}
			return outLine;
		};
		out = out.split('\n').map(processLinks).join('\n');

		// Escape pseudo JSX / generic angle constructs that MDX interprets as tags
		// Cases to handle:
		//  - <CapitalizedType>
		//  - <GenericType<T,U>> (already sentinel protected inside code spans, but stray ones need escaping)
		//  - <Type[Something]> patterns (seen in api docs)
		//  - attribute-like fragments <foo=bar> which should be backticked
		const isSimpleIdentifier = (s: string): boolean =>
			/^[A-Z][\w.$-]{0,80}$/.test(s);
		const isBracketed = (s: string): boolean =>
			/^[A-Z][\w.$-]*\[[^\n\]]{1,40}\]$/.test(s);
		const isAttrLike = (s: string): boolean => /^[a-z][a-z0-9-]*=/.test(s);
		// Allowlist of safe html tags we permit raw (and matching closers) so MDX doesn't choke on mismatched escapes
		const SAFE_HTML = new Set([
			'div',
			'span',
			'a',
			'p',
			'br',
			'img',
			'strong',
			'em',
			'code',
			'pre',
			'ul',
			'ol',
			'li',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
		]);
		// Bare token = simple alphanum / punctuation run we may treat as identifier-like
		const isBareToken = (s: string): boolean => /^[A-Za-z0-9_$.,-]+$/.test(s);
		const needsEscape = (inside: string): boolean => {
			if (!inside) return false;
			if (inside.includes('<') || inside.includes('>') || inside.includes(' '))
				return false;
			if (inside.startsWith('/')) {
				const tag = inside.slice(1).toLowerCase();
				if (SAFE_HTML.has(tag)) return false; // allow closing safe tags
				return true;
			}
			if (inside.startsWith('!')) return true;
			if (SAFE_HTML.has(inside.toLowerCase()) && /^[a-z]+$/.test(inside))
				return false; // allow raw safe open tag
			return (
				isSimpleIdentifier(inside) ||
				isBracketed(inside) ||
				isBareToken(inside) ||
				isAttrLike(inside)
			);
		};
		const escapeSegment = (inside: string): string => {
			if (isAttrLike(inside)) return `\`&lt;${inside}&gt;\``;
			return `&lt;${inside}&gt;`;
		};
		out = out.replace(/<([^\s<>]{1,90})>/g, (m, inner) =>
			needsEscape(inner) ? escapeSegment(inner) : m,
		);
		// Self-closing pseudo-JSX tokens like <Widget/> or <Widget /> should also be escaped.
		out = out.replace(
			/<([A-Z][A-Za-z0-9_$-]{0,60})\s*\/>/g,
			(_m, name) => `&lt;${name}/&gt;`,
		);
		// Lazy line guard: lines that begin with a capitalized tag-like pattern with attributes (<Widget prop="x">) often break MDX if not true JSX.
		out = out
			.split('\n')
			.map((line) => {
				if (
					/^<([A-Z][A-Za-z0-9_$-]{0,60})(\s+[a-zA-Z_:][A-Za-z0-9_:.-]*=)/.test(
						line,
					) &&
					!line.trimEnd().endsWith('>')
				) {
					// If line starts with something that looks like an opening tag with attributes but isn't closed on this line, escape the starting '<...'
					return line.replace(
						/^<([A-Z][A-Za-z0-9_$-]{0,60})/,
						(_m, nm) => `&lt;${nm}`,
					);
				}
				if (
					/^<([A-Z][A-Za-z0-9_$-]{0,60})(\s+[a-zA-Z_:][A-Za-z0-9_:.-]*=)[^>]*>\s*$/.test(
						line,
					)
				) {
					// Fully closed single-line pseudo component: escape entire tag
					return line.replace(
						/^<([A-Z][A-Za-z0-9_$-]{0,60})([^>]*)>\s*$/,
						(_m, nm, attrs) => `&lt;${nm}${attrs.replace(/>/g, '')}&gt;`,
					);
				}
				return line;
			})
			.join('\n');
		// Additional pass: escape any remaining <Identifier> at start of headings that slipped through (rare)
		out = out.replace(
			/^(#{1,6} .*?)<([A-Z][\w.$-]{0,60})>(.*)$/gm,
			(_m, pre, id, post) => `${pre}&lt;${id}&gt;${post}`,
		); // keep simple
		// Headings with raw generic tokens like ## Foo<Bar> -> ## Foo `&lt;Bar&gt;`
		out = out.replace(
			/^(#{1,6} [^`\n]{0,120}?)([A-Z][A-Za-z0-9_$-]*<[^<>\n]{1,60}>)(.*)$/gm,
			(_m, pre, genericToken, post) => {
				const inner = genericToken.slice(genericToken.indexOf('<') + 1, -1);
				return `${pre}\`&lt;${inner}&gt;\`${post}`;
			},
		);

		// Whitespace compaction
		out = out.replace(/\n{4,}/g, '\n\n\n');
		out = out
			.split('\n')
			.map((l) => {
				let end = l.length;
				while (end > 0 && (l[end - 1] === ' ' || l[end - 1] === '\t')) end--;
				return end === l.length ? l : l.slice(0, end);
			})
			.join('\n');
		out = out.replace(/^\s+$/gm, '');

		// Restore protected generic angle brackets inside inline code
		out = out
			.replace(new RegExp(GENERIC_SENTINEL_OPEN, 'g'), '<')
			.replace(new RegExp(GENERIC_SENTINEL_CLOSE, 'g'), '>');

		// Post-pass: if we have escaped closing tags of safe elements (&lt;/div&gt;) while corresponding opener remained raw, unescape the closer for consistency
		out = out.replace(
			/&lt;\/(div|span|a|p|strong|em|code|pre|ul|ol|li|table|thead|tbody|tr|th|td)&gt;/g,
			(_m, tag) => `</${tag}>`,
		);

		// Ensure any upgraded opening fences also have triple closing fence (some malformed blocks end with ``)
		out = out.replace(/```([a-zA-Z0-9_-]+)\n[\s\S]*?\n``(\n|$)/g, (m) =>
			m.replace(/\n``(\n|$)/, '\n```$1'),
		);

		// Final normalization: upgrade any remaining leading double-backtick fences for known languages
		// First handle indented variants (0-3 leading spaces) to ensure they are promoted; preserve indentation depth.
		out = out.replace(
			/(^|\n)( {0,3})``(ts|tsx|js|json|bash|sh|yaml|yml|text|md|markdown)\n/g,
			(_m, pre, indent, lang) => {
				if (pre.endsWith('`')) return _m; // avoid accidental quadruple
				return `${pre}${indent}\`\`\`${lang}\n`;
			},
		);
		// Non-indented legacy pattern
		out = out.replace(
			/(^|\n)``(ts|tsx|js|json|bash|sh|yaml|yml|text|md|markdown)\n/g,
			(_m, pre, lang) => {
				if (pre.endsWith('`')) return _m; // avoid accidental quadruple
				return `${pre}\`\`\`${lang}\n`;
			},
		);
		// And ensure trailing double fence converted
		// Support optional indentation in closing fence (0-3 spaces)
		out = out.replace(
			/\n( {0,3})``(\n|$)/g,
			(_m, indent, tail) => `\n${indent}\`\`\`${tail}`,
		);
		// Defensive line-based pass: upgrade any remaining orphan double-fence blocks (including indented) missed by regex due to interference
		{
			const lines = out.split('\n');
			// Pass 1: straightforward upgrade of well-formed ``lang ... `` blocks
			for (let i = 0; i < lines.length; i++) {
				const m = /^( {0,3})``([A-Za-z0-9_-]{1,20})$/.exec(lines[i]);
				if (!m) continue;
				const indent = m[1];
				const lang = m[2];
				let closedAt: number | null = null;
				for (let j = i + 1; j < Math.min(lines.length, i + 800); j++) {
					if (/^( {0,3})```/.test(lines[j])) break; // another fenced block opened before closure -> abort
					if (new RegExp(`^${indent.replace(/ /g, ' ')}\`\`$`).test(lines[j])) {
						closedAt = j;
						break;
					}
				}
				if (closedAt !== null) {
					lines[i] = `${indent}\`\`\`${lang}`;
					lines[closedAt] = `${indent}\`\`\``;
					// advance outer loop automatically; do not mutate i for lint compliance
				}
			}
			// Pass 2: repair orphan opening ``lang with no explicit closing `` before a blank line / heading / frontmatter / end
			for (let i = 0; i < lines.length; i++) {
				const m = /^( {0,3})``([A-Za-z0-9_-]{1,20})$/.exec(lines[i]);
				if (!m) continue;
				const indent = m[1];
				const lang = m[2];
				// If already upgraded (starts with triple) skip
				if (/^ {0,3}```/.test(lines[i])) continue;
				let j = i + 1;
				let needAutoClose = false;
				for (; j < Math.min(lines.length, i + 400); j++) {
					const l = lines[j];
					if (new RegExp(`^${indent.replace(/ /g, ' ')}\`\`$`).test(l)) {
						// found closing `` -> handled in pass1
						break; // already closed; nothing to do
					}
					if (/^( {0,3})```/.test(l)) {
						// encountered another fenced block start; auto close before this
						needAutoClose = true;
						break;
					}
					if (l.startsWith('---') || l.startsWith('# ') || /^\s*$/.test(l)) {
						// structural boundary
						needAutoClose = true;
						break;
					}
				}
				lines[i] = `${indent}\`\`\`${lang}`;
				if (needAutoClose) {
					// insert closing fence before j (current structural boundary) if not already a fence
					lines.splice(j, 0, `${indent}\`\`\``);
				} else if (j >= lines.length) {
					// EOF without boundary -> append closing
					lines.push(`${indent}\`\`\``);
				}
			}
			out = lines.join('\n');
		}
		// Repair any blocks that ended with single or double backtick instead of triple
		out = out.replace(
			/```([a-zA-Z0-9_-]+)\n([\s\S]*?)\n`{1,2}(\n|$)/g,
			(_m, lang, body, tail) => `\n\n\`\`\`${lang}\n${body}\n\`\`\`${tail}`,
		);

		// (Super-fence already unwrapped in pre-pass if applicable)

		// --- Enhancement A: Frontmatter anomaly repair ---
		// If multiple frontmatter delimiter lines (---) appear in the first 30 lines beyond a normal pair
		// we attempt a conservative repair by keeping only the first contiguous block.
		{
			const lines = out.split('\n');
			const searchWindow = Math.min(lines.length, 30);
			const delimIdx: number[] = [];
			for (let i = 0; i < searchWindow; i++)
				if (lines[i].trim() === '---') delimIdx.push(i);
			if (delimIdx.length > 2) {
				const second = delimIdx[1];
				// Remove any additional delimiter lines between second delimiter and first heading
				for (let k = second + 1; k < searchWindow; k++) {
					if (/^#\s/.test(lines[k])) break; // stop at first heading
					if (lines[k].trim() === '---') lines[k] = '';
				}
				out = lines.join('\n');
			}
		}

		// --- Enhancement B: List-leading pseudo JSX or generic tokens ---
		// Safer implementation: iterate lines and process list-leading tokens without large regex alternation.
		{
			const lines = out.split('\n');
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!/^\s*[-*+]\s+/.test(line)) continue;
				const listMatch = /^(\s*[-*+]\s+)(\S.*)$/.exec(line);
				if (!listMatch) continue;
				const [, lead, rest] = listMatch;
				const tagMatch = /^<([A-Z][\w.$-]{0,60})>(.*)$/.exec(rest);
				if (tagMatch) {
					lines[i] = `${lead}&lt;${tagMatch[1]}&gt;${tagMatch[2]}`;
					continue;
				}
				const genMatch =
					/^([A-Z][A-Za-z0-9_$-]{0,40})<([^<>\n]{1,60})>(.*)$/.exec(rest);
				if (genMatch) {
					const [, ident, inner, tail] = genMatch;
					if (!/`/.test(rest)) {
						lines[i] = `${lead}${ident}\`&lt;${inner}&gt;\`${tail}`;
					}
				}
			}
			out = lines.join('\n');
		}

		// --- Enhancement C: Multi-line pseudo-JSX attribute continuations ---
		{
			const lines = out.split('\n');
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (
					/^<([A-Z][A-Za-z0-9_$-]{0,60})(\s|$)/.test(line) &&
					!line.includes('&lt;')
				) {
					let closed = false;
					let end = i;
					for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
						const lj = lines[j];
						if (/^>$/.test(lj.trim()) || />\s*$/.test(lj)) {
							closed = true;
							end = j;
							break;
						}
						if (/^\s*$/.test(lj)) break; // blank terminates pattern
					}
					if (closed && end > i) lines[i] = line.replace(/^</, '&lt;');
				}
			}
			out = lines.join('\n');
		}

		// --- Enhancement D: Stray generic opener lines ---
		// Stray generic opener (Identifier< on its own line)
		out = out
			.split('\n')
			.map((l) => {
				const opener = /^(\s*([A-Z][A-Za-z0-9_$-]{0,40}))<\s*$/.exec(l);
				if (opener) return `${opener[1]}\`&lt;\``;
				return l;
			})
			.join('\n');

		// --- Enhancement E: Spurious early closing fences splitting a single code block ---
		// Pattern: ```lang ... ```  (early close)  code-like lines ... ``` (real close)
		// We detect a closing fence that is followed (before any opening fence) by another closing fence
		// where the intervening lines look code-ish or mermaid-ish; we remove the first closing fence
		// to extend the original block. This repairs truncated examples causing MDX parse errors.
		{
			const lines = out.split('\n');
			const fenceLineRe = /^```([A-Za-z0-9_-]+)?\s*$/;
			const codeLikeRe =
				/(?:^(?:\s{0,4}(?:import |const |let |await |async |type |interface |class |new |participant |[A-Za-z0-9_$]+\s*=|[A-Z]{1,5}-&gt;&gt;|[A-Z]{1,5}--&gt;&gt;|[A-Z]{1,5}->>|[A-Z]{1,5}-->>)))|[;{}()=]|--&gt;&gt;|-&gt;&gt;|-->>|->>|=>/;
			interface OpenFence {
				index: number;
				lang: string;
			}
			const stack: OpenFence[] = [];
			for (let i = 0; i < lines.length; i++) {
				const m = fenceLineRe.exec(lines[i]);
				if (m) {
					const lang = m[1];
					if (lang) {
						// opening fence
						stack.push({ index: i, lang });
						continue;
					}
					// closing fence candidate
					if (stack.length === 0) continue; // unmatched closing earlier handled elsewhere
					// Look ahead for another pure closing fence before an opening fence appears
					let j = i + 1;
					let foundNextClose = -1;
					let foundInterveningOpen = false;
					let codeLike = false;
					for (; j < Math.min(lines.length, i + 120); j++) {
						// limit lookahead to 120 lines for safety
						const mj = fenceLineRe.exec(lines[j]);
						if (mj) {
							if (mj[1]) {
								// opening fence encountered
								foundInterveningOpen = true;
								break;
							} else {
								// another closing fence
								foundNextClose = j;
								break;
							}
						}
						if (!codeLike && codeLikeRe.test(lines[j])) codeLike = true;
						// Stop if we hit an empty line followed by a heading to avoid eating narrative text
						if (/^\s*$/.test(lines[j]) && /^\s*#/.test(lines[j + 1] || ''))
							break;
					}
					if (!foundInterveningOpen && foundNextClose !== -1 && codeLike) {
						// Remove this early closing fence line
						lines[i] = ''; // preserve line count for offsets, easier than splice
						continue; // keep stack open (do not pop)
					}
					// Normal close; pop stack
					stack.pop();
				}
			}
			out = lines.join('\n');
		}

		// --- Enhancement F: Mermaid premature fence closure repair ---
		// If a mermaid block is closed and immediately followed by lines that look like mermaid diagram content
		// (arrows, participant, note, alt, loop etc.) we treat the closing fence as premature and remove it,
		// effectively extending the original mermaid block so arrow lines are not parsed as MDX/JSX.
		{
			const lines = out.split('\n');
			const fenceRe = /^```(mermaid)?\s*$/;
			const mermaidContentRe =
				/^(\s*(participant\s+|note\s+|alt\b|loop\b|end\b|rect\b|classDef\b|subgraph\b|[A-Za-z0-9_$]{1,20}(?:-{1,2}|={1,2})>>[A-Za-z0-9_$]{1,20}:|[A-Za-z0-9_$]{1,20}-->>[A-Za-z0-9_$]{1,20}:))/i;
			let openMermaid: number | null = null;
			for (let i = 0; i < lines.length; i++) {
				const m = fenceRe.exec(lines[i]);
				if (m) {
					if (m[1] === 'mermaid') {
						openMermaid = i; // opening
						continue;
					}
					// closing fence
					if (openMermaid != null) {
						// Look ahead a few lines (until blank or heading) to see if mermaid-like
						let mermaidLikeCount = 0;
						let total = 0;
						let j = i + 1;
						let hardStop = false;
						for (; j < Math.min(lines.length, i + 40); j++) {
							const ln = lines[j];
							if (/^```/.test(ln)) break; // another fence; stop
							if (/^\s*$/.test(ln)) {
								total++;
								continue;
							} // allow blank
							if (/^\s*#/.test(ln)) {
								hardStop = true;
								break;
							}
							if (/^---$/.test(ln)) {
								hardStop = true;
								break;
							}
							total++;
							if (mermaidContentRe.test(ln)) mermaidLikeCount++;
							else break; // stop at first non-mermaid content line
						}
						if (
							!hardStop &&
							mermaidLikeCount > 0 &&
							mermaidLikeCount >= Math.min(3, total)
						) {
							// Remove closing fence to extend block
							lines[i] = ''; // keep line indices stable
							// Do not reset openMermaid so that later final closing fence will still close
							continue;
						}
						openMermaid = null; // normal close
					}
				}
			}
			out = lines.join('\n');
		}

		// --- Final fence integrity & decoding pass ---
		{
			let changed = false;
			const lines = out.split('\n');
			const opens: { index: number; lang: string }[] = [];
			for (let i = 0; i < lines.length; i++) {
				const open = /^```([A-Za-z0-9_-]+)?\s*$/.exec(lines[i]);
				if (open) {
					// if it's a closing fence (no lang AND we have an outstanding open) treat as closure
					if (!open[1] && opens.length > 0) {
						opens.pop();
						continue;
					}
					// otherwise it's an opening fence we need to find closure for
					opens.push({ index: i, lang: open[1] || '' });
					continue;
				}
				if (/^```\s*$/.test(lines[i])) {
					// raw closing fence
					if (opens.length > 0) opens.pop();
				}
			}
			// Auto-close any remaining opens at EOF
			if (opens.length > 0) {
				const remaining = opens.length;
				for (let k = 0; k < remaining; k++) lines.push('```');
				if (remaining) changed = true;
			}
			if (changed) out = lines.join('\n');
		}
		// Decode any equals entities that slipped inside fenced code blocks due to late fence promotion
		out = out.replace(/```([a-zA-Z0-9_-]+)?\n[\s\S]*?\n```/g, (block) =>
			block.replace(/&#61;/g, '='),
		);
		// Remove duplicate immediate closing fences produced by earlier transformations
		out = out.replace(/```\n```/g, '```');

		return out;
	};

	// Apply sanitization and track the original for comparison
	const originalContent = content;
	const sanitizedContent = sanitizeMdxContent(content);

	// Count changes by comparing before/after content
	// This is a simplified approach - for more precise tracking,
	// the sanitizer logic above would need individual counters
	if (originalContent !== sanitizedContent) {
		// Count approximate changes (this could be enhanced for more precise tracking)
		const genericMatches = originalContent.match(/\w+<[^>]+>/g) || [];
		const jsxMatches = originalContent.match(/<[^>]*\/?>/g) || [];
		const fenceMatches = originalContent.match(/``[^`]/g) || [];

		report.genericsEscaped = genericMatches.filter(
			(m) =>
				!sanitizedContent.includes(m) &&
				sanitizedContent.includes(
					m.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
				),
		).length;

		report.pseudoJsxEscaped = jsxMatches.filter(
			(m) =>
				!sanitizedContent.includes(m) &&
				sanitizedContent.includes(
					m.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
				),
		).length;

		report.fencesRepaired = fenceMatches.filter(
			(m) => !sanitizedContent.includes(m),
		).length;

		report.totalChanges =
			report.fencesRepaired +
			report.genericsEscaped +
			report.pseudoJsxEscaped +
			report.htmlTagsEscaped +
			report.spuriousFencesRepaired;
	}

	return { content: sanitizedContent, report };
};

// Backward compatibility wrapper
const sanitizeMdxContent = (content: string): string => {
	return sanitizeMdxContentWithReport(content).content;
};

const createFrontmatter = (filename: string, displayName: string): string => {
	const title =
		filename === 'README.md'
			? displayName
			: filename
					.replace(/\.md$/, '')
					.replace(/-/g, ' ')
					.replace(/\b\w/g, (l) => l.toUpperCase());

	return `---\ntitle: ${title}\nsidebar_label: ${title}\n---\n\n`;
};

const hasSlugCollision = (fileNames: string[], dirBase: string): boolean => {
	// Collision if README + dirBase (directory file name duplication). We intentionally
	// do NOT treat index+base as a supported pattern anymore; the solution is to rename
	// the duplicate file (e.g. security.md -> security-overview.md) rather than inject
	// slug overrides. This keeps stable, predictable URLs.
	return fileNames.includes('README.md') && fileNames.includes(`${dirBase}.md`);
};

// Pure helper: decide if we should skip copying a base file (<dirBase>.md)
// when an index.md already exists in the TARGET directory. This prevents
// duplicate /<dirBase> routes (index vs base file) which Docusaurus reports
// as duplicate route warnings.
const shouldSkipBaseFile = (params: {
	entryName: string;
	dirBase: string;
	existingTargetFiles: string[];
	fileNames: string[]; // source file names (for potential future logic)
	collision: boolean;
}): boolean => {
	const { entryName, dirBase, existingTargetFiles } = params;
	// Skip if file is the directory base (dirName.md) and index.md exists (primary landing page)
	if (entryName === `${dirBase}.md` && existingTargetFiles.includes('index.md'))
		return true;
	// Additional skip rule: if a file name equals the directory name (case-insensitive) but we already have index.md.
	// Some packages generate both security.md and index.md referencing the same conceptual landing page.
	if (existingTargetFiles.includes('index.md')) {
		const stem = entryName.replace(/\.md$/, '').toLowerCase();
		if (stem === dirBase.toLowerCase()) return true;
	}
	return false;
};

// Decide slug override for a file under collision scenario (pure, testable)
const decideSlugOverride = (opts: {
	fileName: string;
	dirBase: string;
	fileNames: string[];
}): string | undefined => {
	const { fileName, dirBase, fileNames } = opts;
	// When README and <dirBase>.md both exist we keep README as root route and skip base file.
	if (fileName === `${dirBase}.md` && fileNames.includes('README.md'))
		return '__SKIP__';
	return undefined;
};

const ensureReferenceStubs = async (): Promise<number> => {
	const refsDir = join(DOCS_DIR, 'references');
	await ensureDir(refsDir);
	let created = 0;
	for (const slug of Object.values(REFERENCE_LINK_MAP)) {
		const file = join(refsDir, `${slug}.md`);
		const exists = await fs
			.access(file)
			.then(() => true)
			.catch(() => false);
		if (!exists) {
			const title = slug
				.replace(/-/g, ' ')
				.replace(/\b\w/g, (c) => c.toUpperCase());
			const stub = `---\ntitle: ${title}\nsidebar_label: ${title}\n---\n\n> Reference placeholder for ${title}.\n`;
			await fs.writeFile(file, stub);
			created++;
			log('Created stub', slug);
		}
	}
	return created;
};

// Pure function for processing single file
const processMarkdownFile = async (
	sourcePath: string,
	targetPath: string,
	filename: string,
	displayName: string,
	options?: { slugOverride?: string },
): Promise<void> => {
	try {
		let content = await fs.readFile(sourcePath, 'utf8');
		content = sanitizeMdxContent(content);

		if (!content.startsWith('---')) {
			content = createFrontmatter(filename, displayName) + content;
		} else if (options?.slugOverride) {
			// Inject slug if not already present
			const fmEnd = content.indexOf('---', 3);
			if (fmEnd !== -1) {
				const fmBlock = content.slice(0, fmEnd + 3);
				if (!/\nslug: /.test(fmBlock)) {
					const injected = fmBlock.replace(
						/---\n$/,
						`slug: ${options.slugOverride}\n---\n`,
					);
					content = injected + content.slice(fmEnd + 3);
				}
			}
		}

		// Special handling: cortex/runtime-map.md inline TS snippets need fencing to avoid MDX acorn parse errors
		if (targetPath.endsWith('/cortex/runtime-map.md')) {
			const fence = (pattern: RegExp) => {
				content = content.replace(pattern, (block) => {
					if (block.includes('```')) return block;
					const lines = block.split('\n').map((l) => l.replace(/^ {2}/, ''));
					return `\n\`\`\`ts\n${lines.join('\n')}\n\`\`\`\n`;
				});
			};
			fence(
				/(\n\s{2}\/\/ packages\/a2a\/src\/bus.ts[\s\S]*?RAG reacts to GitHub without knowing GitHub or agents\.)/,
			);
			fence(
				/(\n\s{2}\/\/ packages\/mvp\/src\/contracts\/memories.ts[\s\S]*?Result: Orchestration uses Memories through an interface, not a concrete package\.)/,
			);
			fence(
				/(\n\s{2}\/\/ packages\/agents\/src\/tools\/searchPRs.ts[\s\S]*?Result: Agents interact with GitHub via MCP, not other packages\.)/,
			);
			content = content.replace(
				/```ts\n([\s\S]*?)```/g,
				(_m, code) =>
					`\`\`\`ts\n${code
						.replace(/&lt;/g, '<')
						.replace(/&gt;/g, '>')
						.replace(/&#61;/g, '=')}\`\`\``,
			);
		}

		content = normalizeReferenceLinks(content);

		await fs.writeFile(targetPath, content);
	} catch (error) {
		throw new Error(`Failed to process ${sourcePath}: ${error}`);
	}
};

// Main sync function - pure and composable
// Extracted processor for a single directory entry (pure apart from fs)
const handleDocEntry = async (params: {
	entryName: string;
	sourceDocsDir: string;
	targetDir: string;
	displayName: string;
	collision: boolean;
	dirBase: string;
	fileNames: string[];
	existingTargetFiles: string[];
}): Promise<boolean> => {
	const {
		entryName,
		sourceDocsDir,
		targetDir,
		displayName,
		collision,
		dirBase,
		fileNames,
		existingTargetFiles,
	} = params;
	if (!isMarkdownFile(entryName)) return false;
	if (shouldSkipFile(entryName)) {
		log(`Skipping ${entryName} (pattern match)`);
		return false;
	}
	if (collision) {
		const decision = decideSlugOverride({
			fileName: entryName,
			dirBase,
			fileNames,
		});
		if (decision === '__SKIP__') {
			log(
				`Skipping ${entryName} (collision with README.md – rename recommended).`,
			);
			return false;
		}
	}
	if (
		shouldSkipBaseFile({
			entryName,
			dirBase,
			existingTargetFiles,
			fileNames,
			collision,
		})
	) {
		// If a stale copy of the base file already exists from a previous sync run, remove it so
		// Docusaurus does not register a duplicate route. We intentionally treat this as a
		// maintenance cleanup rather than a hard error – absence or failure to delete just logs.
		const stalePath = join(targetDir, entryName);
		try {
			await fs.unlink(stalePath);
			log(
				`Removed stale base file ${entryName} (index.md present – avoiding duplicate route).`,
			);
		} catch {
			// ignore if it doesn't exist or cannot be removed
			log(
				`Skipping ${entryName} (index.md present – avoiding duplicate route).`,
			);
		}
		// Skip copying new content
		return false;
	}
	const sourcePath = join(sourceDocsDir, entryName);
	const targetPath = join(targetDir, entryName);
	await processMarkdownFile(sourcePath, targetPath, entryName, displayName);
	return true;
};

const syncPackageDocs = async (
	category: string,
	packageName: string,
	displayName: string,
	_options: SyncOptions = { dryRun: false },
): Promise<SyncResult> => {
	const sourceDocsDir = join(ROOT_DIR, category, packageName, 'docs');
	const targetDir = join(DOCS_DIR, category, packageName);

	try {
		await fs.access(sourceDocsDir);
	} catch {
		return {
			success: false,
			packageName,
			fileCount: 0,
			error: `No docs found for ${category}/${packageName}`,
		};
	}

	info(`📁 Syncing ${category}/${packageName} -> ${targetDir}`);

	try {
		await ensureDir(targetDir);
		// Capture existing target files BEFORE copying (e.g., manually curated index.md hubs)
		const existingTargetFiles = await fs
			.readdir(targetDir)
			.catch(() => [] as string[]);
		const prep = await (async () => {
			const entries = await fs.readdir(sourceDocsDir, { withFileTypes: true });
			const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
			// NOTE: Previous implementation used basename(sourceDocsDir) which resolves to 'docs'.
			// For package docs located at <root>/<category>/<package>/docs we want the package name
			// as the logical route base (e.g. 'security'). Using 'docs' prevented base-file skip logic
			// and allowed duplicate routes (index.md vs security.md). We now set dirBase explicitly
			// to packageName so slug collision and base-file handling work as intended.
			const dirBase = packageName;
			const collision = hasSlugCollision(fileNames, dirBase);
			const debugSlugs = process.env.DOCS_SYNC_DEBUG_SLUGS === '1';
			if (debugSlugs && collision)
				log('Slug collision detected', {
					packageName,
					dirBase,
					files: fileNames,
				});
			return { entries, fileNames, dirBase, collision } as const;
		})();
		let fileCount = 0;

		for (const entry of prep.entries) {
			if (!entry.isFile()) continue;
			const processed = await handleDocEntry({
				entryName: entry.name,
				sourceDocsDir,
				targetDir,
				displayName,
				collision: prep.collision,
				dirBase: prep.dirBase,
				fileNames: prep.fileNames,
				existingTargetFiles,
			});
			if (processed) fileCount++;
		}

		return { success: true, packageName, fileCount };
	} catch (error) {
		return {
			success: false,
			packageName,
			fileCount: 0,
			error: `Sync failed: ${error}`,
		};
	}
};

// Sidebar generation - pure function
const generateSidebarConfig = async (): Promise<object> => {
	interface SidebarCategory {
		type: 'category';
		label: string;
		items: (
			| string
			| SidebarCategory
			| { type: 'category'; label: string; items: string[] }
		)[];
		collapsed?: boolean;
	}

	const sidebar = {
		tutorialSidebar: [
			'getting-started',
			{
				type: 'category',
				label: 'Getting Started',
				items: [
					'getting-started/quick-start',
					'getting-started/python-integration',
					'getting-started/architecture-overview',
				],
			},
			{
				type: 'category',
				label: 'Cortex Platform',
				collapsed: false,
				items: [],
			} as SidebarCategory,
			{
				type: 'category',
				label: 'Applications',
				collapsed: false,
				items: [],
			} as SidebarCategory,
			{
				type: 'category',
				label: 'Core Packages',
				collapsed: false,
				items: [],
			} as SidebarCategory,
			{
				type: 'category',
				label: 'Agents',
				items: [
					'agents/overview',
					'agents/contracts-validation',
					'agents/memory-state',
				],
			},
		],
	};

	// Add .cortex documentation dynamically
	const cortexDocsPath = join(DOCS_DIR, 'cortex');
	try {
		const files = await fs.readdir(cortexDocsPath);
		const mdFiles = files
			.filter((f) => f.endsWith('.md') && f !== 'README.md')
			.map((f) => `cortex/${f.replace('.md', '')}`);

		if (mdFiles.length > 0) {
			const cortexCategory = sidebar.tutorialSidebar.find(
				(item) =>
					typeof item === 'object' &&
					item !== null &&
					'label' in item &&
					item.label === 'Cortex Platform',
			) as SidebarCategory;
			cortexCategory.items.push(...mdFiles); // Add files directly
		}
	} catch {
		// Directory doesn't exist, skip
	}

	// Add applications dynamically
	for (const [packageName, displayName] of Object.entries(
		DOCS_STRUCTURE.apps,
	)) {
		const docsPath = join(DOCS_DIR, 'apps', packageName);
		try {
			const files = await fs.readdir(docsPath);
			const mdFiles = files
				.filter((f) => f.endsWith('.md') && f !== 'README.md')
				.map((f) => `apps/${packageName}/${f.replace('.md', '')}`);

			if (mdFiles.length > 0) {
				const appsCategory = sidebar.tutorialSidebar.find(
					(item) =>
						typeof item === 'object' &&
						item !== null &&
						'label' in item &&
						item.label === 'Applications',
				) as SidebarCategory;
				appsCategory.items.push({
					type: 'category',
					label: displayName,
					items: mdFiles,
				});
			}
		} catch {
			// Directory doesn't exist, skip
		}
	}

	// Add packages dynamically
	for (const [packageName, displayName] of Object.entries(
		DOCS_STRUCTURE.packages,
	)) {
		const docsPath = join(DOCS_DIR, 'packages', packageName);
		try {
			const files = await fs.readdir(docsPath);
			const mdFiles = files
				.filter((f) => f.endsWith('.md') && f !== 'README.md')
				.map((f) => `packages/${packageName}/${f.replace('.md', '')}`);

			if (mdFiles.length > 0) {
				const packagesCategory = sidebar.tutorialSidebar.find(
					(item) =>
						typeof item === 'object' &&
						item !== null &&
						'label' in item &&
						item.label === 'Core Packages',
				) as SidebarCategory;
				packagesCategory.items.push({
					type: 'category',
					label: displayName,
					items: mdFiles,
				});
			}
		} catch {
			// Directory doesn't exist, skip
		}
	}

	return sidebar;
};

// Split helpers for cognitive complexity reduction
const syncCortexDocs = async (
	displayName: string,
	_options: SyncOptions = { dryRun: false },
): Promise<SyncResult> => {
	const cortexSourcePath = join(ROOT_DIR, '.cortex', 'docs');
	const cortexTargetPath = join(DOCS_DIR, 'cortex');
	try {
		if (
			!(await fs
				.access(cortexSourcePath)
				.then(() => true)
				.catch(() => false))
		) {
			return {
				success: false,
				packageName: 'cortex-platform',
				fileCount: 0,
				error: 'No cortex docs',
			};
		}
		await ensureDir(cortexTargetPath);
		const entries = await fs.readdir(cortexSourcePath, { withFileTypes: true });
		let fileCount = 0;
		const mdxRe = /\.mdx?$/;
		for (const entry of entries) {
			if (!entry.isFile()) continue;
			if (!mdxRe.test(entry.name)) continue;
			const sourcePath = join(cortexSourcePath, entry.name);
			const targetPath = join(cortexTargetPath, entry.name);
			await processMarkdownFile(
				sourcePath,
				targetPath,
				entry.name,
				displayName,
			);
			fileCount++;
		}
		return { success: true, packageName: 'cortex-platform', fileCount };
	} catch (error) {
		return {
			success: false,
			packageName: 'cortex-platform',
			fileCount: 0,
			error: `Failed cortex sync: ${error}`,
		};
	}
};

const writeSidebar = async (): Promise<void> => {
	const sidebarConfig = await generateSidebarConfig();
	const sidebarContent = `import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';\n\n/**\n * Auto-generated sidebar configuration for Cortex-OS documentation\n * Generated by sync-docs.ts - do not edit manually\n */\nconst sidebars: SidebarsConfig = ${JSON.stringify(sidebarConfig, null, 2)};\n\nexport default sidebars;\n`;
	await fs.writeFile(join(WEBSITE_DIR, 'sidebars.ts'), sidebarContent);
};

const summarizeResults = async (
	results: SyncResult[],
	options: SyncOptions = { dryRun: false },
): Promise<void> => {
	const successful = results.filter((r) => r.success);
	const totalFiles = successful.reduce((sum, r) => sum + r.fileCount, 0);
	const stubCount = options.dryRun ? 0 : await ensureReferenceStubs();

	// Report sanitization stats if available
	const totalSanitizationReport = successful.reduce(
		(acc, r) => {
			if (!r.sanitizationReport) return acc;
			return {
				fencesRepaired:
					acc.fencesRepaired + r.sanitizationReport.fencesRepaired,
				genericsEscaped:
					acc.genericsEscaped + r.sanitizationReport.genericsEscaped,
				pseudoJsxEscaped:
					acc.pseudoJsxEscaped + r.sanitizationReport.pseudoJsxEscaped,
				htmlTagsEscaped:
					acc.htmlTagsEscaped + r.sanitizationReport.htmlTagsEscaped,
				spuriousFencesRepaired:
					acc.spuriousFencesRepaired +
					r.sanitizationReport.spuriousFencesRepaired,
				totalChanges: acc.totalChanges + r.sanitizationReport.totalChanges,
			};
		},
		{
			fencesRepaired: 0,
			genericsEscaped: 0,
			pseudoJsxEscaped: 0,
			htmlTagsEscaped: 0,
			spuriousFencesRepaired: 0,
			totalChanges: 0,
		},
	);

	if (options.dryRun) {
		info(
			`🔍 DRY-RUN: Would sync ${successful.length} packages/apps (${totalFiles} files)`,
		);
		if (totalSanitizationReport.totalChanges > 0) {
			info(
				`🧹 Sanitization would apply ${totalSanitizationReport.totalChanges} fixes:`,
			);
			if (totalSanitizationReport.fencesRepaired > 0)
				info(`  • ${totalSanitizationReport.fencesRepaired} fence repairs`);
			if (totalSanitizationReport.spuriousFencesRepaired > 0)
				info(
					`  • ${totalSanitizationReport.spuriousFencesRepaired} spurious fence repairs`,
				);
			if (totalSanitizationReport.genericsEscaped > 0)
				info(`  • ${totalSanitizationReport.genericsEscaped} generic escapes`);
			if (totalSanitizationReport.pseudoJsxEscaped > 0)
				info(
					`  • ${totalSanitizationReport.pseudoJsxEscaped} pseudo-JSX escapes`,
				);
			if (totalSanitizationReport.htmlTagsEscaped > 0)
				info(`  • ${totalSanitizationReport.htmlTagsEscaped} HTML tag escapes`);
		}
		info('📝 Would update sidebars.ts');
		info(`🧩 Would ensure reference stubs`);
	} else {
		info(`✅ Synced ${successful.length} packages/apps (${totalFiles} files)`);
		if (totalSanitizationReport.totalChanges > 0) {
			info(
				`🧹 Applied ${totalSanitizationReport.totalChanges} sanitization fixes`,
			);
		}
		info('📝 Updated sidebars.ts');
		info(`🧩 Reference stubs ensured (created ${stubCount})`);
	}
	info(
		options.dryRun ? '🔍 Dry-run complete!' : '🎉 Documentation sync complete!',
	);
};

const syncCategory = async (
	category: string,
	packages: Record<string, string>,
	results: SyncResult[],
	options: SyncOptions = { dryRun: false },
): Promise<void> => {
	for (const [packageName, displayName] of Object.entries(packages)) {
		if (category === '.cortex') {
			const cortexResult = await syncCortexDocs(displayName, options);
			results.push(cortexResult);
		} else {
			const result = await syncPackageDocs(
				category,
				packageName,
				displayName,
				options,
			);
			results.push(result);
			if (!result.success && !result.error?.includes('No docs found')) {
				console.warn(`⚠️  ${result.error}`);
			}
		}
	}
};

const syncAllDocs = async (
	options: SyncOptions = { dryRun: false },
): Promise<void> => {
	info('🚀 Starting Cortex-OS documentation sync...');
	if (!options.dryRun) {
		await Promise.all([
			ensureDir(join(DOCS_DIR, 'apps')),
			ensureDir(join(DOCS_DIR, 'packages')),
			ensureDir(join(DOCS_DIR, 'cortex')),
		]);
	}
	const results: SyncResult[] = [];
	for (const [category, packages] of Object.entries(DOCS_STRUCTURE)) {
		await syncCategory(category, packages, results, options);
	}
	if (!options.dryRun) {
		await writeSidebar();
	}
	await summarizeResults(results, options);
};

// Command-line interface
interface SyncOptions {
	readonly dryRun: boolean;
}

const parseArgs = (): SyncOptions => {
	const args = process.argv.slice(2);
	return {
		dryRun: args.includes('--check') || args.includes('--dry-run'),
	};
};

// ESM entry point
if (import.meta.url === `file://${__filename}`) {
	const options = parseArgs();
	if (options.dryRun) {
		info(
			'🔍 Running in dry-run mode (--check): will report would-be changes without writing',
		);
	}
	syncAllDocs(options).catch((error) => {
		console.error('❌ Sync failed:', error);
		process.exit(1);
	});
}

// Named exports only (Sept 2025 standard)
export {
	DOCS_STRUCTURE,
	ensureReferenceStubs,
	handleDocEntry,
	hasSlugCollision,
	normalizeReferenceLinks,
	sanitizeMdxContent,
	shouldSkipBaseFile,
	syncAllDocs,
};
