/**
 * @file Tamper-Evident Audit System
 * @description Hash-chained audit logging with OpenTelemetry integration
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { Logger } from 'pino';

const DEFAULT_BRANDING = 'brAInwav Tamper-Evident Audit';

export interface AuditEventData {
	/** Event type */
	event_type: string;
	/** Event timestamp */
	timestamp: string;
	/** Actor performing the action */
	actor: string;
	/** Action being performed */
	action: string;
	/** Resource being acted upon */
	resource?: string;
	/** Additional event data */
	data?: Record<string, unknown>;
	/** Session/correlation ID */
	session_id?: string;
	/** brAInwav metadata */
	branding: string;
}

export interface TamperEvidentRecord {
	/** Unique record ID */
	record_id: string;
	/** Sequential record number */
	sequence: number;
	/** Hash of previous record */
	prev_hash: string;
	/** Event data */
	event: AuditEventData;
	/** Record timestamp */
	recorded_at: string;
	/** Hash of current record */
	record_hash: string;
	/** Digital signature (future enhancement) */
	signature?: string;
}

export interface AuditChainState {
	/** Current sequence number */
	sequence: number;
	/** Last record hash */
	last_hash: string;
	/** Chain start timestamp */
	chain_start: string;
	/** Total records in chain */
	total_records: number;
}

export interface AuditSystemConfig {
	/** Audit log file path */
	log_file_path: string;
	/** Chain state file path */
	state_file_path: string;
	/** Whether to emit OpenTelemetry events */
	telemetry_enabled: boolean;
	/** Telemetry service name */
	telemetry_service_name?: string;
	/** Maximum records per file before rotation */
	max_records_per_file?: number;
	/** Compression for rotated files */
	compress_rotated_files?: boolean;
}

export class TamperEvidentAuditSystem {
	private readonly logger: Logger;
	private readonly tracer;
	private chainState: AuditChainState;
	private readonly auditMutex = new AuditMutex();

	constructor(
		private readonly config: AuditSystemConfig,
		logger: Logger,
	) {
		this.logger = logger.child({
			component: 'tamper-evident-audit',
			branding: DEFAULT_BRANDING,
		});

		this.tracer = trace.getTracer(
			config.telemetry_service_name || 'brainwav-audit-system',
			'1.0.0',
		);

		// Initialize with empty state - will be loaded
		this.chainState = {
			sequence: 0,
			last_hash: 'genesis',
			chain_start: new Date().toISOString(),
			total_records: 0,
		};
	}

	/**
	 * Initialize audit system and load existing state
	 */
	async initialize(): Promise<void> {
		return this.tracer.startActiveSpan('audit.initialize', async (span) => {
			try {
				await this.loadChainState();

				this.logger.info(
					{
						sequence: this.chainState.sequence,
						total_records: this.chainState.total_records,
						chain_start: this.chainState.chain_start,
						branding: DEFAULT_BRANDING,
					},
					'brAInwav audit system initialized',
				);

				span.setStatus({ code: SpanStatusCode.OK });
			} catch (error) {
				this.logger.error(
					{
						error: error instanceof Error ? error.message : 'unknown init error',
						branding: DEFAULT_BRANDING,
					},
					'Failed to initialize brAInwav audit system',
				);

				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : 'unknown error',
				});
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Append an audit event to the tamper-evident chain
	 */
	async appendEvent(eventData: AuditEventData): Promise<TamperEvidentRecord> {
		return this.tracer.startActiveSpan('audit.append_event', async (span) => {
			return this.auditMutex.runExclusive(async () => {
				try {
					const record_id = `audit-${Date.now()}-${this.chainState.sequence + 1}`;
					const sequence = this.chainState.sequence + 1;
					const recorded_at = new Date().toISOString();

					// Create record
					const record: TamperEvidentRecord = {
						record_id,
						sequence,
						prev_hash: this.chainState.last_hash,
						event: {
							...eventData,
							timestamp: eventData.timestamp || recorded_at,
							branding: DEFAULT_BRANDING,
						},
						recorded_at,
						record_hash: '', // Will be calculated
					};

					// Calculate tamper-evident hash
					record.record_hash = this.calculateRecordHash(record);

					// Append to audit log
					await this.writeAuditRecord(record);

					// Update chain state
					this.chainState = {
						sequence,
						last_hash: record.record_hash,
						chain_start: this.chainState.chain_start,
						total_records: this.chainState.total_records + 1,
					};

					// Save updated state
					await this.saveChainState();

					// Emit telemetry event
					if (this.config.telemetry_enabled) {
						await this.emitTelemetryEvent(record);
					}

					span.setAttributes({
						'audit.record_id': record.record_id,
						'audit.sequence': sequence,
						'audit.event_type': eventData.event_type,
						'audit.actor': eventData.actor,
						'brainwav.branding': DEFAULT_BRANDING,
					});

					span.setStatus({ code: SpanStatusCode.OK });

					this.logger.debug(
						{
							record_id,
							sequence,
							event_type: eventData.event_type,
							actor: eventData.actor,
							branding: DEFAULT_BRANDING,
						},
						'brAInwav audit event appended to tamper-evident chain',
					);

					return record;
				} catch (error) {
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: error instanceof Error ? error.message : 'unknown error',
					});

					this.logger.error(
						{
							error: error instanceof Error ? error.message : 'unknown append error',
							branding: DEFAULT_BRANDING,
						},
						'Failed to append brAInwav audit event',
					);

					throw error;
				} finally {
					span.end();
				}
			});
		});
	}

	/**
	 * Verify the integrity of the audit chain
	 */
	async verifyChainIntegrity(
		start_sequence = 1,
		end_sequence?: number,
	): Promise<{
		valid: boolean;
		verified_records: number;
		first_invalid_sequence?: number;
		error?: string;
	}> {
		// eslint-disable-next-line sonarjs/cognitive-complexity
		return this.tracer.startActiveSpan('audit.verify_chain', async (span) => {
			try {
				const records = await this.readAuditRecords(start_sequence, end_sequence);
				let valid = true;
				let verified_records = 0;
				let first_invalid_sequence: number | undefined;

				let expected_prev_hash = start_sequence === 1 ? 'genesis' : '';

				for (const record of records) {
					// Verify previous hash linkage
					if (start_sequence > 1 && verified_records === 0) {
						// For partial verification, we need to trust the first record's prev_hash
						expected_prev_hash = record.prev_hash; // eslint-disable-line sonarjs/no-dead-store
					} else if (record.prev_hash !== expected_prev_hash) {
						valid = false;
						first_invalid_sequence = record.sequence;
						break;
					}

					// Verify record hash
					const calculated_hash = this.calculateRecordHash({
						...record,
						record_hash: '', // Exclude hash from calculation
					});

					if (record.record_hash !== calculated_hash) {
						valid = false;
						first_invalid_sequence = record.sequence;
						break;
					}

					expected_prev_hash = record.record_hash;
					verified_records++;
				}

				span.setAttributes({
					'audit.valid': valid,
					'audit.verified_records': verified_records,
					'audit.start_sequence': start_sequence,
					'audit.end_sequence': end_sequence || this.chainState.sequence,
					'brainwav.branding': DEFAULT_BRANDING,
				});

				if (!valid && first_invalid_sequence) {
					span.setAttributes({
						'audit.first_invalid_sequence': first_invalid_sequence,
					});
				}

				span.setStatus({ code: SpanStatusCode.OK });

				return {
					valid,
					verified_records,
					first_invalid_sequence,
					error: valid ? undefined : 'Chain integrity verification failed',
				};
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : 'unknown error',
				});

				return {
					valid: false,
					verified_records: 0,
					error: error instanceof Error ? error.message : 'Verification failed',
				};
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Get audit chain statistics
	 */
	getChainStats(): AuditChainState & {
		log_file_size?: number;
		integrity_last_verified?: string;
	} {
		return {
			...this.chainState,
			integrity_last_verified: new Date().toISOString(),
		};
	}

	private calculateRecordHash(record: Omit<TamperEvidentRecord, 'record_hash'>): string {
		// Create deterministic representation for hashing
		const hashInput = JSON.stringify(
			{
				record_id: record.record_id,
				sequence: record.sequence,
				prev_hash: record.prev_hash,
				event: record.event,
				recorded_at: record.recorded_at,
			},
			Object.keys(record).sort((a, b) => a.localeCompare(b)),
		);

		return createHash('sha256').update(hashInput, 'utf8').digest('hex');
	}

	private async writeAuditRecord(record: TamperEvidentRecord): Promise<void> {
		const logLine = JSON.stringify(record) + '\n';
		await appendFile(this.config.log_file_path, logLine, 'utf8');
	}

	private async readAuditRecords(
		start_sequence = 1,
		end_sequence?: number,
	): Promise<TamperEvidentRecord[]> {
		if (!existsSync(this.config.log_file_path)) {
			return [];
		}

		const content = await readFile(this.config.log_file_path, 'utf8');
		const lines = content
			.trim()
			.split('\n')
			.filter((line) => line.trim());
		const records: TamperEvidentRecord[] = [];

		for (const line of lines) {
			try {
				const record = JSON.parse(line) as TamperEvidentRecord;

				if (
					record.sequence >= start_sequence &&
					(!end_sequence || record.sequence <= end_sequence)
				) {
					records.push(record);
				}
			} catch {
				// Skip invalid JSON lines
			}
		}

		return records.sort((a, b) => a.sequence - b.sequence);
	}

	private async loadChainState(): Promise<void> {
		try {
			if (existsSync(this.config.state_file_path)) {
				const stateContent = await readFile(this.config.state_file_path, 'utf8');
				this.chainState = JSON.parse(stateContent);
			} else {
				// Initialize new chain
				await this.saveChainState();
			}
		} catch (error) {
			this.logger.warn(
				{
					error: error instanceof Error ? error.message : 'unknown state error',
					branding: DEFAULT_BRANDING,
				},
				'Failed to load brAInwav chain state, using defaults',
			);
		}
	}

	private async saveChainState(): Promise<void> {
		const stateContent = JSON.stringify(this.chainState, null, 2);
		await writeFile(this.config.state_file_path, stateContent, 'utf8');
	}

	private async emitTelemetryEvent(record: TamperEvidentRecord): Promise<void> {
		const span = this.tracer.startSpan('audit.telemetry_event');

		span.setAttributes({
			'audit.event.type': record.event.event_type,
			'audit.event.actor': record.event.actor,
			'audit.event.action': record.event.action,
			'audit.event.resource': record.event.resource || '',
			'audit.record.id': record.record_id,
			'audit.record.sequence': record.sequence,
			'brainwav.branding': DEFAULT_BRANDING,
		});

		span.end();
	}
}

/**
 * Simple mutex implementation for audit operations
 */
class AuditMutex {
	private locked = false;
	private queue: Array<() => void> = [];

	async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			const run = async () => {
				if (this.locked) {
					this.queue.push(run);
					return;
				}

				this.locked = true;
				try {
					const result = await fn();
					resolve(result);
				} catch (error) {
					reject(error);
				} finally {
					this.locked = false;
					const next = this.queue.shift();
					if (next) {
						setImmediate(next);
					}
				}
			};

			run();
		});
	}
}
