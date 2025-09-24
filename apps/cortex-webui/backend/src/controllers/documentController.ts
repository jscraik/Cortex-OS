import type { Request, Response } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import type { DocumentParseResult } from '../types/document.js';
import logger from '../utils/logger.js';

// File size limits (50MB for documents)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_TEXT_LENGTH = 50000;

// Multer configuration for document uploads
const storage = multer.memoryStorage();
export const documentUploadMiddleware = multer({
	storage,
	limits: {
		fileSize: MAX_FILE_SIZE,
	},
	fileFilter: (_req, file, cb) => {
		const allowedMimes = [
			'application/pdf',
			'text/plain',
			'text/markdown',
			'image/jpeg',
			'image/png',
			'image/gif',
			'image/webp',
		];

		const allowedExtensions = [
			'.pdf',
			'.txt',
			'.md',
			'.markdown',
			'.jpg',
			'.jpeg',
			'.png',
			'.gif',
			'.webp',
		];
		const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

		if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
			cb(null, true);
		} else {
			cb(null, false);
		}
	},
});

export async function parseDocument(req: Request, res: Response) {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file provided' });
		}
		const file = req.file;
		const fileName = file.originalname;
		const mimeType = file.mimetype;
		const buffer = file.buffer;
		let result: DocumentParseResult;
		if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
			result = await parsePDF(buffer, fileName);
		} else if (
			mimeType.startsWith('text/') ||
			fileName.toLowerCase().endsWith('.txt') ||
			fileName.toLowerCase().endsWith('.md') ||
			fileName.toLowerCase().endsWith('.markdown')
		) {
			result = await parseTextFile(buffer, fileName);
		} else if (mimeType.startsWith('image/')) {
			result = await parseImageFile(buffer, fileName);
		} else {
			try {
				result = await parseTextFile(buffer, fileName);
			} catch {
				return res.status(400).json({
					error: 'Unsupported file type',
					supportedTypes: ['PDF', 'TXT', 'MD', 'Images (JPG, PNG, GIF, WebP)'],
				});
			}
		}
		return res.json(result);
	} catch (error) {
		logger.error('document:parse_failed', { error });
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const status =
			errorMessage.includes('Invalid PDF') || errorMessage.includes('Unsupported') ? 400 : 500;
		return res.status(status).json({ error: 'Document parsing failed', message: errorMessage });
	}
}

export async function getSupportedTypes(_req: Request, res: Response) {
	const supportedTypes = {
		documents: ['PDF', 'TXT', 'MD', 'Markdown'],
		images: ['JPEG', 'PNG', 'GIF', 'WebP'],
		maxFileSize: '50MB',
		maxPages: MAX_PAGES,
		maxTextLength: MAX_TEXT_LENGTH,
	};
	return res.json(supportedTypes);
}

/**
 * Parse PDF document
 */
async function parsePDF(buffer: Buffer, fileName: string): Promise<DocumentParseResult> {
	try {
		const data = await pdf(buffer);

		// Narrow pdf-parse info type (library doesn't export a detailed TS interface for all optional fields)
		// Keep optional so absence of metadata doesn't cause runtime errors
		interface PdfDocumentInfo {
			Title?: string;
			Author?: string;
			Subject?: string;
			Creator?: string;
			Producer?: string;
			CreationDate?: string;
			ModDate?: string;
		}
		const info: PdfDocumentInfo | undefined = (data as { info?: PdfDocumentInfo }).info;

		// Check page limit
		if (data.numpages > MAX_PAGES) {
			throw new Error(`PDF has ${data.numpages} pages, maximum allowed is ${MAX_PAGES}`);
		}

		let text = data.text || '';

		// Truncate if too long
		const originalLength = text.length;
		if (text.length > MAX_TEXT_LENGTH) {
			text = `${text.slice(0, MAX_TEXT_LENGTH)}\n\n[Content truncated due to length]`;
		}

		return {
			type: 'pdf',
			text,
			fileName,
			fileSize: buffer.length,
			pages: data.numpages,
			originalLength,
			truncated: originalLength > MAX_TEXT_LENGTH,
			metadata: {
				title: info?.Title,
				author: info?.Author,
				subject: info?.Subject,
				creator: info?.Creator,
				producer: info?.Producer,
				creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
				modDate: info?.ModDate ? new Date(info.ModDate) : undefined,
			},
		};
	} catch (error) {
		throw new Error(
			`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Parse text file (TXT, MD, Markdown)
 */
async function parseTextFile(buffer: Buffer, fileName: string): Promise<DocumentParseResult> {
	try {
		let text = buffer.toString('utf-8');
		const originalLength = text.length;

		// Truncate if too long
		if (text.length > MAX_TEXT_LENGTH) {
			text = `${text.slice(0, MAX_TEXT_LENGTH)}\n\n[Content truncated due to length]`;
		}

		const fileType =
			fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown')
				? 'markdown'
				: 'text';

		return {
			type: fileType,
			text,
			fileName,
			fileSize: buffer.length,
			originalLength,
			truncated: originalLength > MAX_TEXT_LENGTH,
			metadata: {
				encoding: 'utf-8',
				lines: text.split('\n').length,
			},
		};
	} catch (error) {
		throw new Error(
			`Text file parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Parse image file (for vision models)
 */
async function parseImageFile(buffer: Buffer, fileName: string): Promise<DocumentParseResult> {
	try {
		// Convert to base64 for vision models
		const base64 = buffer.toString('base64');
		const mimeType = getMimeTypeFromFileName(fileName);

		return {
			type: 'image',
			text: `[Image: ${fileName}]`,
			fileName,
			fileSize: buffer.length,
			base64: `data:${mimeType};base64,${base64}`,
			metadata: {
				mimeType,
				width: undefined, // Could be extracted with image libraries if needed
				height: undefined,
			},
		};
	} catch (error) {
		throw new Error(
			`Image parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromFileName(fileName: string): string {
	const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
	const mimeTypes: Record<string, string> = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
	};

	return mimeTypes[extension] || 'application/octet-stream';
}
