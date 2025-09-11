/**
 * Text chunking utilities
 */

/**
 * Split text by character count with optional overlap
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Maximum characters per chunk
 * @param {number} overlap - Number of characters to overlap between chunks
 * @returns {string[]} Array of text chunks
 */
export function byChars(text, chunkSize = 300, overlap = 0) {
	if (!text || chunkSize <= 0) return [];

	const chunks = [];
	let start = 0;

	while (start < text.length) {
		const end = Math.min(start + chunkSize, text.length);
		chunks.push(text.slice(start, end));

		if (end >= text.length) break;
		start = end - overlap;
	}

	return chunks;
}

/**
 * Split text by sentences with maximum character limit
 * @param {string} text - Text to chunk
 * @param {number} maxChars - Maximum characters per chunk
 * @returns {string[]} Array of text chunks
 */
export function bySentences(text, maxChars = 300) {
	if (!text || maxChars <= 0) return [];

	const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
	const chunks = [];
	let currentChunk = '';

	for (const sentence of sentences) {
		const trimmed = sentence.trim();
		if (!trimmed) continue;

		if (currentChunk.length + trimmed.length + 1 > maxChars) {
			if (currentChunk) chunks.push(currentChunk.trim());
			currentChunk = trimmed;
		} else {
			currentChunk += (currentChunk ? ' ' : '') + trimmed;
		}
	}

	if (currentChunk.trim()) chunks.push(currentChunk.trim());
	return chunks;
}

export default { byChars, bySentences };
