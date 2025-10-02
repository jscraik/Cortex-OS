import type { Express, Request, Response } from 'express';
import multer from 'multer';
import { mkdirSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DocumentParseResult } from '../types/document.js';
import { pdfWithImagesService } from '../services/pdfWithImagesService.js';
import logger from '../utils/logger.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_TEXT_LENGTH = 50_000;

const DOCUMENT_UPLOAD_DIR = join(tmpdir(), 'cortex-webui', 'documents');
mkdirSync(DOCUMENT_UPLOAD_DIR, { recursive: true });

const sanitizeFilename = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, DOCUMENT_UPLOAD_DIR),
	filename: (_req, file, cb) => cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`),
});

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

		const allowedExtensions = ['.pdf', '.txt', '.md', '.markdown', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
		const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

		if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
			cb(null, true);
		} else {
			cb(null, false);
		}
	},
});

export async function parseDocument(req: Request, res: Response) {
	if (!req.file) {
		return res.status(400).json({ error: 'No file provided' });
	}

	const file = req.file;
	const filePath = (file as Express.Multer.File & { path?: string }).path;
	if (!filePath) {
		return res.status(500).json({ error: 'Temporary upload path unavailable' });
	}

	const fileSource = {
		path: filePath,
		size: file.size,
		mimeType: file.mimetype,
	};

	try {
		const result = await parseByType(fileSource, file.originalname, file.mimetype);
		return res.json(result);
	} catch (error) {
		logger.error('document:parse_failed', { error });
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const status =
			errorMessage.includes('Invalid PDF') || errorMessage.includes('Unsupported') ? 400 : 500;
		return res.status(status).json({ error: 'Document parsing failed', message: errorMessage });
	} finally {
		await fs.unlink(filePath).catch(() => undefined);
	}
}

async function parseByType(
	source: { path: string; size: number; mimeType: string },
	fileName: string,
	mimeType: string,
): Promise<DocumentParseResult> {
	if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
		return parsePdfDocument(source, fileName);
	}

	if (
		mimeType.startsWith('text/') ||
		fileName.toLowerCase().endsWith('.txt') ||
		fileName.toLowerCase().endsWith('.md') ||
		fileName.toLowerCase().endsWith('.markdown')
	) {
		return parseTextFile(source, fileName);
	}

	if (mimeType.startsWith('image/')) {
		return parseImageFile(source, fileName, mimeType);
	}

	throw new Error('Unsupported file type');
}

async function parsePdfDocument(
	source: { path: string; size: number },
	fileName: string,
): Promise<DocumentParseResult> {
	const pdfResult = await pdfWithImagesService.processPdfWithImages(source, fileName, {
		enableOCR: false,
		enableVisionAnalysis: false,
	});

	const rawText = pdfResult.pages.map((page) => page.text ?? '').join('\n\n');
	const truncated = rawText.length > MAX_TEXT_LENGTH;
	const text = truncated
		? `${rawText.slice(0, MAX_TEXT_LENGTH)}\n\n[Content truncated due to length]`
		: rawText;

	return {
		type: 'pdf',
		text,
		fileName,
		fileSize: source.size,
		pages: pdfResult.pages.length,
		originalLength: rawText.length,
		truncated,
		metadata: {
			title: pdfResult.metadata.title,
			author: pdfResult.metadata.author,
			subject: pdfResult.metadata.subject,
			creator: pdfResult.metadata.creator,
			producer: pdfResult.metadata.producer,
			creationDate: pdfResult.metadata.creationDate,
			modDate: pdfResult.metadata.modificationDate,
		},
	};
}

async function parseTextFile(
	source: { path: string; size: number },
	fileName: string,
): Promise<DocumentParseResult> {
	const buffer = await fs.readFile(source.path, 'utf-8');
	let text = buffer.toString();
	const originalLength = text.length;

	if (text.length > MAX_TEXT_LENGTH) {
		text = `${text.slice(0, MAX_TEXT_LENGTH)}\n\n[Content truncated due to length]`;
	}

	const fileType =
		fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown') ? 'markdown' : 'text';

	return {
		type: fileType,
		text,
		fileName,
		fileSize: source.size,
		originalLength,
		truncated: originalLength > MAX_TEXT_LENGTH,
		metadata: {
			encoding: 'utf-8',
			lines: text.split('\n').length,
		},
	};
}

async function parseImageFile(
	source: { path: string; size: number },
	fileName: string,
	mimeType: string,
): Promise<DocumentParseResult> {
	const base64 = await fileToBase64(source.path);

	return {
		type: 'image',
		text: `[Image: ${fileName}]`,
		fileName,
		fileSize: source.size,
		base64: `data:${mimeType};base64,${base64}`,
		metadata: {
			mimeType,
		},
	};
}

async function fileToBase64(path: string): Promise<string> {
	const data = await fs.readFile(path);
	return data.toString('base64');
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
