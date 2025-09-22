// Authentication hook for managing user state
// Updated to use Better Auth

import { useAuthContext } from '../contexts/AuthContext';

interface UseAuthReturn {
	user: any;
	loading: boolean;
	error: any;
	login: (email: string, password: string) => Promise<void>;
	register: (name: string, email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	isAuthenticated: boolean;
}

const useAuth = (): UseAuthReturn => {
	const {
		user,
		isAuthenticated,
		isPending: loading,
		error,
		login,
		register,
		logout,
	} = useAuthContext();

	return {
		user,
		loading,
		error,
		login,
		register,
		logout,
		isAuthenticated,
	};
};

export default useAuth;
