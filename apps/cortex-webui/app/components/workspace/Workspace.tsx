'use client';

import React, { useState } from 'react';
import FileItem from '../common/FileItem';
import Folder from '../common/Folder';

interface WorkspaceItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: WorkspaceItem[];
  size?: number;
  lastModified?: Date;
}

const Workspace: React.FC = () => {
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([
    {
      id: '1',
      name: 'Projects',
      type: 'folder',
      children: [
        {
          id: '2',
          name: 'brAInwav Cortex',
          type: 'folder',
          children: [
            {
              id: '3',
              name: 'Documentation',
              type: 'folder',
              children: [
                {
                  id: '4',
                  name: 'API.md',
                  type: 'file',
                  size: 10240,
                  lastModified: new Date(),
                },
                {
                  id: '5',
                  name: 'Setup.md',
                  type: 'file',
                  size: 5120,
                  lastModified: new Date(Date.now() - 86400000),
                },
              ],
            },
            {
              id: '6',
              name: 'src',
              type: 'folder',
              children: [
                {
                  id: '7',
                  name: 'index.ts',
                  type: 'file',
                  size: 2048,
                  lastModified: new Date(),
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: '8',
      name: 'Research',
      type: 'folder',
      children: [
        {
          id: '9',
          name: 'AI Models',
          type: 'folder',
          children: [
            {
              id: '10',
              name: 'GPT-4 Analysis.pdf',
              type: 'file',
              size: 204800,
              lastModified: new Date(Date.now() - 172800000),
            },
          ],
        },
      ],
    },
    {
      id: '11',
      name: 'Notes.txt',
      type: 'file',
      size: 1024,
      lastModified: new Date(Date.now() - 3600000),
    },
  ]);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1', '2']));
  const [selectedItem, setSelectedItem] = useState<WorkspaceItem | null>(null);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSelectItem = (item: WorkspaceItem) => {
    setSelectedItem(item);
  };

  const renderWorkspaceItem = (item: WorkspaceItem, depth = 0) => {
    if (item.type === 'folder') {
      const isExpanded = expandedFolders.has(item.id);
      return (
        <div key={item.id}>
          <Folder
            folder={item}
            depth={depth}
            isExpanded={isExpanded}
            onToggle={() => toggleFolder(item.id)}
            onSelect={handleSelectItem}
            isSelected={selectedItem?.id === item.id}
          />
          {isExpanded && item.children && (
            <div className="ml-4">
              {item.children.map((child) => renderWorkspaceItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div key={item.id} className="ml-4">
          <FileItem
            file={{
              id: item.id,
              name: item.name,
              size: item.size || 0,
              type: 'text/plain',
              lastModified: item.lastModified || new Date(),
            }}
            showActions={false}
          />
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">Workspace</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your files and folders in a structured workspace
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search workspace..."
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="p-2">{workspaceItems.map((item) => renderWorkspaceItem(item))}</div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedItem ? (
            <>
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {selectedItem.type === 'file' && selectedItem.lastModified
                      ? `Last modified: ${selectedItem.lastModified.toLocaleString()}`
                      : `${selectedItem.children?.length || 0} items`}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {selectedItem.type === 'folder' ? (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contents</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedItem.children?.map((child) => (
                        <div
                          key={child.id}
                          className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSelectItem(child)}
                        >
                          <div className="flex items-center">
                            {child.type === 'folder' ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-blue-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z"
                                  clipRule="evenodd"
                                />
                                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            <span className="ml-2 font-medium text-gray-900">{child.name}</span>
                          </div>
                          {child.type === 'file' && child.size && (
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.round(child.size / 1024)} KB
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">File Preview</h3>
                    <div className="border rounded p-4 bg-gray-50">
                      <p className="text-gray-600">
                        This is a preview of {selectedItem.name}. In a full implementation, this
                        would show the actual content of the file.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
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
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No item selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a file or folder from the workspace
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
