import { type Request, type Response, Router } from 'express';
import { generateApiKey, listApiKeys, revokeApiKey } from '../../security/api-keys';
import { authMiddleware } from '../../security/auth-middleware';

function isAdmin(req: Request): boolean {
	const role = (req.header('X-Role') || req.header('x-role') || '').trim();
	return role === 'admin';
}

export function createAdminRouter(): Router {
	const router = Router();
	router.use(authMiddleware);

	router.get('/keys', (req: Request, res: Response) => {
		if (!isAdmin(req)) {
			res.status(403).json({ error: 'Admin only' });
			return;
		}
		res.json({ keys: listApiKeys() });
	});

	router.post('/keys', (req: Request, res: Response) => {
		if (!isAdmin(req)) {
			res.status(403).json({ error: 'Admin only' });
			return;
		}
		const { role = 'user', label } = (req.body || {}) as {
			role?: 'admin' | 'user';
			label?: string;
		};
		const rec = generateApiKey(role, label);
		res.status(201).json(rec);
	});

	router.delete('/keys/:key', (req: Request, res: Response) => {
		if (!isAdmin(req)) {
			res.status(403).json({ error: 'Admin only' });
			return;
		}
		const ok = revokeApiKey(req.params.key);
		res.json({ revoked: ok });
	});

	return router;
}
