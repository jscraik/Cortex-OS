import type { NextFunction, Request, Response } from 'express';
import { resolveRoleForKey } from './api-keys';

interface RoleRequest extends Request {
	userRole?: 'admin' | 'user';
}

function extractApiKey(req: Request): string | undefined {
	return (req.header('X-API-Key') || req.header('x-api-key') || undefined)?.trim();
}

function extractBearer(req: Request): string | undefined {
	const auth = req.header('Authorization') || req.header('authorization');
	if (!auth) return undefined;
	const m = /^Bearer\s+(.+)$/i.exec(auth);
	return m ? m[1] : undefined;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
	const expectedKey = process.env.API_KEY?.trim();
	const providedKey = extractApiKey(req);
	const bearer = extractBearer(req);

	// Accept either a valid API key or a bearer token (JWT validation can be added later)
	if (!providedKey && !bearer) {
		res.status(401).json({ error: 'API key required' });
		return;
	}
	if (providedKey && expectedKey && providedKey !== expectedKey) {
		res.status(401).json({ error: 'Invalid API key' });
		return;
	}
	// Enrich request with role if available via API key store
	const resolved = resolveRoleForKey(providedKey);
	if (resolved) {
		(req as RoleRequest).userRole = resolved;
	}
	next();
}

function getRole(req: Request): string | undefined {
	const attached = (req as RoleRequest).userRole;
	if (attached) return attached;
	const hdr = (req.header('X-Role') || req.header('x-role') || '').trim();
	return hdr || undefined;
}

// Minimal RBAC for tools call endpoint
export function rbacToolsCall(req: Request, res: Response, next: NextFunction): void {
	const role = getRole(req);
	const body = (req.body || {}) as { method?: string; params?: { name?: string } };
	const isAdminOnly = body.method === 'tools/call' && body.params?.name === 'admin_only_tool';

	if (isAdminOnly && role !== 'admin') {
		res.status(403).json({ error: 'Insufficient permissions' });
		return;
	}
	next();
}
