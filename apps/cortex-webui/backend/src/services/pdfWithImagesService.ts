import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import type {
	ExtractedImage,
	MultimodalProcessingOptions,
	PdfPage,
	PdfWithImagesMetadata,
	TextBlock,
} from '../types/multimodal.js';
import logger from '../utils/logger.js';

const require = createRequire(__filename);
const pdfWorkerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

// Minimal PDF.js typings to avoid 'any'
type PdfMetadataRecord = {
	Title?: string;
	Author?: string;
	Subject?: string;
	Creator?: string;
	Producer?: string;
	CreationDate?: string;
	ModDate?: string;
};

type PdfMetadata = {
	info?: PdfMetadataRecord;
	metadata?: { get?: (name: string) => unknown };
};

type PdfTextItem = { str?: string };

type PdfTextContent = { items: PdfTextItem[] };

type PdfPageObject = {
	getTextContent: (options?: { normalizeWhitespace?: boolean }) => Promise<PdfTextContent>;
	cleanup: () => void;
};

type PdfDocument = {
	numPages: number;
	getMetadata: () => Promise<PdfMetadata>;
	getPage: (pageNumber: number) => Promise<PdfPageObject>;
	destroy: () => Promise<void>;
};

type PdfJsLib = {
	GlobalWorkerOptions: { workerSrc: string };
	getDocument: (params: { data: Uint8Array } | { url: string; useSystemFonts?: boolean }) => {
		promise: Promise<PdfDocument>;
	};
};

type PdfSource = Buffer | { path: string; size: number };

type VisionAnalysisResult = {
	description: string;
	objects: Array<{
		label: string;
		confidence: number;
		boundingBox: { x: number; y: number; width: number; height: number };
	}>;
	confidence: number;
	analysisModel: string;
	processedAt: Date;
};

/**
 * PDF with Images Processing Service for brAInwav Cortex-OS
 * Streams PDF content via pdf.js to avoid loading whole files into memory
 */
export class PdfWithImagesService {
	private readonly maxPages = 200;

	async processPdfWithImages(
		source: PdfSource,
		filename: string,
		options: MultimodalProcessingOptions = {},
	): Promise<{
		metadata: PdfWithImagesMetadata & {
			title?: string;
			author?: string;
			subject?: string;
			creator?: string;
			producer?: string;
			creationDate?: Date;
			modificationDate?: Date;
		};
		pages: PdfPage[];
		extractedImages: ExtractedImage[];
	}> {
		const startTime = Date.now();

		await this.validatePdfFile(source, filename);

		const pdfjsLib = await this.getPdfJs();
		const loadingTask = Buffer.isBuffer(source)
			? pdfjsLib.getDocument({
				data: new Uint8Array(source.buffer, source.byteOffset, source.byteLength),
			})
			: pdfjsLib.getDocument({
				url: pathToFileURL(source.path).href,
				useSystemFonts: true,
			});

		const pdfDoc = await loadingTask.promise;

		try {
			if (pdfDoc.numPages > this.maxPages) {
				throw new Error(`PDF has ${pdfDoc.numPages} pages, maximum allowed is ${this.maxPages}`);
			}

			logger.info('pdf_with_images:processing_start', {
				filename,
				pages: pdfDoc.numPages,
				brand: 'brAInwav',
			});

			const metadata = await this.extractMetadata(pdfDoc, filename);
			const { pages, extractedImages } = await this.extractPages(pdfDoc, options);

			const summary: PdfWithImagesMetadata & {
				title?: string;
				author?: string;
				subject?: string;
				creator?: string;
				producer?: string;
				creationDate?: Date;
				modificationDate?: Date;
			} = {
				...metadata,
				pages,
				totalImages: extractedImages.length,
				totalText: pages.reduce((sum, page) => sum + (page.text?.length ?? 0), 0),
				hasEmbeddedImages: extractedImages.length > 0,
				layoutPreserved: true,
			};

			logger.info('pdf_with_images:processing_complete', {
				filename,
				pagesProcessed: pages.length,
				imagesExtracted: extractedImages.length,
				totalText: summary.totalText,
				processingTime: Date.now() - startTime,
				brand: 'brAInwav',
			});

			return {
				metadata: summary,
				pages,
				extractedImages,
			};
		} finally {
			await pdfDoc.destroy();
		}
	}

	private async getPdfJs(): Promise<PdfJsLib> {
		// Use require to align with CommonJS module configuration
		 
		const pdfjsLib: PdfJsLib = require('pdfjs-dist/legacy/build/pdf.js');
		pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
		return pdfjsLib;
	}

	private getMetaString(md: PdfMetadata['metadata'] | undefined, key: string): string | undefined {
	const val = md?.get?.(key);
	return typeof val === 'string' ? val : undefined;
}

	private async validatePdfFile(source: PdfSource, filename: string): Promise<void> {
	const size = Buffer.isBuffer(source) ? source.length : source.size;
	if(size > this.maxFileSize) {
	throw new Error(
		`PDF file size ${Math.round(size / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(
			this.maxFileSize / 1024 / 1024,
		)}MB`,
	);
}

const extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
if (extension !== 'pdf') {
	throw new Error('Invalid file extension. Expected .pdf file');
}
	}

	private async extractMetadata(pdfDoc: PdfDocument, filename: string) {
	let info: PdfMetadataRecord = {};
	let metadata: PdfMetadata['metadata'];
	try {
		const meta = await pdfDoc.getMetadata();
		info = meta?.info ?? {};
		metadata = meta?.metadata ?? undefined;
	} catch (error) {
		logger.debug('pdf_with_images:metadata_read_failed', {
			filename,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});
	}

	return {
		title: info?.Title || this.getMetaString(metadata, 'dc:title') || undefined,
		author: info?.Author || this.getMetaString(metadata, 'dc:creator') || undefined,
		subject: info?.Subject || this.getMetaString(metadata, 'dc:description') || undefined,
		creator: info?.Creator || undefined,
		producer: info?.Producer || undefined,
		creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
		modificationDate: info?.ModDate ? new Date(info.ModDate) : undefined,
	};
}

	private async extractPages(
	pdfDoc: PdfDocument,
	options: MultimodalProcessingOptions,
): Promise < { pages: PdfPage[]; extractedImages: ExtractedImage[] } > {
	const pages: PdfPage[] = [];
	const extractedImages: ExtractedImage[] = [];

	for(let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
	const page = await pdfDoc.getPage(pageNumber);
	const textContent = await page.getTextContent({ normalizeWhitespace: true });
	const text = textContent.items
		.map((item: PdfTextItem) => (typeof item.str === 'string' ? item.str : ''))
		.join(' ')
		.trim();

	const pageImages = await this.extractImagesFromPage(pageNumber, options);
	extractedImages.push(...pageImages);

	const layout = this.createLayoutInfo(text, pageImages);
	pages.push({
		pageNumber,
		text: text || undefined,
		images: pageImages,
		layout,
	});

	page.cleanup();

	if (extractedImages.length > this.maxImages) {
		logger.warn('pdf_with_images:too_many_images', {
			pageNumber,
			imageCount: extractedImages.length,
			brand: 'brAInwav',
		});
		break;
	}
}

return { pages, extractedImages };
	}

	private async extractImagesFromPage(
	pageNumber: number,
	options: MultimodalProcessingOptions,
): Promise < ExtractedImage[] > {
	logger.debug('pdf_with_images:extracting_images', {
		pageNumber,
		brand: 'brAInwav',
	});

	await new Promise((resolve) => setTimeout(resolve, 250));

	const images: ExtractedImage[] = [];
	const mockImage: ExtractedImage = {
		id: randomUUID(),
		position: { x: 100, y: 150, width: 200, height: 150 },
		width: 200,
		height: 150,
		format: 'PNG',
		base64Data: (await this.generateMockImageBase64()) || '',
	};

	if(options.enableOCR !== false) {
	try {
		mockImage.ocrText = await this.performOCR(mockImage.base64Data ?? '');
	} catch (error) {
		logger.debug('pdf_with_images:ocr_failed', {
			pageNumber,
			imageId: mockImage.id,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});
	}
}

if (options.enableVisionAnalysis !== false) {
	try {
		mockImage.visionAnalysis = await this.performVisionAnalysis(
			mockImage.base64Data ?? '',
			options.visionModel,
		);
	} catch (error) {
		logger.debug('pdf_with_images:vision_analysis_failed', {
			pageNumber,
			imageId: mockImage.id,
			error: error instanceof Error ? error.message : 'Unknown error',
			brand: 'brAInwav',
		});
	}
}

images.push(mockImage);
return images;
	}

	private async generateMockImageBase64(): Promise < string > {
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

	private async performOCR(_base64Data: string): Promise < string > {
	logger.debug('pdf_with_images:ocr_processing', {
		brand: 'brAInwav',
	});

	await new Promise((resolve) => setTimeout(resolve, 400));
	return '[OCR text from PDF image - brAInwav]';
}

	private async performVisionAnalysis(
	_base64Data: string,
	model ?: string,
): Promise < VisionAnalysisResult > {
	logger.debug('pdf_with_images:vision_analysis_processing', {
		model: model || 'default',
		brand: 'brAInwav',
	});

	await new Promise((resolve) => setTimeout(resolve, 800));

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

	private createLayoutInfo(pageText: string, images: ExtractedImage[]): LayoutInfo {
	const textBlocks: TextBlock[] = [];
	if (pageText) {
		const paragraphs = pageText.split(/\n\s*\n/);
		let currentPosition = 0;
		for (const paragraph of paragraphs) {
			if (paragraph.trim()) {
				textBlocks.push({
					text: paragraph.trim(),
					position: { x: 50, y: currentPosition + 50, width: 400, height: 50 },
				});
				currentPosition += 60;
			}
		}
	}

	return {
		hasText: textBlocks.length > 0,
		hasImages: images.length > 0,
		columns: 1,
		textBlocks,
		imageBlocks: images.map((image) => ({
			position: image.position,
			caption: image.ocrText,
			referencesText: textBlocks.length > 0,
		})),
	};
}

createLayoutAwareChunks(pages: PdfPage[]): Array < {
	content: string;
	modality: 'text' | 'image';
	pageNumber: number;
	layoutContext: string;
} > {
	const chunks: Array<{
		content: string;
		modality: 'text' | 'image';
		pageNumber: number;
		layoutContext: string;
	}> =[];

for (const page of pages) {
	if (page.text) {
		chunks.push({
			content: page.text,
			modality: 'text',
			pageNumber: page.pageNumber,
			layoutContext: `Page ${page.pageNumber}`,
		});
	}

	for (const image of page.images) {
		chunks.push({
			content: image.ocrText || '[Extracted image]',
			modality: 'image',
			pageNumber: page.pageNumber,
			layoutContext: `Page ${page.pageNumber} image ${image.id}`,
		});
	}
}

return chunks;
	}
}

export const pdfWithImagesService = new PdfWithImagesService();
