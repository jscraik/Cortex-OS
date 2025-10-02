import { beforeEach, describe, expect, it, vi } from 'vitest';
import { audioTranscriptionService } from '../../services/audioTranscriptionService.ts';
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

describe('AudioTranscriptionService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('processAudio', () => {
		it('should process a valid MP3 audio file successfully', async () => {
			// Arrange
			const audioBuffer = Buffer.from('fake-mp3-audio-data');
			const filename = 'test-audio.mp3';
			const options: MultimodalProcessingOptions = {
				enableTranscription: true,
				enableSpeakerDiarization: true,
				language: 'en',
			};

			// Act
			const result = await audioTranscriptionService.processAudio(audioBuffer, filename, options);

			// Assert
			expect(result).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.format).toBe('MP3');
			expect(result.metadata.duration).toBeGreaterThan(0);
			expect(result.metadata.sampleRate).toBe(44100);
			expect(result.metadata.channels).toBe(2);
			expect(result.transcription).toBeDefined();
			expect(result.transcription?.text).toContain('brAInwav audio processing');
			expect(result.transcription?.speakers).toHaveLength(2); // With diarization enabled
			expect(result.transcription?.segments).toHaveLength(3);
			expect(result.waveformData).toBeDefined();
			expect(result.waveformData).toHaveLength(200); // Default waveform samples
		});

		it('should process audio without transcription when disabled', async () => {
			// Arrange
			const audioBuffer = Buffer.from('fake-wav-audio-data');
			const filename = 'test-audio.wav';
			const options: MultimodalProcessingOptions = {
				enableTranscription: false,
				enableSpeakerDiarization: false,
			};

			// Act
			const result = await audioTranscriptionService.processAudio(audioBuffer, filename, options);

			// Assert
			expect(result).toBeDefined();
			expect(result.transcription).toBeUndefined();
			expect(result.metadata.transcript).toBeUndefined();
			expect(result.metadata.speakerDiarization).toBeUndefined();
			expect(result.waveformData).toBeDefined(); // Waveform should still be generated
		});

		it('should process audio with single speaker when diarization disabled', async () => {
			// Arrange
			const audioBuffer = Buffer.from('fake-m4a-audio-data');
			const filename = 'test-audio.m4a';
			const options: MultimodalProcessingOptions = {
				enableTranscription: true,
				enableSpeakerDiarization: false,
			};

			// Act
			const result = await audioTranscriptionService.processAudio(audioBuffer, filename, options);

			// Assert
			expect(result).toBeDefined();
			expect(result.transcription).toBeDefined();
			expect(result.transcription?.speakers).toHaveLength(0); // No speakers when diarization disabled
			expect(result.transcription?.segments).toHaveLength(1); // Single segment
			expect(result.transcription?.segments[0].speakerId).toBeUndefined();
		});

		it('should throw error for oversized audio file', async () => {
			// Arrange
			const largeAudioBuffer = Buffer.alloc(600 * 1024 * 1024); // 600MB
			const filename = 'large-audio.mp3';

			// Act & Assert
			await expect(
				audioTranscriptionService.processAudio(largeAudioBuffer, filename),
			).rejects.toThrow('Audio file size 600MB exceeds maximum allowed size of 500MB');
		});

		it('should throw error for unsupported audio format', async () => {
			// Arrange
			const audioBuffer = Buffer.from('fake-audio-data');
			const filename = 'test-audio.xyz'; // Unsupported extension

			// Act & Assert
			await expect(audioTranscriptionService.processAudio(audioBuffer, filename)).rejects.toThrow(
				'Unsupported audio format. Supported formats: mp3, wav, m4a, ogg, flac',
			);
		});

		it('should handle transcription failure gracefully', async () => {
			// Arrange
			const audioBuffer = Buffer.from('fake-ogg-audio-data');
			const filename = 'test-audio.ogg';
			const options: MultimodalProcessingOptions = {
				enableTranscription: true,
			};

			// Mock transcription to fail
			const originalTranscribe = audioTranscriptionService['transcribeAudio'];
			vi.spyOn(audioTranscriptionService, 'transcribeAudio' as any).mockRejectedValue(
				new Error('Transcription service unavailable'),
			);

			// Act
			const result = await audioTranscriptionService.processAudio(audioBuffer, filename, options);

			// Assert
			expect(result).toBeDefined();
			expect(result.transcription).toBeUndefined();
			expect(result.metadata.transcript).toBeUndefined();

			// Restore original method
			audioTranscriptionService['transcribeAudio'] = originalTranscribe;
		});
	});

	describe('isFormatSupported', () => {
		it('should return true for supported MIME types', () => {
			// Arrange & Act & Assert
			expect(audioTranscriptionService.isFormatSupported('audio/mpeg', 'test.mp3')).toBe(true);
			expect(audioTranscriptionService.isFormatSupported('audio/wav', 'test.wav')).toBe(true);
			expect(audioTranscriptionService.isFormatSupported('audio/m4a', 'test.m4a')).toBe(true);
			expect(audioTranscriptionService.isFormatSupported('audio/ogg', 'test.ogg')).toBe(true);
			expect(audioTranscriptionService.isFormatSupported('audio/flac', 'test.flac')).toBe(true);
		});

		it('should return true for supported file extensions', () => {
			// Arrange & Act & Assert
			expect(
				audioTranscriptionService.isFormatSupported('application/octet-stream', 'test.mp3'),
			).toBe(true);
			expect(
				audioTranscriptionService.isFormatSupported('application/octet-stream', 'test.wav'),
			).toBe(true);
			expect(
				audioTranscriptionService.isFormatSupported('application/octet-stream', 'test.m4a'),
			).toBe(true);
			expect(
				audioTranscriptionService.isFormatSupported('application/octet-stream', 'test.ogg'),
			).toBe(true);
			expect(
				audioTranscriptionService.isFormatSupported('application/octet-stream', 'test.flac'),
			).toBe(true);
		});

		it('should return false for unsupported formats', () => {
			// Arrange & Act & Assert
			expect(audioTranscriptionService.isFormatSupported('image/jpeg', 'test.jpg')).toBe(false);
			expect(audioTranscriptionService.isFormatSupported('application/pdf', 'test.pdf')).toBe(
				false,
			);
			expect(audioTranscriptionService.isFormatSupported('text/plain', 'test.txt')).toBe(false);
			expect(
				audioTranscriptionService.isFormatSupported('application/octet-stream', 'test.xyz'),
			).toBe(false);
		});
	});

	describe('generateAudioHash', () => {
		it('should generate consistent hash for same audio', async () => {
			// Arrange
			const audioBuffer = Buffer.from('test-audio-data');

			// Act
			const hash1 = await audioTranscriptionService.generateAudioHash(audioBuffer);
			const hash2 = await audioTranscriptionService.generateAudioHash(audioBuffer);

			// Assert
			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash format
		});

		it('should generate different hashes for different audio files', async () => {
			// Arrange
			const audioBuffer1 = Buffer.from('test-audio-data-1');
			const audioBuffer2 = Buffer.from('test-audio-data-2');

			// Act
			const hash1 = await audioTranscriptionService.generateAudioHash(audioBuffer1);
			const hash2 = await audioTranscriptionService.generateAudioHash(audioBuffer2);

			// Assert
			expect(hash1).not.toBe(hash2);
		});
	});

	describe('transcriptionToSpeakerSegments', () => {
		it('should convert transcription to speaker segments', () => {
			// Arrange
			const transcription = {
				text: 'Speaker 1: Hello. Speaker 2: World.',
				segments: [
					{ start: 0, end: 2, text: 'Hello.', speakerId: 'speaker_1', confidence: 0.95 },
					{ start: 2, end: 4, text: 'World.', speakerId: 'speaker_2', confidence: 0.88 },
				],
				speakers: [],
				processingTime: 1000,
				model: 'test-model',
				confidence: 0.92,
				language: 'en',
			};

			// Act
			const segments = audioTranscriptionService.transcriptionToSpeakerSegments(transcription);

			// Assert
			expect(segments).toHaveLength(2);
			expect(segments[0]).toEqual({
				speakerId: 'speaker_1',
				startTime: 0,
				endTime: 2,
				text: 'Hello.',
				confidence: 0.95,
			});
			expect(segments[1]).toEqual({
				speakerId: 'speaker_2',
				startTime: 2,
				endTime: 4,
				text: 'World.',
				confidence: 0.88,
			});
		});

		it('should handle segments without speaker IDs', () => {
			// Arrange
			const transcription = {
				text: 'Single speaker audio.',
				segments: [{ start: 0, end: 3, text: 'Single speaker audio.', confidence: 0.91 }],
				speakers: [],
				processingTime: 800,
				model: 'test-model',
				confidence: 0.91,
				language: 'en',
			};

			// Act
			const segments = audioTranscriptionService.transcriptionToSpeakerSegments(transcription);

			// Assert
			expect(segments).toHaveLength(1);
			expect(segments[0].speakerId).toBe('unknown');
		});
	});

	describe('getAudioStats', () => {
		it('should return formatted statistics with transcription', () => {
			// Arrange
			const originalSize = 5 * 1024 * 1024; // 5MB
			const duration = 180; // 3 minutes
			const transcription = {
				text: 'This is a test transcription with multiple words for testing word count.',
				segments: [],
				speakers: [
					{ id: 'speaker_1', segments: 2, totalSpeakingTime: 120 },
					{ id: 'speaker_2', segments: 1, totalSpeakingTime: 60 },
				],
				processingTime: 2000,
				model: 'test-model',
				confidence: 0.92,
				language: 'en',
			};

			// Act
			const stats = audioTranscriptionService.getAudioStats(originalSize, duration, transcription);

			// Assert
			expect(stats.duration).toBe('3:00');
			expect(stats.fileSize).toBe('5 MB');
			expect(stats.bitrate).toBe(222); // 5MB * 8 / 180s
			expect(stats.transcriptionStats).toBeDefined();
			expect(stats.transcriptionStats?.textLength).toBe(transcription.text.length);
			expect(stats.transcriptionStats?.wordCount).toBe(12);
			expect(stats.transcriptionStats?.speakers).toBe(2);
			expect(stats.transcriptionStats?.segments).toBe(0); // Transcription.segments is empty in this test
			expect(stats.transcriptionStats?.averageConfidence).toBeDefined();
		});

		it('should return statistics without transcription when not provided', () => {
			// Arrange
			const originalSize = 2 * 1024 * 1024; // 2MB
			const duration = 60; // 1 minute

			// Act
			const stats = audioTranscriptionService.getAudioStats(originalSize, duration);

			// Assert
			expect(stats.duration).toBe('1:00');
			expect(stats.fileSize).toBe('2 MB');
			expect(stats.bitrate).toBe(267); // 2MB * 8 / 60s
			expect(stats.transcriptionStats).toBeUndefined();
		});
	});
});
