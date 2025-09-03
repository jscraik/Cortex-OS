'use client';

import React, { useState } from 'react';
import notificationStore from '../../utils/notification-store';

interface Channel {
  id: string;
  name: string;
  description: string;
  members: number;
  isPrivate: boolean;
  lastActive: Date;
}

const Channels: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: '1',
      name: 'General',
      description: 'General discussions about brAInwav Cortex',
      members: 24,
      isPrivate: false,
      lastActive: new Date(),
    },
    {
      id: '2',
      name: 'Development',
      description: 'Technical discussions and development updates',
      members: 12,
      isPrivate: false,
      lastActive: new Date(Date.now() - 3600000),
    },
    {
      id: '3',
      name: 'AI Research',
      description: 'Research and experimentation with AI models',
      members: 8,
      isPrivate: true,
      lastActive: new Date(Date.now() - 86400000),
    },
  ]);

  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    isPrivate: false,
  });

  const handleCreateChannel = () => {
    if (newChannel.name.trim()) {
      const channel: Channel = {
        id: Date.now().toString(),
        name: newChannel.name,
        description: newChannel.description,
        members: 1,
        isPrivate: newChannel.isPrivate,
        lastActive: new Date(),
      };

      setChannels([channel, ...channels]);
      setNewChannel({ name: '', description: '', isPrivate: false });

      notificationStore.addNotification({
        type: 'success',
        message: `Channel #${channel.name} created successfully`,
      });
    }
  };

  const handleJoinChannel = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (channel) {
      notificationStore.addNotification({
        type: 'success',
        message: `Joined channel #${channel.name}`,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">Channels</h1>
        <p className="text-sm text-gray-500 mt-1">
          Collaborate with your team in dedicated channels
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Channel</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
              <input
                type="text"
                value={newChannel.name}
                onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                placeholder="e.g., project-updates"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newChannel.description}
                onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                placeholder="What's this channel about?"
                rows={2}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={newChannel.isPrivate}
                onChange={(e) => setNewChannel({ ...newChannel, isPrivate: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">Make this channel private</label>
            </div>
            <button
              onClick={handleCreateChannel}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Channel
            </button>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Available Channels</h2>
          {channels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="mt-2">No channels available</p>
              <p className="text-sm">Create a new channel to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => (
                <div key={channel.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">#{channel.name}</h3>
                        {channel.isPrivate && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="ml-2 h-4 w-4 text-gray-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{channel.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      {channel.members} members
                    </div>
                    <button
                      onClick={() => handleJoinChannel(channel.id)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Join
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Last active: {channel.lastActive.toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Channels;
