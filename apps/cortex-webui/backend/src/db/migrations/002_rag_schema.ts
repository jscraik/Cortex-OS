import type { Kysely } from 'kysely';
import type { Database } from '../index.js';

export async function up(db: Kysely<Database>): Promise<void> {
	// Create RAG documents table
	await db.schema
		.createTable('rag_documents')
		.addColumn('id', 'text', (col) => col.primaryKey())
		.addColumn('user_id', 'text', (col) => col.notNull())
		.addColumn('filename', 'text', (col) => col.notNull())
		.addColumn('original_name', 'text', (col) => col.notNull())
		.addColumn('mime_type', 'text', (col) => col.notNull())
		.addColumn('size', 'integer', (col) => col.notNull())
		.addColumn('total_chunks', 'integer', (col) => col.notNull())
		.addColumn('processed', 'integer', (col) => col.default(0).notNull()) // Boolean as integer
		.addColumn('processing_status', 'text', (col) => col.defaultTo('pending').notNull())
		.addColumn('processing_error', 'text')
		.addColumn('metadata', 'text')
		.addColumn('created_at', 'integer', (col) => col.defaultTo(Date.now()).notNull())
		.addColumn('updated_at', 'integer', (col) => col.defaultTo(Date.now()).notNull())
		.execute();

	// Create RAG document chunks table
	await db.schema
		.createTable('rag_document_chunks')
		.addColumn('id', 'text', (col) => col.primaryKey())
		.addColumn('document_id', 'text', (col) =>
			col.notNull().references('rag_documents.id').onDelete('cascade'),
		)
		.addColumn('content', 'text', (col) => col.notNull())
		.addColumn('chunk_index', 'integer', (col) => col.notNull())
		.addColumn('start_page', 'integer')
		.addColumn('end_page', 'integer')
		.addColumn('token_count', 'integer')
		.addColumn('embedding', 'text') // JSON array of vector values
		.addColumn('metadata', 'text') // JSON string for chunk metadata
		.addColumn('created_at', 'integer', (col) => col.defaultTo(Date.now()).notNull())
		.execute();

	// Create indexes for performance
	await db.schema
		.createIndex('idx_rag_documents_user_id')
		.on('rag_documents')
		.column('user_id')
		.execute();

	await db.schema
		.createIndex('idx_rag_documents_status')
		.on('rag_documents')
		.column('processing_status')
		.execute();

	await db.schema
		.createIndex('idx_rag_document_chunks_document_id')
		.on('rag_document_chunks')
		.column('document_id')
		.execute();

	await db.schema
		.createIndex('idx_rag_document_chunks_chunk_index')
		.on('rag_document_chunks')
		.column('document_id')
		.column('chunk_index')
		.execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
	// Drop indexes
	await db.schema.dropIndex('idx_rag_document_chunks_chunk_index').execute();
	await db.schema.dropIndex('idx_rag_document_chunks_document_id').execute();
	await db.schema.dropIndex('idx_rag_documents_status').execute();
	await db.schema.dropIndex('idx_rag_documents_user_id').execute();

	// Drop tables
	await db.schema.dropTable('rag_document_chunks').execute();
	await db.schema.dropTable('rag_documents').execute();
}
