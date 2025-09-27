// Optional Tree-sitter backed boundary provider. Falls back if not available.
export type TsBoundary = { start: number };

export type TsProvider = {
	findBoundaries(
		source: string,
		language: 'js' | 'ts' | 'python' | 'go' | 'java' | 'csharp' | 'any',
	): TsBoundary[];
};

type WTS = {
	init: () => Promise<void>;
	Language: { load: (path: string) => Promise<unknown> };
	Parser: new () => WTSParser;
};

type WTSNode = {
	type: string;
	startIndex: number;
	namedChildren?: WTSNode[];
	children?: WTSNode[];
};

type WTSParser = {
	setLanguage: (lang: unknown) => void;
	parse: (source: string) => { rootNode: WTSNode };
};

type GrammarMap = Partial<Record<'ts' | 'js' | 'python' | 'go' | 'java' | 'csharp', unknown>>;

export async function createTreeSitterProvider(): Promise<TsProvider | null> {
	const enabled =
		process.env.CORTEX_TS_BOUNDARIES === '1' || process.env.CORTEX_TS_BOUNDARIES === 'true';
	if (!enabled) return null;
	const TS = await initWTS();
	if (!TS) return null;
	const grammars = await loadAllGrammars(TS);
	if (!TS.Parser) return null;
	const parser = new TS.Parser();
	const findBoundaries = makeBoundaryFinder(parser, grammars);
	return { findBoundaries };
}

async function initWTS(): Promise<WTS | null> {
	try {
		const ts = await import('web-tree-sitter');
		const TS = (ts as unknown as { default: WTS }).default;
		if (TS && typeof TS.init === 'function') await TS.init();
		return TS;
	} catch {
		return null;
	}
}

async function loadAllGrammars(TS: WTS): Promise<GrammarMap> {
	const grammars: GrammarMap = {};
	const TS_TS = process.env.CORTEX_TS_GRAMMAR_TS ?? '@tree-sitter/typescript.wasm';
	const TS_TS_FB =
		process.env.CORTEX_TS_GRAMMAR_TS_FB ??
		'@tree-sitter/typescript/wasm/tree-sitter-typescript.wasm';
	const TS_JS = process.env.CORTEX_TS_GRAMMAR_JS ?? '@tree-sitter/javascript.wasm';
	const TS_JS_FB =
		process.env.CORTEX_TS_GRAMMAR_JS_FB ??
		'@tree-sitter/javascript/wasm/tree-sitter-javascript.wasm';
	const TS_PY = process.env.CORTEX_TS_GRAMMAR_PY ?? '@tree-sitter/python.wasm';
	const TS_PY_FB =
		process.env.CORTEX_TS_GRAMMAR_PY_FB ?? '@tree-sitter/python/wasm/tree-sitter-python.wasm';
	const TS_GO = process.env.CORTEX_TS_GRAMMAR_GO ?? '@tree-sitter/go.wasm';
	const TS_GO_FB =
		process.env.CORTEX_TS_GRAMMAR_GO_FB ?? '@tree-sitter/go/wasm/tree-sitter-go.wasm';
	const TS_JAVA = process.env.CORTEX_TS_GRAMMAR_JAVA ?? '@tree-sitter/java.wasm';
	const TS_JAVA_FB =
		process.env.CORTEX_TS_GRAMMAR_JAVA_FB ?? '@tree-sitter/java/wasm/tree-sitter-java.wasm';
	const TS_CSHARP = process.env.CORTEX_TS_GRAMMAR_CSHARP ?? '@tree-sitter/c-sharp.wasm';
	const TS_CSHARP_FB =
		process.env.CORTEX_TS_GRAMMAR_CSHARP_FB ?? '@tree-sitter/c-sharp/wasm/tree-sitter-c-sharp.wasm';

	try {
		grammars.ts = await dynamicLoadGrammar(TS, TS_TS, TS_TS_FB);
	} catch {
		/* no-op */
	}
	try {
		grammars.js = await dynamicLoadGrammar(TS, TS_JS, TS_JS_FB);
	} catch {
		/* no-op */
	}
	try {
		grammars.python = await dynamicLoadGrammar(TS, TS_PY, TS_PY_FB);
	} catch {
		/* no-op */
	}
	try {
		grammars.go = await dynamicLoadGrammar(TS, TS_GO, TS_GO_FB);
	} catch {
		/* no-op */
	}
	try {
		grammars.java = await dynamicLoadGrammar(TS, TS_JAVA, TS_JAVA_FB);
	} catch {
		/* no-op */
	}
	try {
		grammars.csharp = await dynamicLoadGrammar(TS, TS_CSHARP, TS_CSHARP_FB);
	} catch {
		/* no-op */
	}
	return grammars;
}

function makeBoundaryFinder(parser: WTSParser, grammars: GrammarMap) {
	const toLang = (l: 'js' | 'ts' | 'python' | 'go' | 'java' | 'csharp' | 'any') => {
		if (l === 'ts') return grammars.ts ?? grammars.js ?? null;
		if (l === 'js') return grammars.js ?? null;
		if (l === 'python') return grammars.python ?? null;
		if (l === 'go') return grammars.go ?? null;
		if (l === 'java') return grammars.java ?? null;
		if (l === 'csharp') return grammars.csharp ?? null;
		return (
			grammars.ts ??
			grammars.js ??
			grammars.python ??
			grammars.go ??
			grammars.java ??
			grammars.csharp ??
			null
		);
	};
	return (
		source: string,
		language: 'js' | 'ts' | 'python' | 'go' | 'java' | 'csharp' | 'any',
	): TsBoundary[] => {
		const lang = toLang(language);
		if (!lang) return [];
		try {
			parser.setLanguage(lang);
			const tree = parser.parse(source);
			return collectFunctionLikeStarts(tree.rootNode);
		} catch {
			return [];
		}
	};
}

function collectFunctionLikeStarts(root: WTSNode): TsBoundary[] {
	const out: TsBoundary[] = [];
	const visit = (n: WTSNode) => {
		if (!n) return;
		const type = String(n.type || '');
		if (isFunctionLike(type) || isClassLike(type)) {
			out.push({ start: n.startIndex ?? 0 });
		}
		const children = n.namedChildren || n.children || [];
		for (const c of children) visit(c);
	};
	visit(root);
	return out;
}

function isFunctionLike(t: string): boolean {
	return (
		t.includes('function') ||
		t === 'method_definition' ||
		t === 'function_definition' ||
		t === 'function_declaration' ||
		t === 'method_declaration' ||
		t === 'func_literal' ||
		t === 'func_decl'
	);
}

function isClassLike(t: string): boolean {
	return t.includes('class') || t === 'class_definition' || t === 'type_spec';
}

async function dynamicLoadGrammar(TS: WTS, primary: string, fallback?: string): Promise<unknown> {
	try {
		// Prefer direct path; caller ensures availability
		const lang = await TS.Language.load(primary);
		return lang;
	} catch {
		if (!fallback) throw new Error('grammar not found');
		try {
			const lang = await TS.Language.load(fallback);
			return lang;
		} catch {
			throw new Error('grammar not found');
		}
	}
}
