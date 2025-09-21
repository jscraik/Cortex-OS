import { z } from 'zod';

// Base JWT Payload schema
export const JWTPayloadSchema = z.object({
	sub: z.string(), // Subject (user ID)
	iat: z.number().optional(), // Issued at
	exp: z.number().optional(), // Expiration time
	roles: z.array(z.string()).optional(), // User roles
	permissions: z.array(z.string()).optional(), // User permissions
	apiKeyId: z.string().optional(), // API Key ID if using API key auth
	type: z.enum(['access', 'refresh']).optional(), // Token type
	// Standard JWT claims
	iss: z.string().optional(), // Issuer
	aud: z.string().optional(), // Audience
	nbf: z.number().optional(), // Not before
	jti: z.string().optional(), // JWT ID
}).passthrough(); // Allow additional properties for flexibility

export type JWTPayload = z.infer<typeof JWTPayloadSchema> & {
	[key: string]: any; // Allow additional properties for testing and extensions
};

// User context from authentication
export interface UserContext {
	id: string;
	roles: string[];
	permissions: string[];
	apiKeyId?: string;
}

// API Key information
export interface APIKey {
	id: string;
	key: string;
	name: string;
	roles: string[];
	permissions: string[];
	createdAt: string;
	expiresAt?: string;
	lastUsed?: string;
}

// Authentication options
export interface AuthOptions {
	algorithm?: string;
	expiresIn?: string | number;
	issuer?: string;
	audience?: string;
}

// Middleware options
export interface AuthMiddlewareOptions {
	secret: string;
	jwtHeader?: string;
	skipPaths?: string[];
}

// Permission definition
export interface Permission {
	name: string;
	description: string;
	resource: string;
	action: string;
}

// Role definition
export interface Role {
	name: string;
	description: string;
	permissions: string[];
	inherits?: string[]; // Role inheritance
}
