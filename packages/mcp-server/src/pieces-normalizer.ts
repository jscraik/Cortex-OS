import { createHash } from 'node:crypto';

export type NormalizedPiecesResult = {
	content: string;
	id: string;
	metadata?: Record<string, unknown>;
	score: number;
	source: 'pieces-ltm';
};

const coerceToArray = (value: unknown): unknown[] => {
	if (Array.isArray(value)) {
		return value;
	}

	if (value && typeof value === 'object') {
		const maybeArray =
			(value as Record<string, unknown>).results ??
			(value as Record<string, unknown>).items ??
			(value as Record<string, unknown>).memories;
		if (Array.isArray(maybeArray)) {
			return maybeArray;
		}
	}

	return value ? [value] : [];
};

const serializeContent = (value: unknown): string => {
	if (typeof value === 'string') {
		return value;
	}

	return JSON.stringify(value, null, 2);
};

const deriveIdentifier = (value: unknown): string => {
	const digest = createHash('sha1').update(serializeContent(value)).digest('hex');
	return `pieces-${digest.slice(0, 16)}`;
};

export const normalizePiecesResults = (response: unknown): NormalizedPiecesResult[] => {
	const entries = coerceToArray(response);

	return entries
		.map((entry) => {
			if (!entry) {
				return null;
			}

			if (typeof entry === 'object' && entry !== null) {
				const candidate = entry as Record<string, unknown>;
				const id =
					typeof candidate.id === 'string' && candidate.id.trim().length > 0
						? candidate.id.trim()
						: deriveIdentifier(entry);
				const score = typeof candidate.score === 'number' ? candidate.score : 0.8;
				const content = serializeContent(
					candidate.content ?? candidate.text ?? candidate.data ?? entry,
				);
				return {
					content,
					id,
					metadata:
						typeof candidate.metadata === 'object' && candidate.metadata !== null
							? (candidate.metadata as Record<string, unknown>)
							: undefined,
					score,
					source: 'pieces-ltm' as const,
				};
			}

			return {
				content: serializeContent(entry),
				id: deriveIdentifier(entry),
				score: 0.8,
				source: 'pieces-ltm' as const,
			};
		})
		.filter((entry): entry is NormalizedPiecesResult => entry !== null);
};
