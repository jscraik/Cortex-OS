// Authentication controller for Cortex WebUI backend

import type { Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { AuthService } from '../services/authService';

// Validation schemas
const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const registerSchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(8),
});

export class AuthController {
	static async login(req: Request, res: Response): Promise<void> {
		try {
			const { email, password } = loginSchema.parse(req.body);

			const result = await AuthService.login(email, password);
			if (!result) {
				throw new HttpError(401, 'Invalid email or password');
			}

			res.json(result);
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

	static async register(req: Request, res: Response): Promise<void> {
		try {
			const { name, email, password } = registerSchema.parse(req.body);

			const result = await AuthService.register(name, email, password);
			res.status(201).json(result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				res
					.status(400)
					.json({ error: 'Validation failed', details: error.errors });
			} else if (
				error instanceof Error &&
				error.message.includes('already exists')
			) {
				res.status(409).json({ error: error.message });
			} else {
				res.status(500).json({ error: 'Internal server error' });
			}
		}
	}

	static async logout(req: Request, res: Response): Promise<void> {
		try {
			// In a real implementation, we might want to blacklist the token
			// For now, we'll just return success
			res.json({ message: 'Logged out successfully' });
		} catch (_error) {
			res.status(500).json({ error: 'Internal server error' });
		}
	}
}
