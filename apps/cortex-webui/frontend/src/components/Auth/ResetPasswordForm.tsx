import type React from 'react';
import { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ResetPasswordFormProps {
  onSubmit?: (password: string) => void;
  loading?: boolean;
  error?: string | null;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSubmit,
  loading,
  error
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword: authResetPassword, isPending } = useAuthContext();

  // Get token from URL parameters
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    try {
      if (onSubmit) {
        onSubmit(password);
      } else if (token) {
        await authResetPassword(token, password);
        // Navigate to login on success
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      // Error is handled by the context
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-xl font-bold text-red-800 mb-2">Invalid Reset Link</h2>
          <p className="text-red-700">
            The password reset link is invalid or has expired. Please request a new reset link.
          </p>
        </div>
        <div className="mt-4 text-center">
          <a
            href="/forgot-password"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Request New Reset Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
            minLength={8}
            placeholder="••••••••"
          />
          <p className="text-xs text-gray-500 mt-1">
            Must be at least 8 characters long
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
            minLength={8}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isPending || !password || password !== confirmPassword}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading || isPending ? 'Resetting...' : 'Reset Password'}
        </button>

        <div className="text-center">
          <a
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            Back to Login
          </a>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;