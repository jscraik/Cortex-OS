import React from 'react';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/Sidebar';
import { Conversation } from '../types';

interface DashboardProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onLogout,
  onToggleSidebar,
}) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r hidden md:block">
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onCreateConversation={onCreateConversation}
          onLogout={onLogout}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Cortex WebUI" onToggleSidebar={onToggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Welcome to Cortex WebUI</h2>
              <p className="text-gray-600 mb-6">
                Start a new conversation or select an existing one from the sidebar.
              </p>
              <button
                onClick={onCreateConversation}
                className="bg-blue-500 text-white rounded px-4 py-2"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
