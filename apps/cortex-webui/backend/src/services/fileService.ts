// File service for Cortex WebUI backend

import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileUpload } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_DIR } from '../config/constants.js';

export const initializeUploadDirectory = async (): Promise<void> => {
	try {
		await fs.access(UPLOAD_DIR);
	} catch {
		// Directory doesn't exist, create it
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
	}
};

export const uploadFile = async (file: Express.Multer.File): Promise<FileUpload> => {
	// Ensure upload directory exists
	await initializeUploadDirectory();

	// Generate unique filename
	const fileId = uuidv4();
	const extension = path.extname(file.originalname);
	const filename = `${fileId}${extension}`;
	const filePath = path.join(UPLOAD_DIR, filename);

	// Move file to upload directory
	await fs.writeFile(filePath, file.buffer);

	// Create file record
	const fileUpload: FileUpload = {
		id: fileId,
		name: file.originalname,
		size: file.size,
		type: file.mimetype,
		url: `/uploads/${filename}`,
		uploadedAt: new Date().toISOString(),
	};

	return fileUpload;
};

export const deleteFile = async (id: string): Promise<void> => {
	// In a real implementation, we would:
	// 1. Find the file record in the database
	// 2. Delete the file from the filesystem
	// 3. Remove the record from the database

	// For now, we'll just simulate the process
	// Placeholder structured log (no-op for now)
	// When implementing persistence, replace with actual deletion logic.
	// Using info level to reflect a user-initiated deletion request.
	// Lazy import to avoid circular deps if any
	void import('../utils/logger').then(({ default: logger }) =>
		logger.info('file:delete_requested', { id }),
	);
};

export const getUploadPath = (filename: string): string => {
	return path.join(UPLOAD_DIR, filename);
};
