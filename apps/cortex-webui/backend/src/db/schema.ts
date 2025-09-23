import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Better Auth tables
export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
	name: text('name'),
	image: text('image'),
	passwordHash: text('password_hash'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	sessionToken: text('session_token').notNull().unique(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expires: integer('expires').notNull(),
	userAgent: text('user_agent'),
	ipAddress: text('ip_address'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	providerId: text('provider_id').notNull(),
	providerAccountId: text('provider_account_id').notNull(),
	type: text('type').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	expiresAt: integer('expires_at'),
	tokenType: text('token_type'),
	scope: text('scope'),
	sessionState: text('session_state'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expires: integer('expires').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

// Cortex-OS application tables
export const conversations = sqliteTable('conversations', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	userId: text('user_id').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

export const messages = sqliteTable('messages', {
	id: text('id').primaryKey(),
	conversationId: text('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
	content: text('content').notNull(),
	metadata: text('metadata'), // JSON string for additional data
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

export const models = sqliteTable('models', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	apiBase: text('api_base'),
	apiKey: text('api_key'),
	isActive: integer('is_active', { mode: 'boolean' }).default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

export const approvals = sqliteTable('approvals', {
	id: text('id').primaryKey(),
	sessionId: text('session_id').notNull(),
	toolName: text('tool_name').notNull(),
	description: text('description').notNull(),
	status: text('status', { enum: ['pending', 'approved', 'rejected'] })
		.notNull()
		.default('pending'),
	metadata: text('metadata'), // JSON string for additional data
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

export const files = sqliteTable('files', {
	id: text('id').primaryKey(),
	filename: text('filename').notNull(),
	originalName: text('original_name').notNull(),
	mimetype: text('mimetype').notNull(),
	size: integer('size').notNull(),
	path: text('path').notNull(),
	userId: text('user_id').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()),
});

// Export types
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type File = typeof files.$inferSelect;

// Insert types
export type NewUser = typeof user.$inferInsert;
export type NewSession = typeof session.$inferInsert;
export type NewAccount = typeof account.$inferInsert;
export type NewVerification = typeof verification.$inferInsert;
export type NewConversation = typeof conversations.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;
export type NewModel = typeof models.$inferInsert;
export type NewApproval = typeof approvals.$inferInsert;
export type NewFile = typeof files.$inferInsert;
