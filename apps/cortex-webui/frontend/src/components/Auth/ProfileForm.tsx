import type React from 'react';
import { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

interface ProfileFormData {
  name: string;
  email: string;
  image?: string;
}

interface ProfileFormProps {
  onSubmit?: (data: ProfileFormData) => void;
  loading?: boolean;
  error?: string | null;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  onSubmit,
  loading,
  error
}) => {
  const { user, updateProfile: authUpdateProfile, isPending } = useAuthContext();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || '',
    image: user?.image || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (onSubmit) {
        onSubmit(formData);
      } else {
        await authUpdateProfile(formData);
      }
    } catch (error) {
      // Error is handled by the context
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {formData.image ? (
              <img
                className="h-20 w-20 rounded-full object-cover"
                src={formData.image}
                alt="Profile"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-2xl text-gray-600">
                  {formData.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Picture URL
            </label>
            <input
              type="url"
              name="image"
              value={formData.image || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="john@example.com"
          />
          {user?.emailVerified && (
            <p className="text-sm text-green-600 mt-1">✓ Verified email</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || isPending}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading || isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Account Info */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium mb-4">Account Information</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">User ID:</span> {user?.id}
          </p>
          <p>
            <span className="font-medium">Role:</span> {user?.role || 'User'}
          </p>
          <p>
            <span className="font-medium">Created:</span> {new Date(user?.createdAt || '').toLocaleDateString()}
          </p>
          <p>
            <span className="font-medium">Last Login:</span> {user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'Never'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;