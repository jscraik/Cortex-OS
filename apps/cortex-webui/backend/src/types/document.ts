export interface DocumentParseResult {
    type: 'pdf' | 'text' | 'markdown' | 'image';
    text: string;
    fileName: string;
    fileSize: number;
    pages?: number;
    originalLength?: number;
    truncated?: boolean;
    base64?: string;
    metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        creator?: string;
        producer?: string;
        creationDate?: Date;
        modDate?: Date;
        encoding?: string;
        lines?: number;
        mimeType?: string;
        width?: number;
        height?: number;
    };
}

export interface DocumentUploadRequest {
    file: Express.Multer.File;
    maxSize?: number;
    supportedTypes?: string[];
}

export interface DocumentProcessingError {
    error: string;
    message?: string;
    supportedTypes?: string[];
}
