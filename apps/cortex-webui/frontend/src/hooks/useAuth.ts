// Authentication hook for managing user state

import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import storage from '../services/storage';
import { User } from '../types';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a stored token
        const token = storage.getItem('authToken');
        if (token) {
          // In a real app, we would validate the token with the backend
          // For now, we'll just check if we have stored user data
          const storedUser = storage.getJSON<User>('user');
          if (storedUser) {
            setUser(storedUser);
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { user, token } = await authAPI.login(email, password);
      setUser(user);
      storage.setItem('authToken', token);
      storage.setJSON('user', user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { user, token } = await authAPI.register(name, email, password);
      setUser(user);
      storage.setItem('authToken', token);
      storage.setJSON('user', user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUser(null);
      storage.removeItem('authToken');
      storage.removeItem('user');
    }
  };

  const isAuthenticated = !!user;

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
