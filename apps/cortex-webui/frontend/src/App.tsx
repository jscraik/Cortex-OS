// Main App component

import React, { useEffect, useState } from 'react';
import useAuth from './hooks/useAuth';
import useConversations from './hooks/useConversations';
import useMessages from './hooks/useMessages';
import ChatPage from './pages/ChatPage';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import { applyTheme, Theme, toggleTheme } from './utils/theme';

type Page = 'login' | 'register' | 'dashboard' | 'chat' | 'settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [theme, setTheme] = useState<Theme>('light');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const auth = useAuth();
  const conversations = useConversations();
  const messages = useMessages();

  // Apply theme on mount
  useEffect(() => {
    applyTheme();
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  // Handle authentication state changes
  useEffect(() => {
    if (auth.isAuthenticated) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('login');
    }
  }, [auth.isAuthenticated]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await auth.login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    try {
      await auth.register(name, email, password);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (conversations.activeConversation) {
      await messages.sendMessage(conversations.activeConversation.id, content);
    }
  };

  const handleCreateConversation = async () => {
    const newConversation = await conversations.createConversation('New Conversation');
    if (newConversation) {
      setCurrentPage('chat');
    }
  };

  const handleSelectConversation = async (id: string) => {
    await conversations.selectConversation(id);
    setCurrentPage('chat');
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    toggleTheme();
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <LoginPage
            onLogin={handleLogin}
            loading={auth.loading}
            error={auth.error}
            onSwitchToRegister={() => setCurrentPage('register')}
          />
        );

      case 'register':
        return (
          <RegisterPage
            onRegister={handleRegister}
            loading={auth.loading}
            error={auth.error}
            onSwitchToLogin={() => setCurrentPage('login')}
          />
        );

      case 'dashboard':
        return (
          <Dashboard
            conversations={conversations.conversations}
            activeConversationId={conversations.activeConversation?.id || null}
            onSelectConversation={handleSelectConversation}
            onCreateConversation={handleCreateConversation}
            onLogout={auth.logout}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        );

      case 'chat':
        if (!conversations.activeConversation) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500">No conversation selected</p>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="mt-4 text-blue-500 hover:text-blue-700"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          );
        }

        return (
          <ChatPage
            conversation={conversations.activeConversation}
            messages={messages.messages}
            conversations={conversations.conversations}
            activeConversationId={conversations.activeConversation?.id || null}
            onSendMessage={handleSendMessage}
            onSelectConversation={handleSelectConversation}
            onCreateConversation={handleCreateConversation}
            onLogout={auth.logout}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            streaming={messages.streaming}
            error={messages.error}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            theme={theme}
            onThemeChange={handleThemeChange}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        );

      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Page not found</p>
          </div>
        );
    }
  };

  return <div className="App">{renderCurrentPage()}</div>;
};

export default App;
