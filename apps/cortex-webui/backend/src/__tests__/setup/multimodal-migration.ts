import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm/sqlite-core';
import type { Kysely } from 'kysely';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import migration function
async function runMultimodalMigration(db: Kysely<any>) {
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

	console.log('Multimodal migration completed successfully');
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const sqlite = new Database(path.join(__dirname, '../../../data/test-multimodal.db'));
	const db = drizzle(sqlite);

	try {
		await runMultimodalMigration({ schema: db.schema } as any);
		console.log('✅ Multimodal database schema created successfully');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	} finally {
		sqlite.close();
	}
}

export { runMultimodalMigration };
