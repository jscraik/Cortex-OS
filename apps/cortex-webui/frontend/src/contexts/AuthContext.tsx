import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { authClient, useAuth, authUtils } from "../lib/auth";
import { toast } from "sonner";

interface AuthContextType {
  user: any;
  session: any;
  isAuthenticated: boolean;
  isPending: boolean;
  error: any;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  // Password management
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  // Profile management
  updateProfile: (data: any) => Promise<void>;
  // OAuth account management
  linkOAuthAccount: (provider: string) => Promise<void>;
  unlinkOAuthAccount: (providerId: string, providerAccountId: string) => Promise<void>;
  // Utility methods
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  getDisplayName: () => string;
  getAvatarUrl: () => string | null;
  isEmailVerified: () => boolean;
  // OAuth providers
  oauthProviders: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
  // OAuth accounts
  oauthAccounts: any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();
  const [oauthAccounts, setOauthAccounts] = useState<any[]>([]);

  // Load OAuth accounts when authenticated
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      loadOAuthAccounts();
    } else {
      setOauthAccounts([]);
    }
  }, [auth.isAuthenticated, auth.user]);

  const loadOAuthAccounts = async () => {
    try {
      const response = await fetch("/api/oauth/accounts", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOauthAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to load OAuth accounts:", error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await auth.signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Login failed");
      }

      toast.success("Welcome back!");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const result = await auth.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Registration failed");
      }

      toast.success("Account created successfully! Please check your email for verification.");
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      toast.success("You have been logged out");
    } catch (error: any) {
      toast.error(error.message || "Failed to logout");
    }
  };

  const loginWithOAuth = async (provider: string) => {
    try {
      // Get OAuth URL
      const response = await fetch(`/api/oauth/${provider}/url`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get OAuth URL");
      }

      const { url, state } = await response.json();

      // Store state for validation
      sessionStorage.setItem(`oauth_${provider}_state`, state);

      // Redirect to OAuth provider
      window.location.href = url;
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate OAuth login");
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const result = await auth.forgotPassword(email);

      if (result.error) {
        throw new Error(result.error.message || "Failed to send reset email");
      }

      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const result = await auth.resetPassword({
        token,
        newPassword,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to reset password");
      }

      toast.success("Password reset successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
      throw error;
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const result = await auth.updatePassword({
        currentPassword,
        newPassword,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to update password");
      }

      toast.success("Password updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
      throw error;
    }
  };

  const updateProfile = async (data: any) => {
    try {
      const result = await auth.updateProfile(data);

      if (result.error) {
        throw new Error(result.error.message || "Failed to update profile");
      }

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
      throw error;
    }
  };

  const linkOAuthAccount = async (provider: string) => {
    try {
      // Get OAuth URL for linking
      const response = await fetch(`/api/oauth/${provider}/url`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get OAuth URL");
      }

      const { url, state } = await response.json();

      // Store state for validation
      sessionStorage.setItem(`oauth_link_${provider}_state`, state);

      // Redirect to OAuth provider
      window.location.href = url;
    } catch (error: any) {
      toast.error(error.message || "Failed to link OAuth account");
      throw error;
    }
  };

  const unlinkOAuthAccount = async (
    providerId: string,
    providerAccountId: string
  ) => {
    try {
      const response = await fetch("/api/oauth/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId,
          providerAccountId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to unlink OAuth account");
      }

      await loadOAuthAccounts();
      toast.success("OAuth account unlinked successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to unlink OAuth account");
      throw error;
    }
  };

  // OAuth providers list
  const oauthProviders = [
    { id: "github", name: "GitHub", icon: "github", color: "#24292e" },
    { id: "google", name: "Google", icon: "google", color: "#4285f4" },
    { id: "discord", name: "Discord", icon: "discord", color: "#5865f2" },
    { id: "microsoft", name: "Microsoft", icon: "microsoft", color: "#0078d4" },
  ];

  // Utility methods
  const hasRole = (role: string) => authUtils.hasRole(auth.user, role);
  const hasPermission = (permission: string) =>
    authUtils.hasPermission(auth.user, permission);
  const getDisplayName = () => authUtils.getDisplayName(auth.user);
  const getAvatarUrl = () => authUtils.getAvatarUrl(auth.user);
  const isEmailVerified = () => authUtils.isEmailVerified(auth.user);

  const value: AuthContextType = {
    user: auth.user,
    session: auth.session,
    isAuthenticated: auth.isAuthenticated,
    isPending: auth.isPending,
    error: auth.error,
    login,
    register,
    logout,
    loginWithOAuth,
    forgotPassword,
    resetPassword,
    updatePassword,
    updateProfile,
    linkOAuthAccount,
    unlinkOAuthAccount,
    hasRole,
    hasPermission,
    getDisplayName,
    getAvatarUrl,
    isEmailVerified,
    oauthProviders,
    oauthAccounts,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;