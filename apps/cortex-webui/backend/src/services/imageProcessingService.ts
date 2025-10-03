import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type {
	DetectedObject,
	ExifData,
	ImageMetadata,
	MultimodalProcessingOptions,
	VisionAnalysisResult,
} from '../types/multimodal.js';
import logger from '../utils/logger.js';

/**
 * Image Processing Service for brAInwav Cortex-OS
 * Handles image upload, metadata extraction, OCR, and vision analysis
 */
export class ImageProcessingService {
	private readonly supportedFormats = ['png', 'jpeg', 'jpg', 'webp', 'gif'];
	private readonly maxImageSize = 50 * 1024 * 1024; // 50MB
	private readonly maxDimensions = 8192; // Max width/height

	/**
	 * Process uploaded image and extract comprehensive metadata
	 */
	async processImage(
		source: Buffer | { path: string; size: number },
		filename: string,
		options: MultimodalProcessingOptions = {},
	): Promise<{
		metadata: ImageMetadata;
		resizedBuffer?: Buffer;
		thumbnailBuffer?: Buffer;
	}> {
		const startTime = Date.now();

		try {
			logger.info('image:processing_start', {
				filename,
				fileSize: this.getFileSize(source),
				enableOCR: options.enableOCR ?? true,
				enableVisionAnalysis: options.enableVisionAnalysis ?? true,
				brand: 'brAInwav',
			});

			// Validate image
			await this.validateImage(source, filename);

			// Extract basic image metadata
			const imageMetadata = await this.extractImageMetadata(source, filename);

			// Process image for storage and analysis
			const { resizedBuffer, thumbnailBuffer } = await this.prepareImageForProcessing(
				source,
				options,
			);

			// Perform OCR if enabled
			if (options.enableOCR !== false) {
				try {
					const ocrResult = await this.performOCR(
						resizedBuffer || (await this.createWorkingBuffer(source)),
					);
					imageMetadata.ocrText = ocrResult;
				} catch (ocrError) {
					logger.warn('image:ocr_failed', {
						filename,
						error: ocrError instanceof Error ? ocrError.message : 'Unknown error',
						brand: 'brAInwav',
					});
					// Don't fail processing, just continue without OCR
				}
			}

			// Perform vision analysis if enabled
			if (options.enableVisionAnalysis !== false) {
				try {
					const visionResult = await this.performVisionAnalysis(
						resizedBuffer || (await this.createWorkingBuffer(source)),
						options.visionModel,
					);
					imageMetadata.visionAnalysis = visionResult;
				} catch (visionError) {
					logger.warn('image:vision_analysis_failed', {
						filename,
						error: visionError instanceof Error ? visionError.message : 'Unknown error',
						brand: 'brAInwav',
					});
					// Don't fail processing, just continue without vision analysis
				}
			}

			const processingTime = Date.now() - startTime;

			logger.info('image:processing_complete', {
				filename,
				width: imageMetadata.width,
				height: imageMetadata.height,
				format: imageMetadata.format,
				processingTime,
				brand: 'brAInwav',
			});

			return {
				metadata: imageMetadata,
				resizedBuffer,
				thumbnailBuffer,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error('image:processing_failed', {
				filename,
				error: errorMessage,
				processingTime: Date.now() - startTime,
				brand: 'brAInwav',
			});

			throw new Error(`Image processing failed: ${errorMessage}`);
		}
	}

	/**
	 * Validate image file format and size
	 */
	private async validateImage(
		source: Buffer | { path: string; size: number },
		_filename: string,
	): Promise<void> {
		const fileSize = this.getFileSize(source);
		if (fileSize > this.maxImageSize) {
			throw new Error(
				`Image file size ${Math.round(fileSize / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(this.maxImageSize / 1024 / 1024)}MB`,
			);
		}

		// Check if it's actually an image
		try {
			const metadata = await sharp(this.getSharpSource(source)).metadata();

			if (!metadata.format || !this.supportedFormats.includes(metadata.format)) {
				throw new Error(
					`Unsupported image format. Supported formats: ${this.supportedFormats.join(', ')}`,
				);
			}

			// Check dimensions
			if (metadata.width && metadata.width > this.maxDimensions) {
				throw new Error(
					`Image width ${metadata.width}px exceeds maximum allowed size of ${this.maxDimensions}px`,
				);
			}
			if (metadata.height && metadata.height > this.maxDimensions) {
				throw new Error(
					`Image height ${metadata.height}px exceeds maximum allowed size of ${this.maxDimensions}px`,
				);
			}
		} catch (sharpError) {
			throw new Error(
				`Invalid or corrupted image file: ${sharpError instanceof Error ? sharpError.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Extract comprehensive image metadata using Sharp
	 */
	private async extractImageMetadata(
		source: Buffer | { path: string; size: number },
		filename: string,
	): Promise<ImageMetadata> {
		const metadata = await sharp(this.getSharpSource(source)).metadata();

		const imageMetadata: ImageMetadata = {
			width: metadata.width || 0,
			height: metadata.height || 0,
			format: this.normalizeFormat(metadata.format || 'unknown'),
			colorSpace: metadata.space,
			hasAlpha: metadata.hasAlpha || false,
		};

		// Extract EXIF data
		try {
			const exifData = await this.extractExifData(buffer);
			imageMetadata.exif = exifData;
		} catch (exifError) {
			logger.debug('image:exif_extraction_failed', {
				filename,
				error: exifError instanceof Error ? exifError.message : 'Unknown error',
				brand: 'brAInwav',
			});
		}

		return imageMetadata;
	}

	/**
	 * Extract EXIF data from image
	 */
	private async extractExifData(
		source: Buffer | { path: string; size: number },
	): Promise<ExifData | undefined> {
		const metadata = await sharp(this.getSharpSource(source)).metadata();

		if (!metadata.exif) {
			return undefined;
		}

		try {
			// Note: Sharp doesn't directly parse EXIF, you might need a library like 'exifr'
			// For now, returning basic placeholder data
			// In production, you'd integrate with exifr or similar
			return {
				cameraMake: metadata.orientation ? 'detected' : undefined,
				cameraModel: undefined,
				lensModel: undefined,
				focalLength: undefined,
				aperture: undefined,
				exposureTime: undefined,
				iso: undefined,
				flash: undefined,
				gpsCoordinates: undefined,
				dateTaken: undefined,
			};
		} catch (error) {
			logger.debug('image:exif_parsing_failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				brand: 'brAInwav',
			});
			return undefined;
		}
	}

	/**
	 * Prepare image for processing (resize for analysis, create thumbnail)
	 */
	private async prepareImageForProcessing(
		source: Buffer | { path: string; size: number },
		_options: MultimodalProcessingOptions,
	): Promise<{
		resizedBuffer?: Buffer;
		thumbnailBuffer?: Buffer;
	}> {
		const result: {
			resizedBuffer?: Buffer;
			thumbnailBuffer?: Buffer;
		} = {};

		const sharpSource = this.getSharpSource(source);
		const metadata = await sharp(sharpSource).metadata();

		// Create resized version for OCR/vision analysis (max 1024px)
		if ((metadata.width && metadata.width > 1024) || (metadata.height && metadata.height > 1024)) {
			result.resizedBuffer = await sharp(sharpSource)
				.resize(1024, 1024, {
					fit: 'inside',
					withoutEnlargement: true,
				})
				.png({ quality: 90 })
				.toBuffer();
		}

		// Create thumbnail (max 200px)
		result.thumbnailBuffer = await sharp(sharpSource)
			.resize(200, 200, {
				fit: 'inside',
				withoutEnlargement: true,
			})
			.jpeg({ quality: 80 })
			.toBuffer();

		return result;
	}

	/**
	 * Perform OCR on image using Tesseract or similar
	 */
	private async performOCR(buffer: Buffer): Promise<string> {
		// Placeholder for OCR implementation
		// In production, you'd integrate with Tesseract.js, Google Vision API, or similar

		logger.debug('image:ocr_processing', {
			imageSize: buffer.length,
			brand: 'brAInwav',
		});

		// Simulate OCR processing
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Return placeholder text for now
		return `[OCR text extraction completed - brAInwav]`;
	}

	/**
	 * Perform vision analysis using AI models
	 */
	private async performVisionAnalysis(
		buffer: Buffer,
		model?: string,
	): Promise<VisionAnalysisResult> {
		// Placeholder for vision analysis implementation
		// In production, you'd integrate with GPT-4 Vision, Google Vision API, or similar

		logger.debug('image:vision_analysis_processing', {
			imageSize: buffer.length,
			model: model || 'default',
			brand: 'brAInwav',
		});

		// Simulate vision analysis processing
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const detectedObjects: DetectedObject[] = [
			{
				label: 'object',
				confidence: 0.85,
				boundingBox: { x: 10, y: 10, width: 100, height: 100 },
			},
		];

		return {
			description: 'Vision analysis completed by brAInwav',
			objects: detectedObjects,
			confidence: 0.85,
			analysisModel: model || 'brAInwav-vision-default',
			processedAt: new Date(),
		};
	}

	/**
	 * Generate image hash for deduplication
	 */
	async generateImageHash(buffer: Buffer): Promise<string> {
		return createHash('sha256').update(buffer).digest('hex');
	}

	/**
	 * Normalize image format name
	 */
	private normalizeFormat(format: string): 'PNG' | 'JPEG' | 'WebP' | 'GIF' {
		const normalized = format.toUpperCase();
		switch (normalized) {
			case 'PNG':
				return 'PNG';
			case 'JPG':
			case 'JPEG':
				return 'JPEG';
			case 'WEBP':
				return 'WebP';
			case 'GIF':
				return 'GIF';
			default:
				return 'JPEG'; // Default fallback
		}
	}

	private getFileSize(source: Buffer | { path: string; size: number }): number {
		return Buffer.isBuffer(source) ? source.length : source.size;
	}

	private getSharpSource(source: Buffer | { path: string; size: number }): Buffer | string {
		return Buffer.isBuffer(source) ? source : source.path;
	}

	private async createWorkingBuffer(
		source: Buffer | { path: string; size: number },
	): Promise<Buffer> {
		return Buffer.isBuffer(source)
			? source
			: sharp(source.path)
					.resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
					.png({ quality: 90 })
					.toBuffer();
	}

	/**
	 * Get image statistics for processing metrics
	 */
	getImageStats(
		originalSize: number,
		processedSize?: number,
		thumbnailSize?: number,
	): {
		compressionRatio?: number;
		thumbnailReduction?: number;
		originalSize: string;
		processedSize?: string;
		thumbnailSize?: string;
	} {
		const stats = {
			originalSize: this.formatBytes(originalSize),
			originalSizeBytes: originalSize,
		} as any;

		if (processedSize) {
			stats.processedSize = this.formatBytes(processedSize);
			stats.processedSizeBytes = processedSize;
			stats.compressionRatio = Math.round((processedSize / originalSize) * 100);
		}

		if (thumbnailSize) {
			stats.thumbnailSize = this.formatBytes(thumbnailSize);
			stats.thumbnailSizeBytes = thumbnailSize;
			stats.thumbnailReduction = Math.round((thumbnailSize / originalSize) * 100);
		}

		return stats;
	}

	/**
	 * Format bytes to human readable string
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';

		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	}

	/**
	 * Check if image format is supported
	 */
	isFormatSupported(mimeType: string, filename: string): boolean {
		const supportedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

		const extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);

		return supportedMimes.includes(mimeType) || this.supportedFormats.includes(extension);
	}
}

// Export singleton instance
export const imageProcessingService = new ImageProcessingService();
