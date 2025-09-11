// File service for Cortex WebUI backend

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getServerConfig } from '../config/config';
import type { FileUpload } from '../../../shared/types';

export class FileService {
  static async initializeUploadDirectory(uploadDir: string): Promise<void> {
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
  }

  static async uploadFile(file: Express.Multer.File): Promise<FileUpload> {
    const { uploadDir } = getServerConfig();

    // Ensure upload directory exists
    await FileService.initializeUploadDirectory(uploadDir);

    // Generate unique filename
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${fileId}${extension}`;
    const filePath = path.join(uploadDir, filename);

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
  }

  static async deleteFile(id: string): Promise<void> {
    // In a real implementation, we would:
    // 1. Find the file record in the database
    // 2. Delete the file from the filesystem
    // 3. Remove the record from the database

    // For now, we'll just simulate the process
    console.log(`Deleting file with ID: ${id}`);
  }

  static getUploadPath(filename: string): string {
    const { uploadDir } = getServerConfig();
    return path.join(uploadDir, filename);
  }
}
