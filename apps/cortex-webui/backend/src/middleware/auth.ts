// Authentication middleware for Cortex WebUI backend

import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService.js';

export interface AuthRequest extends Request {
	user?: {
		userId: string;
	};
}

export const authenticateToken = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const authHeader = req.headers.authorization;
	const token = authHeader?.split(' ')[1]; // Bearer TOKEN

	if (!token) {
		res.status(401).json({ error: 'Access token required' });
		return;
	}

	try {
		const decoded = AuthService.verifyToken(token);
		if (!decoded) {
			res.status(403).json({ error: 'Invalid or expired token' });
			return;
		}

		// Optionally, fetch user details
		const user = await UserService.getUserById(decoded.userId);
		if (!user) {
			res.status(403).json({ error: 'User not found' });
			return;
		}

		req.user = decoded;
		next();
	} catch {
		res.status(403).json({ error: 'Invalid token' });
	}
};
