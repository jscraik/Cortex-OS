import type { CbomDocument } from '@cortex-os/cbom';
import Ajv from 'ajv';
import { useCallback, useRef, useState } from 'react';
import schema from '../../../../schemas/cbom.schema.json' with { type: 'json' };

const ajv = new Ajv({ strict: true, allErrors: true });
const schemaDefinition = schema as unknown;
const validate = ajv.compile(schemaDefinition);

interface HookState {
	document: CbomDocument | null;
	error: string | null;
	openFile: () => void;
}

export function useCbomFile(): HookState {
	const [cbomDocument, setDocument] = useState<CbomDocument | null>(null);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const ensureInput = useCallback(() => {
		if (!inputRef.current) {
			const input = window.document.createElement('input');
			input.type = 'file';
			input.accept = 'application/json';
			input.setAttribute('aria-label', 'Select CBOM JSON file');
			inputRef.current = input;
		}
		return inputRef.current;
	}, []);

	const handleFile = useCallback(async () => {
		const input = inputRef.current;
		const file = input?.files?.[0];
		if (!file) {
			return;
		}
		try {
			const raw = await file.text();
			const parsed = JSON.parse(raw);
			if (!validate(parsed)) {
				setError('Selected file is not a valid CBOM document.');
				setDocument(null);
				return;
			}
			setDocument(parsed);
			setError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : 'Unable to read file');
			setDocument(null);
		} finally {
			if (input) {
				input.value = '';
			}
		}
	}, []);

	const openFile = useCallback(() => {
		const input = ensureInput();
		input.onchange = handleFile;
		input.click();
	}, [ensureInput, handleFile]);

	return { document: cbomDocument, error, openFile };
}
