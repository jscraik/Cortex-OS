// File controller for Cortex WebUI backend

import type { RequestHandler, Response } from 'express';
import multer from 'multer';
import type { AuthRequest } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { FileService } from '../services/fileService.js';

// Configure multer for file uploads
const upload = multer({
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
	fileFilter: (_req, file, cb) => {
		// Allow common document types
		if (
			file.mimetype === 'text/plain' ||
			file.mimetype === 'application/pdf' ||
			file.mimetype === 'application/msword' ||
			file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			file.mimetype === 'application/json'
		) {
			cb(null, true);
		} else {
			cb(new Error('Unsupported file type'));
		}
	},
});

export const uploadMiddleware: RequestHandler = upload.single('file');

export async function uploadFileHandler(req: AuthRequest, res: Response): Promise<void> {
	try {
		if (!req.user) throw new HttpError(401, 'Unauthorized');
		if (!req.file) throw new HttpError(400, 'No file uploaded');
		const fileUpload = await FileService.uploadFile(req.file);
		res.status(201).json(fileUpload);
	} catch (error) {
		if (error instanceof HttpError) {
			res.status(error.statusCode).json({ error: error.message });
		} else if (error instanceof Error && error.message === 'Unsupported file type') {
			res.status(400).json({ error: 'Unsupported file type' });
		} else {
			res.status(500).json({ error: 'Internal server error' });
		}
	}
}

export async function deleteFileHandler(req: AuthRequest, res: Response): Promise<void> {
	try {
		if (!req.user) throw new HttpError(401, 'Unauthorized');
		const { id } = req.params;
		await FileService.deleteFile(id);
		res.json({ message: 'File deleted successfully' });
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
}
