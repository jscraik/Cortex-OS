// Temporary placeholder auth implementation
// TODO: Update to match current better-auth API when ready

// Placeholder types
interface User {
	id: string;
	email: string;
	name: string;
	role?: string;
	image?: string | null;
	emailVerified?: boolean;
	permissions?: string[];
}

interface Session {
	id: string;
	userId: string;
	expires: number;
	token: string;
}

// Placeholder auth client
export const authClient = {
	useSession: () => ({
		data: null as { user: User; session: Session } | null,
		isPending: false,
		error: null,
	}),
	signIn: () => Promise.resolve({ success: true }),
	signUp: () => Promise.resolve({ success: true }),
	signOut: () => Promise.resolve({ success: true }),
};

// Authentication hooks
export const useAuth = () => {
	return {
		user: null as User | null,
		session: null as Session | null,
		isAuthenticated: false,
		isPending: false,
		error: null,
		// Authentication actions - placeholder implementations
		signIn: () => Promise.resolve({ success: true }),
		signUp: () => Promise.resolve({ success: true }),
		signOut: () => Promise.resolve({ success: true }),
		signInWithOAuth: () => Promise.resolve({ success: true }),
		refreshSession: () => Promise.resolve({ success: true }),
		updatePassword: () => Promise.resolve({ success: true }),
		forgotPassword: () => Promise.resolve({ success: true }),
		resetPassword: () => Promise.resolve({ success: true }),
		updateProfile: () => Promise.resolve({ success: true }),
		linkAccount: () => Promise.resolve({ success: true }),
		unlinkAccount: () => Promise.resolve({ success: true }),
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
	hasRole: (user: User | null, role: string): boolean => {
		return user?.role === role;
	},
	hasPermission: (user: User | null, permission: string): boolean => {
		return user?.permissions?.includes(permission) || false;
	},
	getDisplayName: (user: User | null): string => {
		if (!user) return '';
		return user.name || user.email || 'Unknown User';
	},
	getAvatarUrl: (user: User | null): string | null => {
		return user?.image || null;
	},
	isEmailVerified: (user: User | null): boolean => {
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
