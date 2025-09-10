// Conversation controller for Cortex WebUI backend

import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { ConversationService } from '../services/conversationService';

// Validation schemas
const createConversationSchema = z.object({
	title: z.string().min(1).max(100),
});

const updateConversationSchema = z.object({
	title: z.string().min(1).max(100).optional(),
});

const conversationIdSchema = z.object({
	id: z.string().uuid(),
});

export class ConversationController {
	static getConversations(req: AuthRequest, res: Response): void {
		try {
			if (!req.user) {
				throw new HttpError(401, 'Unauthorized');
			}

			const conversations = ConversationService.getConversationsByUserId(
				req.user.userId,
			);
			res.json(conversations);
		} catch (_error) {
			res.status(500).json({ error: 'Internal server error' });
		}
	}

	static getConversationById(req: AuthRequest, res: Response): void {
		try {
			if (!req.user) {
				throw new HttpError(401, 'Unauthorized');
			}

			const { id } = conversationIdSchema.parse(req.params);
			const conversation = ConversationService.getConversationById(id);

			if (!conversation) {
				throw new HttpError(404, 'Conversation not found');
			}

			// Check if user owns this conversation
			if (conversation.userId !== req.user.userId) {
				throw new HttpError(403, 'Forbidden');
			}

			res.json(conversation);
		} catch (error) {
			if (error instanceof z.ZodError) {
				res
					.status(400)
					.json({ error: 'Validation failed', details: error.errors });
			} else if (error instanceof HttpError) {
				res.status(error.statusCode).json({ error: error.message });
			} else {
				res.status(500).json({ error: 'Internal server error' });
			}
		}
	}

	static createConversation(req: AuthRequest, res: Response): void {
		try {
			if (!req.user) {
				throw new HttpError(401, 'Unauthorized');
			}

			const { title } = createConversationSchema.parse(req.body);
			const conversation = ConversationService.createConversation(
				req.user.userId,
				title,
			);
			res.status(201).json(conversation);
		} catch (error) {
			if (error instanceof z.ZodError) {
				res
					.status(400)
					.json({ error: 'Validation failed', details: error.errors });
			} else {
				res.status(500).json({ error: 'Internal server error' });
			}
		}
	}

	static updateConversation(req: AuthRequest, res: Response): void {
		try {
			if (!req.user) {
				throw new HttpError(401, 'Unauthorized');
			}

			const { id } = conversationIdSchema.parse(req.params);
			const updates = updateConversationSchema.parse(req.body);

			const conversation = ConversationService.getConversationById(id);
			if (!conversation) {
				throw new HttpError(404, 'Conversation not found');
			}

			// Check if user owns this conversation
			if (conversation.userId !== req.user.userId) {
				throw new HttpError(403, 'Forbidden');
			}

			const updatedConversation = ConversationService.updateConversation(
				id,
				updates,
			);
			res.json(updatedConversation);
		} catch (error) {
			if (error instanceof z.ZodError) {
				res
					.status(400)
					.json({ error: 'Validation failed', details: error.errors });
			} else if (error instanceof HttpError) {
				res.status(error.statusCode).json({ error: error.message });
			} else {
				res.status(500).json({ error: 'Internal server error' });
			}
		}
	}

	static deleteConversation(req: AuthRequest, res: Response): void {
		try {
			if (!req.user) {
				throw new HttpError(401, 'Unauthorized');
			}

			const { id } = conversationIdSchema.parse(req.params);
			const conversation = ConversationService.getConversationById(id);

			if (!conversation) {
				throw new HttpError(404, 'Conversation not found');
			}

			// Check if user owns this conversation
			if (conversation.userId !== req.user.userId) {
				throw new HttpError(403, 'Forbidden');
			}

			ConversationService.deleteConversation(id);
			res.json({ message: 'Conversation deleted successfully' });
		} catch (error) {
			if (error instanceof z.ZodError) {
				res
					.status(400)
					.json({ error: 'Validation failed', details: error.errors });
			} else if (error instanceof HttpError) {
				res.status(error.statusCode).json({ error: error.message });
			} else {
				res.status(500).json({ error: 'Internal server error' });
			}
		}
	}
}
