import { type JWTVerifyResult, jwtVerify, SignJWT } from 'jose';
import type { AuthOptions, JWTPayload } from './types';

const DEFAULT_ALGORITHM = 'HS256';
const DEFAULT_EXPIRES_IN = '15m';

/**
 * Sign a JWT token
 * @param payload The payload to sign
 * @param secret The secret key
 * @param options Additional options
 * @returns The signed JWT token
 */
export async function signJWT(
	payload: Omit<JWTPayload, 'iat'>,
	secret: string,
	options: AuthOptions = {},
): Promise<string> {
	const {
		algorithm = DEFAULT_ALGORITHM,
		expiresIn = DEFAULT_EXPIRES_IN,
		issuer,
		audience,
	} = options;

	// Convert string secret to Uint8Array
	const secretKey = new TextEncoder().encode(secret);

	// Create and sign the JWT
	const jwt = await new SignJWT(payload)
		.setProtectedHeader({ alg: algorithm })
		.setIssuedAt()
		.setExpirationTime(expiresIn);

	if (issuer) {
		jwt.setIssuer(issuer);
	}

	if (audience) {
		jwt.setAudience(audience);
	}

	return await jwt.sign(secretKey);
}

/**
 * Verify a JWT token
 * @param token The JWT token to verify
 * @param secret The secret key
 * @param options Additional options
 * @returns The verified payload
 */
export async function verifyJWT(
	token: string,
	secret: string,
	options: Omit<AuthOptions, 'expiresIn'> = {},
): Promise<JWTPayload> {
	const { algorithm = DEFAULT_ALGORITHM, issuer, audience } = options;

	// Convert string secret to Uint8Array
	const secretKey = new TextEncoder().encode(secret);

	try {
		const { payload } = (await jwtVerify(token, secretKey, {
			algorithms: [algorithm],
			issuer,
			audience,
		})) as JWTVerifyResult & { payload: JWTPayload };

		return payload;
	} catch (error) {
		if (error instanceof Error) {
			// Re-throw with more descriptive message
			throw new Error(`JWT verification failed: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Create an access token for a user
 * @param userId The user ID
 * @param roles User roles
 * @param permissions User permissions
 * @param secret The secret key
 * @param options Additional options
 * @returns The access token
 */
export async function createAccessToken(
	userId: string,
	roles: string[],
	permissions: string[],
	secret: string,
	options: Omit<AuthOptions, 'expiresIn'> & { expiresIn?: string | number } = {},
): Promise<string> {
	const expiresIn = options.expiresIn || '15m';

	return await signJWT(
		{
			sub: userId,
			roles,
			permissions,
		},
		secret,
		{
			...options,
			expiresIn,
		},
	);
}

/**
 * Create a refresh token
 * @param userId The user ID
 * @param secret The secret key
 * @param options Additional options
 * @returns The refresh token
 */
export async function createRefreshToken(
	userId: string,
	secret: string,
	options: Omit<AuthOptions, 'expiresIn'> & { expiresIn?: string | number } = {},
): Promise<string> {
	const expiresIn = options.expiresIn || '7d';

	return await signJWT(
		{
			sub: userId,
			type: 'refresh',
		},
		secret,
		{
			...options,
			expiresIn,
		},
	);
}

/**
 * Refresh an access token using a refresh token
 * @param refreshToken The refresh token
 * @param secret The secret key
 * @param options Additional options
 * @returns The new access token
 */
export async function refreshAccessToken(
	refreshToken: string,
	secret: string,
	options: Omit<AuthOptions, 'expiresIn'> = {},
): Promise<{ accessToken: string; payload: JWTPayload }> {
	// Verify the refresh token
	const payload = await verifyJWT(refreshToken, secret, options);

	// Ensure it's a refresh token
	if (payload.type !== 'refresh') {
		throw new Error('Invalid refresh token');
	}

	// Create new access token
	const accessToken = await createAccessToken(
		payload.sub,
		payload.roles || [],
		payload.permissions || [],
		secret,
		options,
	);

	return {
		accessToken,
		payload: {
			...payload,
			type: 'access',
		},
	};
}
