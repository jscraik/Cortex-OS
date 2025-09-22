// Message controller for Cortex WebUI backend

import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { ConversationService } from '../services/conversationService';
import {
	createMessage as createMessageService,
	getMessagesByConversationId as getMessagesById,
} from '../services/messageService';

// Validation schemas
const conversationIdSchema = z.object({
	conversationId: z.string().uuid(),
});

const createMessageSchema = z.object({
	content: z.string().min(1),
	role: z.enum(['user', 'assistant', 'system']),
});

export const getMessagesByConversationId = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		if (!req.user) {
			throw new HttpError(401, 'Unauthorized');
		}

		const { conversationId } = conversationIdSchema.parse(req.params);

		// Verify conversation exists and belongs to user
		const conversation = await ConversationService.getConversationById(conversationId);
		if (!conversation) {
			throw new HttpError(404, 'Conversation not found');
		}

		if (conversation.userId !== req.user.userId) {
			throw new HttpError(403, 'Forbidden');
		}

		const messages = await getMessagesById(conversationId);
		res.json(messages);
	} catch (error) {
		if (error instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: error.errors });
		} else if (error instanceof HttpError) {
			res.status(error.statusCode).json({ error: error.message });
		} else {
			res.status(500).json({ error: 'Internal server error' });
		}
	}
};

export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		if (!req.user) {
			throw new HttpError(401, 'Unauthorized');
		}

		const { conversationId } = conversationIdSchema.parse(req.params);
		const { content, role } = createMessageSchema.parse(req.body);

		// Verify conversation exists and belongs to user
		const conversation = await ConversationService.getConversationById(conversationId);
		if (!conversation) {
			throw new HttpError(404, 'Conversation not found');
		}

		if (conversation.userId !== req.user.userId) {
			throw new HttpError(403, 'Forbidden');
		}

		const message = await createMessageService(conversationId, role, content);
		res.status(201).json(message);
	} catch (error) {
		if (error instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: error.errors });
		} else if (error instanceof HttpError) {
			res.status(error.statusCode).json({ error: error.message });
		} else {
			res.status(500).json({ error: 'Internal server error' });
		}
	}
};
