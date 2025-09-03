import React from 'react';
import RegisterForm from '../components/Auth/RegisterForm';

interface RegisterPageProps {
  onRegister: (name: string, email: string, password: string) => void;
  loading: boolean;
  error: string | null;
  onSwitchToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegister,
  loading,
  error,
  onSwitchToLogin,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create an account
          </h2>
        </div>
        <RegisterForm onRegister={onRegister} loading={loading} error={error} />
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
