import type { Kysely } from 'kysely';

export interface MultimodalMigration {
	// Multimodal documents table
	multimodal_documents?: {
		id: string;
		user_id: string;
		filename: string;
		original_name: string;
		mime_type: string;
		modality: 'text' | 'image' | 'audio' | 'video' | 'pdf_with_images';
		size: number;
		total_chunks: number;
		processed: boolean;
		processing_status: 'pending' | 'processing' | 'completed' | 'failed';
		processing_error?: string;
		metadata?: string;
		created_at: Date;
		updated_at: Date;
	};

	// Multimodal chunks table
	multimodal_chunks?: {
		id: string;
		document_id: string;
		content: string;
		chunk_index: number;
		modality: 'text' | 'image' | 'audio_transcript' | 'video_frame' | 'pdf_page_image';
		start_page?: number;
		end_page?: number;
		start_time?: number;
		end_time?: number;
		token_count?: number;
		embedding?: string;
		metadata?: string;
		created_at: Date;
		updated_at: Date;
	};
}

export async function up(db: Kysely<any>): Promise<void> {
	// Create multimodal_documents table
	await db.schema
		.createTable('multimodal_documents')
		.addColumn('id', 'text', (col) => col.primaryKey())
		.addColumn('user_id', 'text', (col) => col.notNull())
		.addColumn('filename', 'text', (col) => col.notNull())
		.addColumn('original_name', 'text', (col) => col.notNull())
		.addColumn('mime_type', 'text', (col) => col.notNull())
		.addColumn('modality', 'text', (col) =>
			col.notNull().check((col) => col.in(['text', 'image', 'audio', 'video', 'pdf_with_images'])),
		)
		.addColumn('size', 'integer', (col) => col.notNull())
		.addColumn('total_chunks', 'integer', (col) => col.notNull())
		.addColumn('processed', 'integer', (col) => col.notNull().default(0)) // boolean
		.addColumn('processing_status', 'text', (col) =>
			col
				.notNull()
				.default('pending')
				.check((col) => col.in(['pending', 'processing', 'completed', 'failed'])),
		)
		.addColumn('processing_error', 'text')
		.addColumn('metadata', 'text')
		.addColumn('created_at', 'integer', (col) => col.notNull().default(Date.now()))
		.addColumn('updated_at', 'integer', (col) => col.notNull().default(Date.now()))
		.execute();

	// Create multimodal_chunks table
	await db.schema
		.createTable('multimodal_chunks')
		.addColumn('id', 'text', (col) => col.primaryKey())
		.addColumn('document_id', 'text', (col) => col.notNull())
		.addColumn('content', 'text', (col) => col.notNull())
		.addColumn('chunk_index', 'integer', (col) => col.notNull())
		.addColumn('modality', 'text', (col) =>
			col
				.notNull()
				.check((col) =>
					col.in(['text', 'image', 'audio_transcript', 'video_frame', 'pdf_page_image']),
				),
		)
		.addColumn('start_page', 'integer')
		.addColumn('end_page', 'integer')
		.addColumn('start_time', 'integer') // seconds
		.addColumn('end_time', 'integer') // seconds
		.addColumn('token_count', 'integer')
		.addColumn('embedding', 'text') // JSON array
		.addColumn('metadata', 'text') // JSON string
		.addColumn('created_at', 'integer', (col) => col.notNull().default(Date.now()))
		.addColumn('updated_at', 'integer', (col) => col.notNull().default(Date.now()))
		.addForeignKeyConstraint(
			'fk_multimodal_chunks_document_id',
			['document_id'],
			'multimodal_documents',
			['id'],
			{ onDelete: 'cascade' },
		)
		.execute();

	// Create indexes for performance
	await db.schema
		.createIndex('idx_multimodal_documents_user_id')
		.on('multimodal_documents')
		.column('user_id')
		.execute();

	await db.schema
		.createIndex('idx_multimodal_documents_modality')
		.on('multimodal_documents')
		.column('modality')
		.execute();

	await db.schema
		.createIndex('idx_multimodal_documents_processing_status')
		.on('multimodal_documents')
		.column('processing_status')
		.execute();

	await db.schema
		.createIndex('idx_multimodal_chunks_document_id')
		.on('multimodal_chunks')
		.column('document_id')
		.execute();

	await db.schema
		.createIndex('idx_multimodal_chunks_modality')
		.on('multimodal_chunks')
		.column('modality')
		.execute();

	await db.schema
		.createIndex('idx_multimodal_chunks_start_time')
		.on('multimodal_chunks')
		.column('start_time')
		.execute();

	await db.schema
		.createIndex('idx_multimodal_chunks_end_time')
		.on('multimodal_chunks')
		.column('end_time')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop indexes first
	await db.schema.dropIndex('idx_multimodal_chunks_end_time').execute();
	await db.schema.dropIndex('idx_multimodal_chunks_start_time').execute();
	await db.schema.dropIndex('idx_multimodal_chunks_modality').execute();
	await db.schema.dropIndex('idx_multimodal_chunks_document_id').execute();
	await db.schema.dropIndex('idx_multimodal_documents_processing_status').execute();
	await db.schema.dropIndex('idx_multimodal_documents_modality').execute();
	await db.schema.dropIndex('idx_multimodal_documents_user_id').execute();

	// Drop tables in reverse order due to foreign key constraints
	await db.schema.dropTable('multimodal_chunks').execute();
	await db.schema.dropTable('multimodal_documents').execute();
}
