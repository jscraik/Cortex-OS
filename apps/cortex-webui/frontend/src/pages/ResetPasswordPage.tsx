import { useNavigate } from 'react-router-dom';
import ResetPasswordForm from '../components/Auth/ResetPasswordForm';

interface ResetPasswordPageProps {
  onSubmit?: (password: string) => void;
  loading?: boolean;
  error?: string | null;
}

function ResetPasswordPage({ onSubmit, loading, error }: ResetPasswordPageProps) {
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your new password must be different from previous passwords
          </p>
        </div>
        <ResetPasswordForm
          onSubmit={onSubmit}
          loading={loading}
          error={error}
        />
        <div className="text-center">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;