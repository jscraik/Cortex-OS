import { beforeEach, describe, expect, it, vi } from 'vitest';
import { imageProcessingService } from '../../services/imageProcessingService.ts';
import type { MultimodalProcessingOptions } from '../../types/multimodal.ts';

// Mock logger to avoid noise in tests
vi.mock('../../utils/logger.ts', () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

// Mock Sharp
vi.mock('sharp', () => ({
	default: vi.fn(() => ({
		metadata: vi.fn().mockResolvedValue({
			format: 'jpeg',
			width: 800,
			height: 600,
			hasAlpha: false,
		}),
		resize: vi.fn().mockReturnThis(),
		png: vi.fn().mockReturnThis(),
		jpeg: vi.fn().mockReturnThis(),
		toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image-data')),
	})),
}));

describe('ImageProcessingService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('processImage', () => {
		it('should process a valid JPEG image successfully', async () => {
			// Arrange
			const imageBuffer = Buffer.from('fake-jpeg-image-data');
			const filename = 'test-image.jpg';
			const options: MultimodalProcessingOptions = {
				enableOCR: true,
				enableVisionAnalysis: true,
			};

			// Act
			const result = await imageProcessingService.processImage(imageBuffer, filename, options);

			// Assert
			expect(result).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.width).toBe(800);
			expect(result.metadata.height).toBe(600);
			expect(result.metadata.format).toBe('JPEG');
			expect(result.metadata.ocrText).toBe('[OCR text extraction completed - brAInwav]');
			expect(result.metadata.visionAnalysis).toBeDefined();
			expect(result.metadata.visionAnalysis?.description).toBe(
				'Vision analysis completed by brAInwav',
			);
			expect(result.resizedBuffer).toBeDefined();
			expect(result.thumbnailBuffer).toBeDefined();
		});

		it('should process image without OCR and vision analysis when disabled', async () => {
			// Arrange
			const imageBuffer = Buffer.from('fake-png-image-data');
			const filename = 'test-image.png';
			const options: MultimodalProcessingOptions = {
				enableOCR: false,
				enableVisionAnalysis: false,
			};

			// Act
			const result = await imageProcessingService.processImage(imageBuffer, filename, options);

			// Assert
			expect(result).toBeDefined();
			expect(result.metadata.ocrText).toBeUndefined();
			expect(result.metadata.visionAnalysis).toBeUndefined();
		});

		it('should throw error for oversized image', async () => {
			// Arrange
			const largeImageBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
			const filename = 'large-image.jpg';

			// Act & Assert
			await expect(imageProcessingService.processImage(largeImageBuffer, filename)).rejects.toThrow(
				'Image file size 60MB exceeds maximum allowed size of 50MB',
			);
		});

		it('should throw error for unsupported image format', async () => {
			// Arrange
			const imageBuffer = Buffer.from('fake-bmp-image-data');
			const filename = 'test-image.bmp';

			// Mock Sharp to throw error for unsupported format
			const { default: sharp } = await import('sharp');
			vi.mocked(sharp).mockImplementation(() => {
				throw new Error('Input file has unsupported format');
			});

			// Act & Assert
			await expect(imageProcessingService.processImage(imageBuffer, filename)).rejects.toThrow(
				'Invalid or corrupted image file',
			);
		});
	});

	describe('isFormatSupported', () => {
		it('should return true for supported MIME types', () => {
			// Arrange & Act & Assert
			expect(imageProcessingService.isFormatSupported('image/jpeg', 'test.jpg')).toBe(true);
			expect(imageProcessingService.isFormatSupported('image/png', 'test.png')).toBe(true);
			expect(imageProcessingService.isFormatSupported('image/webp', 'test.webp')).toBe(true);
			expect(imageProcessingService.isFormatSupported('image/gif', 'test.gif')).toBe(true);
		});

		it('should return true for supported file extensions', () => {
			// Arrange & Act & Assert
			expect(imageProcessingService.isFormatSupported('application/octet-stream', 'test.jpg')).toBe(
				true,
			);
			expect(
				imageProcessingService.isFormatSupported('application/octet-stream', 'test.jpeg'),
			).toBe(true);
			expect(imageProcessingService.isFormatSupported('application/octet-stream', 'test.png')).toBe(
				true,
			);
			expect(
				imageProcessingService.isFormatSupported('application/octet-stream', 'test.webp'),
			).toBe(true);
			expect(imageProcessingService.isFormatSupported('application/octet-stream', 'test.gif')).toBe(
				true,
			);
		});

		it('should return false for unsupported formats', () => {
			// Arrange & Act & Assert
			expect(imageProcessingService.isFormatSupported('image/bmp', 'test.bmp')).toBe(false);
			expect(imageProcessingService.isFormatSupported('application/pdf', 'test.pdf')).toBe(false);
			expect(imageProcessingService.isFormatSupported('text/plain', 'test.txt')).toBe(false);
		});
	});

	describe('generateImageHash', () => {
		it('should generate consistent hash for same image', async () => {
			// Arrange
			const imageBuffer = Buffer.from('test-image-data');

			// Act
			const hash1 = await imageProcessingService.generateImageHash(imageBuffer);
			const hash2 = await imageProcessingService.generateImageHash(imageBuffer);

			// Assert
			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash format
		});

		it('should generate different hashes for different images', async () => {
			// Arrange
			const imageBuffer1 = Buffer.from('test-image-data-1');
			const imageBuffer2 = Buffer.from('test-image-data-2');

			// Act
			const hash1 = await imageProcessingService.generateImageHash(imageBuffer1);
			const hash2 = await imageProcessingService.generateImageHash(imageBuffer2);

			// Assert
			expect(hash1).not.toBe(hash2);
		});
	});

	describe('getImageStats', () => {
		it('should return formatted statistics', () => {
			// Arrange
			const originalSize = 1024 * 1024; // 1MB
			const processedSize = 512 * 1024; // 512KB
			const thumbnailSize = 32 * 1024; // 32KB

			// Act
			const stats = imageProcessingService.getImageStats(
				originalSize,
				processedSize,
				thumbnailSize,
			);

			// Assert
			expect(stats.originalSize).toBe('1 MB');
			expect(stats.processedSize).toBe('512 KB');
			expect(stats.thumbnailSize).toBe('32 KB');
			expect(stats.compressionRatio).toBe(50); // 512KB / 1MB * 100
			expect(stats.thumbnailReduction).toBe(3); // 32KB / 1MB * 100
		});

		it('should handle missing optional parameters', () => {
			// Arrange
			const originalSize = 1024 * 1024; // 1MB

			// Act
			const stats = imageProcessingService.getImageStats(originalSize);

			// Assert
			expect(stats.originalSize).toBe('1 MB');
			expect(stats.processedSize).toBeUndefined();
			expect(stats.thumbnailSize).toBeUndefined();
			expect(stats.compressionRatio).toBeUndefined();
			expect(stats.thumbnailReduction).toBeUndefined();
		});
	});
});
