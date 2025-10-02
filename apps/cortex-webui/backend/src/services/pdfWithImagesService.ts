import { createHash, randomUUID } from 'node:crypto';
import pdf from 'pdf-parse';
import sharp from 'sharp';
import type {
	ExtractedImage,
	ImageBlock,
	LayoutInfo,
	MultimodalProcessingOptions,
	PdfPage,
	PdfWithImagesMetadata,
	TextBlock,
} from '../types/multimodal.js';
import logger from '../utils/logger.js';

/**
 * PDF with Images Processing Service for brAInwav Cortex-OS
 * Handles PDF parsing with image extraction, layout preservation, and combined indexing
 */
export class PdfWithImagesService {
	private readonly maxFileSize = 200 * 1024 * 1024; // 200MB
	private readonly maxPages = 200;
	private readonly maxImages = 500;

	/**
	 * Process PDF file with enhanced image extraction and layout preservation
	 */
	async processPdfWithImages(
		buffer: Buffer,
		filename: string,
		options: MultimodalProcessingOptions = {},
	): Promise<{
		metadata: PdfWithImagesMetadata;
		pages: PdfPage[];
		extractedImages: ExtractedImage[];
	}> {
		const startTime = Date.now();

		try {
			logger.info('pdf_with_images:processing_start', {
				filename,
				fileSize: buffer.length,
				enableOCR: options.enableOCR ?? true,
				enableVisionAnalysis: options.enableVisionAnalysis ?? true,
				brand: 'brAInwav',
			});

			// Validate PDF file
			await this.validatePdfFile(buffer, filename);

			// Parse PDF content
			const pdfData = await pdf(buffer);

			// Extract pages with layout information
			const { pages, extractedImages } = await this.extractPagesWithImages(
				buffer,
				pdfData,
				options,
			);

			// Create metadata
			const metadata = await this.createPdfWithImagesMetadata(pdfData, pages, extractedImages);

			const processingTime = Date.now() - startTime;

			logger.info('pdf_with_images:processing_complete', {
				filename,
				pagesProcessed: pages.length,
				imagesExtracted: extractedImages.length,
				totalText: metadata.totalText,
				layoutPreserved: metadata.layoutPreserved,
				processingTime,
				brand: 'brAInwav',
			});

			return {
				metadata,
				pages,
				extractedImages,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error('pdf_with_images:processing_failed', {
				filename,
				error: errorMessage,
				processingTime: Date.now() - startTime,
				brand: 'brAInwav',
			});

			throw new Error(`PDF with images processing failed: ${errorMessage}`);
		}
	}

	/**
	 * Validate PDF file format and size
	 */
	private async validatePdfFile(buffer: Buffer, filename: string): Promise<void> {
		// Check file size
		if (buffer.length > this.maxFileSize) {
			throw new Error(
				`PDF file size ${Math.round(buffer.length / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(this.maxFileSize / 1024 / 1024)}MB`,
			);
		}

		// Check file extension
		const extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
		if (extension !== 'pdf') {
			throw new Error('Invalid file extension. Expected .pdf file');
		}

		// Validate PDF format
		try {
			const pdfData = await pdf(buffer);

			// Check page limit
			if (pdfData.numpages > this.maxPages) {
				throw new Error(`PDF has ${pdfData.numpages} pages, maximum allowed is ${this.maxPages}`);
			}
		} catch (pdfError) {
			throw new Error(
				`Invalid or corrupted PDF file: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Extract pages with layout information and images
	 */
	private async extractPagesWithImages(
		buffer: Buffer,
		pdfData: any,
		options: MultimodalProcessingOptions,
	): Promise<{
		pages: PdfPage[];
		extractedImages: ExtractedImage[];
	}> {
		const pages: PdfPage[] = [];
		const extractedImages: ExtractedImage[] = [];

		// Split text by pages (rough approximation)
		const pageTexts = this.splitTextIntoPages(pdfData.text || '', pdfData.numpages);

		for (let pageNum = 1; pageNum <= pdfData.numpages; pageNum++) {
			const pageText = pageTexts[pageNum - 1] || '';

			// Extract images from this page
			const pageImages = await this.extractImagesFromPage(buffer, pageNum, options);

			// Create layout information
			const layout = this.createLayoutInfo(pageText, pageImages);

			// Create page object
			const page: PdfPage = {
				pageNumber: pageNum,
				text: pageText || undefined,
				images: pageImages,
				layout,
			};

			pages.push(page);
			extractedImages.push(...pageImages);

			// Check image limit
			if (extractedImages.length > this.maxImages) {
				logger.warn('pdf_with_images:too_many_images', {
					imageCount: extractedImages.length,
					maxImages: this.maxImages,
					brand: 'brAInwav',
				});
				break;
			}
		}

		return { pages, extractedImages };
	}

	/**
	 * Split PDF text into pages (rough approximation)
	 */
	private splitTextIntoPages(text: string, totalPages: number): string[] {
		if (!text) {
			return Array(totalPages).fill('');
		}

		// Simple split by page breaks if they exist
		const pageBreaks = text.split(/\f|\n{3,}/);

		if (pageBreaks.length >= totalPages) {
			return pageBreaks.slice(0, totalPages);
		}

		// If no clear page breaks, split evenly
		const charsPerPage = Math.ceil(text.length / totalPages);
		const pages: string[] = [];

		for (let i = 0; i < totalPages; i++) {
			const start = i * charsPerPage;
			const end = Math.min(start + charsPerPage, text.length);
			pages.push(text.substring(start, end).trim());
		}

		return pages;
	}

	/**
	 * Extract images from a specific PDF page
	 */
	private async extractImagesFromPage(
		buffer: Buffer,
		pageNumber: number,
		options: MultimodalProcessingOptions,
	): Promise<ExtractedImage[]> {
		// Placeholder implementation for image extraction from PDF
		// In production, you'd use libraries like:
		// - 'pdf-poppler' or 'pdf2pic' for PDF to image conversion
		// - 'pdfjs-dist' for detailed PDF parsing
		// - 'pdf-lib' for PDF manipulation

		logger.debug('pdf_with_images:extracting_images', {
			pageNumber,
			brand: 'brAInwav',
		});

		// Simulate image extraction
		await new Promise((resolve) => setTimeout(resolve, 500));

		const images: ExtractedImage[] = [];

		// For demonstration, create a mock extracted image
		// In real implementation, you'd extract actual images from the PDF
		const mockImage: ExtractedImage = {
			id: randomUUID(),
			position: { x: 100, y: 150, width: 200, height: 150 },
			width: 200,
			height: 150,
			format: 'PNG',
			base64Data: await this.generateMockImageBase64(),
		};

		// Perform OCR on the extracted image if enabled
		if (options.enableOCR !== false) {
			try {
				mockImage.ocrText = await this.performOCR(mockImage.base64Data);
			} catch (ocrError) {
				logger.debug('pdf_with_images:ocr_failed', {
					pageNumber,
					imageId: mockImage.id,
					error: ocrError instanceof Error ? ocrError.message : 'Unknown error',
					brand: 'brAInwav',
				});
			}
		}

		// Perform vision analysis if enabled
		if (options.enableVisionAnalysis !== false) {
			try {
				mockImage.visionAnalysis = await this.performVisionAnalysis(
					mockImage.base64Data,
					options.visionModel,
				);
			} catch (visionError) {
				logger.debug('pdf_with_images:vision_analysis_failed', {
					pageNumber,
					imageId: mockImage.id,
					error: visionError instanceof Error ? visionError.message : 'Unknown error',
					brand: 'brAInwav',
				});
			}
		}

		images.push(mockImage);

		return images;
	}

	/**
	 * Generate mock image base64 data for demonstration
	 */
	private async generateMockImageBase64(): Promise<string> {
		// Create a simple PNG image using Sharp
		const imageBuffer = await sharp({
			create: {
				width: 200,
				height: 150,
				channels: 4,
				background: { r: 240, g: 240, b: 240, alpha: 1 },
			},
		})
			.png()
			.toBuffer();

		return `data:image/png;base64,${imageBuffer.toString('base64')}`;
	}

	/**
	 * Perform OCR on extracted image
	 */
	private async performOCR(base64Data: string): Promise<string> {
		// Placeholder OCR implementation
		logger.debug('pdf_with_images:ocr_processing', {
			brand: 'brAInwav',
		});

		await new Promise((resolve) => setTimeout(resolve, 800));

		return '[OCR text from PDF image - brAInwav]';
	}

	/**
	 * Perform vision analysis on extracted image
	 */
	private async performVisionAnalysis(base64Data: string, model?: string): Promise<any> {
		// Placeholder vision analysis implementation
		logger.debug('pdf_with_images:vision_analysis_processing', {
			model: model || 'default',
			brand: 'brAInwav',
		});

		await new Promise((resolve) => setTimeout(resolve, 1500));

		return {
			description: 'Vision analysis of PDF image - brAInwav',
			objects: [
				{
					label: 'document_element',
					confidence: 0.88,
					boundingBox: { x: 10, y: 10, width: 180, height: 130 },
				},
			],
			confidence: 0.88,
			analysisModel: model || 'brAInwav-vision-pdf',
			processedAt: new Date(),
		};
	}

	/**
	 * Create layout information for a page
	 */
	private createLayoutInfo(pageText: string, images: ExtractedImage[]): LayoutInfo {
		// Detect text blocks (simplified)
		const textBlocks: TextBlock[] = [];
		if (pageText) {
			const paragraphs = pageText.split(/\n\s*\n/);
			let currentPosition = 0;

			for (const paragraph of paragraphs) {
				if (paragraph.trim()) {
					textBlocks.push({
						text: paragraph.trim(),
						position: { x: 50, y: currentPosition + 50, width: 400, height: 50 },
						fontSize: 12,
						fontFamily: 'Arial',
						isBold: false,
						isItalic: false,
					});
					currentPosition += 60;
				}
			}
		}

		// Create image blocks
		const imageBlocks: ImageBlock[] = images.map((image) => ({
			position: image.position,
			caption: image.ocrText || undefined,
			referencesText: textBlocks.length > 0,
		}));

		return {
			hasText: textBlocks.length > 0,
			hasImages: images.length > 0,
			columns: textBlocks.length > 0 ? 1 : undefined,
			textBlocks,
			imageBlocks,
		};
	}

	/**
	 * Create comprehensive PDF with images metadata
	 */
	private async createPdfWithImagesMetadata(
		pdfData: any,
		pages: PdfPage[],
		extractedImages: ExtractedImage[],
	): Promise<PdfWithImagesMetadata> {
		// Count total text and images
		const totalText = pages.reduce((sum, page) => sum + (page.text?.length || 0), 0);
		const totalImages = extractedImages.length;

		// Check if layout was preserved (has both text and images on same pages)
		const layoutPreserved = pages.some((page) => page.layout.hasText && page.layout.hasImages);

		// Extract basic metadata from PDF
		const info = pdfData.info || {};

		return {
			title: info.Title,
			author: info.Author,
			subject: info.Subject,
			creator: info.Creator,
			producer: info.Producer,
			creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
			modDate: info.ModDate ? new Date(info.ModDate) : undefined,
			pages,
			totalImages,
			totalText,
			hasEmbeddedImages: totalImages > 0,
			layoutPreserved,
		};
	}

	/**
	 * Generate PDF hash for deduplication
	 */
	async generatePdfHash(buffer: Buffer): Promise<string> {
		return createHash('sha256').update(buffer).digest('hex');
	}

	/**
	 * Get PDF statistics for processing metrics
	 */
	getPdfStats(
		originalSize: number,
		pages: PdfPage[],
		extractedImages: ExtractedImage[],
	): {
		fileSize: string;
		pagesProcessed: number;
		totalText: number;
		totalImages: number;
		layoutPreserved: boolean;
		averageTextPerPage: number;
		averageImagesPerPage: number;
		textDensity: number; // characters per page
		imageDensity: number; // images per page
	} {
		const totalPages = pages.length;
		const totalText = pages.reduce((sum, page) => sum + (page.text?.length || 0), 0);
		const totalImages = extractedImages.length;
		const layoutPreserved = pages.some((page) => page.layout.hasText && page.layout.hasImages);

		return {
			fileSize: this.formatBytes(originalSize),
			pagesProcessed: totalPages,
			totalText,
			totalImages,
			layoutPreserved,
			averageTextPerPage: totalPages > 0 ? Math.round(totalText / totalPages) : 0,
			averageImagesPerPage: totalPages > 0 ? Math.round((totalImages / totalPages) * 10) / 10 : 0,
			textDensity: totalPages > 0 ? Math.round(totalText / totalPages) : 0,
			imageDensity: totalPages > 0 ? Math.round((totalImages / totalPages) * 10) / 10 : 0,
		};
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
	 * Create text chunks that preserve layout information
	 */
	createLayoutAwareChunks(
		pages: PdfPage[],
		maxChunkSize: number = 1000,
	): Array<{
		content: string;
		modality: 'text' | 'pdf_page_image';
		pageNumber: number;
		layoutContext: string;
		images: ExtractedImage[];
	}> {
		const chunks: Array<{
			content: string;
			modality: 'text' | 'pdf_page_image';
			pageNumber: number;
			layoutContext: string;
			images: ExtractedImage[];
		}> = [];

		for (const page of pages) {
			// Create text chunk if page has text
			if (page.text) {
				const textChunks = this.chunkTextPreservingLayout(page.text, maxChunkSize);

				for (let i = 0; i < textChunks.length; i++) {
					chunks.push({
						content: textChunks[i],
						modality: 'text',
						pageNumber: page.pageNumber,
						layoutContext: `Page ${page.pageNumber}, Chunk ${i + 1} of ${textChunks.length}`,
						images: [], // Text chunks don't include images directly
					});
				}
			}

			// Create image chunks for each image on the page
			for (const image of page.images) {
				const imageContent = [
					`Image on page ${page.pageNumber}`,
					image.position ? `Position: (${image.position.x}, ${image.position.y})` : '',
					image.position ? `Size: ${image.position.width}x${image.position.height}` : '',
					image.ocrText ? `OCR Text: ${image.ocrText}` : '',
					image.visionAnalysis ? `Description: ${image.visionAnalysis.description}` : '',
				]
					.filter(Boolean)
					.join('\n');

				chunks.push({
					content: imageContent,
					modality: 'pdf_page_image',
					pageNumber: page.pageNumber,
					layoutContext: `Page ${page.pageNumber}, Image ${image.id.substring(0, 8)}`,
					images: [image],
				});
			}
		}

		return chunks;
	}

	/**
	 * Chunk text while preserving layout information
	 */
	private chunkTextPreservingLayout(text: string, maxChunkSize: number): string[] {
		if (text.length <= maxChunkSize) {
			return [text];
		}

		const chunks: string[] = [];
		const paragraphs = text.split(/\n\s*\n/);
		let currentChunk = '';

		for (const paragraph of paragraphs) {
			if (currentChunk.length + paragraph.length + 2 <= maxChunkSize) {
				currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
			} else {
				if (currentChunk) {
					chunks.push(currentChunk);
					currentChunk = paragraph;
				} else {
					// Paragraph is too long, split it
					for (let i = 0; i < paragraph.length; i += maxChunkSize) {
						chunks.push(paragraph.substring(i, i + maxChunkSize));
					}
				}
			}
		}

		if (currentChunk) {
			chunks.push(currentChunk);
		}

		return chunks;
	}
}

// Export singleton instance
export const pdfWithImagesService = new PdfWithImagesService();
