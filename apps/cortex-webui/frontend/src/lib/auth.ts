import { createAuthClient } from 'better-auth/react'; // Use React client for hooks

// Define user interface based on better-auth standard user structure
interface User {
	id: string;
	email: string;
	name: string;
	image?: string;
	emailVerified: boolean;
	role?: string;
	permissions?: string[];
}

// Create Better Auth client
export const authClient = createAuthClient({
	baseURL:
		process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3001',
});

// Extract commonly used methods from authClient
export const { useSession, signIn, signUp, signOut } = authClient;

// Authentication hooks
export const useAuth = () => {
	const session = useSession();
	const user = session.data?.user;
	const sessionData = session.data?.session;
	const isPending = session.isPending;
	const error = session.error;

	return {
		user,
		session: sessionData,
		isAuthenticated: !!user && !!sessionData,
		isPending,
		error,
		// Authentication actions
		signIn: authClient.signIn,
		signUp: authClient.signUp,
		signOut: authClient.signOut,
		// OAuth methods
		signInWithOAuth: authClient.signIn.social,
		// Password management
		forgotPassword: authClient.forgetPassword,
		resetPassword: authClient.resetPassword,
		changePassword: authClient.changePassword,
		// Account management
		unlinkAccount: authClient.unlinkAccount,
	};
};

// OAuth provider configuration
export const OAUTH_PROVIDERS = [
	{
		id: 'github',
		name: 'GitHub',
		icon: 'github',
		color: '#24292e',
	},
	{
		id: 'google',
		name: 'Google',
		icon: 'google',
		color: '#4285f4',
	},
	{
		id: 'discord',
		name: 'Discord',
		icon: 'discord',
		color: '#5865f2',
	},
	{
		id: 'microsoft',
		name: 'Microsoft',
		icon: 'microsoft',
		color: '#0078d4',
	},
];

// Helper functions
export const getOAuthProvider = (id: string) => {
	return OAUTH_PROVIDERS.find((provider) => provider.id === id);
};

// Authentication utilities
export const authUtils = {
	/**
	 * Check if user has specific role
	 */
	hasRole: (user: User | null | undefined, role: string): boolean => {
		return user?.role === role;
	},

	/**
	 * Check if user has specific permission
	 */
	hasPermission: (user: User | null | undefined, permission: string): boolean => {
		return user?.permissions?.includes(permission) || false;
	},

	/**
	 * Format user display name
	 */
	getDisplayName: (user: User | null | undefined): string => {
		if (!user) return '';
		return user.name || user.email || 'Unknown User';
	},

	/**
	 * Get user avatar URL
	 */
	getAvatarUrl: (user: User | null | undefined): string | null => {
		return user?.image || null;
	},

	/**
	 * Check if email is verified
	 */
	isEmailVerified: (user: User | null | undefined): boolean => {
		return user?.emailVerified || false;
	},
};

// Authentication error types
export const AUTH_ERRORS = {
	UNAUTHORIZED: 'UNAUTHORIZED',
	INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
	EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
	ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
	RATE_LIMITED: 'RATE_LIMITED',
	SESSION_EXPIRED: 'SESSION_EXPIRED',
	OAUTH_ERROR: 'OAUTH_ERROR',
	NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type AuthErrorType = keyof typeof AUTH_ERRORS;

// Authentication event handlers
export const createAuthEventHandlers = () => {
	return {
		onSuccess: (data: unknown) => {
			console.log('Authentication successful:', data);
			// You can emit custom events here
			window.dispatchEvent(new CustomEvent('auth:success', { detail: data }));
		},
		onError: (error: unknown) => {
			console.error('Authentication error:', error);
			window.dispatchEvent(new CustomEvent('auth:error', { detail: error }));
		},
		onTransition: (state: string) => {
			console.log('Auth state transition:', state);
			window.dispatchEvent(new CustomEvent('auth:transition', { detail: state }));
		},
	};
};

// Default export
export default authClient;
