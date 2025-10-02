import { createHash } from 'node:crypto';
import type {
	AudioMetadata,
	MultimodalProcessingOptions,
	SpeakerInfo,
	SpeakerSegment,
	TranscriptionResult,
	TranscriptionSegment,
} from '../types/multimodal.js';
import logger from '../utils/logger.js';

/**
 * Audio Transcription Service for brAInwav Cortex-OS
 * Handles audio processing, transcription, and speaker diarization
 */
export class AudioTranscriptionService {
	private readonly supportedFormats = ['mp3', 'wav', 'm4a', 'ogg', 'flac'];
	private readonly maxAudioSize = 500 * 1024 * 1024; // 500MB
	private readonly maxDuration = 3600 * 4; // 4 hours in seconds

	/**
	 * Process uploaded audio file and extract comprehensive metadata
	 */
	async processAudio(
		buffer: Buffer,
		filename: string,
		options: MultimodalProcessingOptions = {},
	): Promise<{
		metadata: AudioMetadata;
		transcription?: TranscriptionResult;
		waveformData?: number[];
	}> {
		const startTime = Date.now();

		try {
			logger.info('audio:processing_start', {
				filename,
				fileSize: buffer.length,
				enableTranscription: options.enableTranscription ?? true,
				enableSpeakerDiarization: options.enableSpeakerDiarization ?? true,
				language: options.language,
				brand: 'brAInwav',
			});

			// Validate audio file
			await this.validateAudio(buffer, filename);

			// Extract audio metadata
			const audioMetadata = await this.extractAudioMetadata(buffer, filename);

			// Generate waveform data
			const waveformData = await this.generateWaveform(buffer);

			// Perform transcription if enabled
			let transcription: TranscriptionResult | undefined;
			if (options.enableTranscription !== false) {
				try {
					transcription = await this.transcribeAudio(buffer, {
						language: options.language,
						enableDiarization: options.enableSpeakerDiarization ?? true,
						model: options.transcriptionModel,
					});

					// Update metadata with transcription results
					audioMetadata.transcript = transcription.text;
					audioMetadata.speakerDiarization = transcription.speakers.map((speaker) => ({
						speakerId: speaker.id,
						startTime: 0, // Will be calculated from segments
						endTime: speaker.totalSpeakingTime,
						text: '', // Will be aggregated from segments
						confidence: 0.9, // Average confidence
					}));
				} catch (transcriptionError) {
					logger.warn('audio:transcription_failed', {
						filename,
						error:
							transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error',
						brand: 'brAInwav',
					});
					// Don't fail processing, just continue without transcription
				}
			}

			const processingTime = Date.now() - startTime;

			logger.info('audio:processing_complete', {
				filename,
				duration: audioMetadata.duration,
				format: audioMetadata.format,
				sampleRate: audioMetadata.sampleRate,
				channels: audioMetadata.channels,
				transcriptionLength: transcription?.text.length || 0,
				speakersIdentified: transcription?.speakers.length || 0,
				processingTime,
				brand: 'brAInwav',
			});

			return {
				metadata: audioMetadata,
				transcription,
				waveformData,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error('audio:processing_failed', {
				filename,
				error: errorMessage,
				processingTime: Date.now() - startTime,
				brand: 'brAInwav',
			});

			throw new Error(`Audio processing failed: ${errorMessage}`);
		}
	}

	/**
	 * Validate audio file format and size
	 */
	private async validateAudio(buffer: Buffer, filename: string): Promise<void> {
		// Check file size
		if (buffer.length > this.maxAudioSize) {
			throw new Error(
				`Audio file size ${Math.round(buffer.length / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(this.maxAudioSize / 1024 / 1024)}MB`,
			);
		}

		// Check file extension
		const extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
		if (!this.supportedFormats.includes(extension)) {
			throw new Error(
				`Unsupported audio format. Supported formats: ${this.supportedFormats.join(', ')}`,
			);
		}

		// Validate audio format (basic check - in production you'd use a library like 'music-metadata')
		try {
			const metadata = await this.extractBasicAudioInfo(buffer);
			if (metadata.duration > this.maxDuration) {
				throw new Error(
					`Audio duration ${Math.round(metadata.duration)}s exceeds maximum allowed duration of ${this.maxDuration}s`,
				);
			}
		} catch (validationError) {
			throw new Error(
				`Invalid or corrupted audio file: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Extract basic audio information for validation
	 */
	private async extractBasicAudioInfo(buffer: Buffer): Promise<{
		duration: number;
		format: string;
	}> {
		// Placeholder implementation - in production you'd use libraries like:
		// - 'music-metadata' for comprehensive audio metadata
		// - 'node-ffmpeg' for audio processing
		// - 'wavefile' for WAV file parsing

		const extension = this.detectFormatFromBuffer(buffer);

		// Simulate duration detection based on file size
		// This is a rough approximation - real implementation would parse the audio file
		const estimatedDuration = Math.min(buffer.length / 16000, this.maxDuration); // Rough estimate

		return {
			duration: estimatedDuration,
			format: extension,
		};
	}

	/**
	 * Detect audio format from buffer
	 */
	private detectFormatFromBuffer(buffer: Buffer): string {
		const header = buffer.subarray(0, 12);

		// MP3 detection (ID3v1/v2 or MPEG frame sync)
		if (
			(header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) || // ID3
			(header[0] === 0xff && (header[1] & 0xe0) === 0xe0) // MPEG sync
		) {
			return 'mp3';
		}

		// WAV detection
		if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WAVE') {
			return 'wav';
		}

		// M4A/MP4 detection
		if (header.subarray(4, 8).toString('ascii') === 'ftyp') {
			return 'm4a';
		}

		// OGG detection
		if (header.toString('ascii', 0, 4) === 'OggS') {
			return 'ogg';
		}

		return 'unknown';
	}

	/**
	 * Extract comprehensive audio metadata
	 */
	private async extractAudioMetadata(buffer: Buffer, filename: string): Promise<AudioMetadata> {
		const basicInfo = await this.extractBasicAudioInfo(buffer);
		const extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);

		// Placeholder for comprehensive metadata extraction
		// In production, you'd use 'music-metadata' library for detailed information
		const audioMetadata: AudioMetadata = {
			duration: Math.round(basicInfo.duration),
			format: this.normalizeFormat(extension),
			sampleRate: 44100, // Default - would be extracted from file
			channels: 2, // Default - would be extracted from file
			bitrate: 128, // Default - would be extracted from file
		};

		return audioMetadata;
	}

	/**
	 * Generate waveform data for visualization
	 */
	private async generateWaveform(buffer: Buffer): Promise<number[]> {
		// Placeholder implementation for waveform generation
		// In production, you'd use audio processing libraries to extract actual waveform data

		logger.debug('audio:waveform_generation', {
			audioSize: buffer.length,
			brand: 'brAInwav',
		});

		// Simulate waveform processing time
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Generate placeholder waveform (normalized amplitude values between 0 and 1)
		const samples = 200; // Number of samples to generate
		const waveformData: number[] = [];

		for (let i = 0; i < samples; i++) {
			// Generate a sine wave with some noise for demo purposes
			const value = Math.abs(Math.sin(i * 0.1) + (Math.random() - 0.5) * 0.3);
			waveformData.push(Math.min(1, Math.max(0, value)));
		}

		return waveformData;
	}

	/**
	 * Transcribe audio using speech-to-text
	 */
	private async transcribeAudio(
		buffer: Buffer,
		options: {
			language?: string;
			enableDiarization?: boolean;
			model?: string;
		},
	): Promise<TranscriptionResult> {
		const startTime = Date.now();

		logger.debug('audio:transcription_start', {
			audioSize: buffer.length,
			language: options.language,
			enableDiarization: options.enableDiarization,
			model: options.model || 'brAInwav-transcription-default',
			brand: 'brAInwav',
		});

		// Placeholder for transcription implementation
		// In production, you'd integrate with services like:
		// - OpenAI Whisper API
		// - Google Speech-to-Text
		// - Azure Speech Services
		// - Local models like Whisper.cpp

		// Simulate transcription processing time based on audio size
		const processingTime = Math.min(buffer.length / 10000, 30000); // Max 30 seconds
		await new Promise((resolve) => setTimeout(resolve, processingTime));

		// Generate placeholder transcription
		const sampleText = options.enableDiarization
			? `Speaker 1: Hello, this is a sample transcription from brAInwav audio processing. ` +
				`Speaker 2: This demonstrates speaker diarization capabilities. ` +
				`Speaker 1: The system can identify different speakers and their segments.`
			: `This is a sample transcription from brAInwav audio processing system. ` +
				`The text represents what would typically be extracted from an audio file using ` +
				`speech-to-text technology.`;

		const segments: TranscriptionSegment[] = [];
		const speakers: SpeakerInfo[] = [];

		if (options.enableDiarization) {
			// Create segments with speaker information
			segments.push(
				{
					start: 0,
					end: 3.5,
					text: 'Hello, this is a sample transcription from brAInwav audio processing.',
					speakerId: 'speaker_1',
					confidence: 0.95,
				},
				{
					start: 3.5,
					end: 6.0,
					text: 'This demonstrates speaker diarization capabilities.',
					speakerId: 'speaker_2',
					confidence: 0.92,
				},
				{
					start: 6.0,
					end: 9.5,
					text: 'The system can identify different speakers and their segments.',
					speakerId: 'speaker_1',
					confidence: 0.94,
				},
			);

			// Create speaker information
			speakers.push(
				{
					id: 'speaker_1',
					segments: 2,
					totalSpeakingTime: 6.5,
				},
				{
					id: 'speaker_2',
					segments: 1,
					totalSpeakingTime: 2.5,
				},
			);
		} else {
			// Create single segment without speaker information
			segments.push({
				start: 0,
				end: 8.0,
				text: sampleText,
				confidence: 0.93,
			});
		}

		const processingDuration = Date.now() - startTime;

		return {
			text: sampleText,
			segments,
			speakers,
			processingTime: processingDuration,
			model: options.model || 'brAInwav-transcription-default',
			confidence: 0.93,
			language: options.language || 'en',
		};
	}

	/**
	 * Generate audio hash for deduplication
	 */
	async generateAudioHash(buffer: Buffer): Promise<string> {
		return createHash('sha256').update(buffer).digest('hex');
	}

	/**
	 * Normalize audio format name
	 */
	private normalizeFormat(extension: string): 'MP3' | 'WAV' | 'M4A' | 'OGG' {
		const normalized = extension.toUpperCase();
		switch (normalized) {
			case 'MP3':
				return 'MP3';
			case 'WAV':
				return 'WAV';
			case 'M4A':
			case 'MP4':
				return 'M4A';
			case 'OGG':
				return 'OGG';
			case 'FLAC':
				return 'OGG'; // Treat FLAC as OGG for simplicity
			default:
				return 'MP3'; // Default fallback
		}
	}

	/**
	 * Convert audio segments to speaker segments for chunking
	 */
	transcriptionToSpeakerSegments(transcription: TranscriptionResult): SpeakerSegment[] {
		return transcription.segments.map((segment) => ({
			speakerId: segment.speakerId || 'unknown',
			startTime: segment.start,
			endTime: segment.end,
			text: segment.text,
			confidence: segment.confidence,
		}));
	}

	/**
	 * Get audio statistics for processing metrics
	 */
	getAudioStats(
		originalSize: number,
		duration: number,
		transcription?: TranscriptionResult,
	): {
		duration: string;
		fileSize: string;
		bitrate?: number;
		transcriptionStats?: {
			textLength: number;
			wordCount: number;
			speakers: number;
			segments: number;
			averageConfidence: number;
		};
	} {
		const stats: any = {
			duration: this.formatDuration(duration),
			fileSize: this.formatBytes(originalSize),
		};

		// Calculate bitrate if duration is available
		if (duration > 0) {
			stats.bitrate = Math.round((originalSize * 8) / duration / 1000); // kbps
		}

		// Add transcription statistics if available
		if (transcription) {
			stats.transcriptionStats = {
				textLength: transcription.text.length,
				wordCount: transcription.text.split(/\s+/).length,
				speakers: transcription.speakers.length,
				segments: transcription.segments.length,
				averageConfidence:
					transcription.segments.reduce((sum, seg) => sum + seg.confidence, 0) /
					transcription.segments.length,
			};
		}

		return stats;
	}

	/**
	 * Format duration to human readable string
	 */
	private formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
	 * Check if audio format is supported
	 */
	isFormatSupported(mimeType: string, filename: string): boolean {
		const supportedMimes = [
			'audio/mpeg',
			'audio/mp3',
			'audio/wav',
			'audio/x-wav',
			'audio/mp4',
			'audio/m4a',
			'audio/ogg',
			'audio/flac',
		];

		const extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);

		return supportedMimes.includes(mimeType) || this.supportedFormats.includes(extension);
	}
}

// Export singleton instance
export const audioTranscriptionService = new AudioTranscriptionService();
