'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import SearchModal from './SearchModal';

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { name: 'Chat', href: '/mvp/chat' },
    { name: 'Map', href: '/mvp/map' },
    { name: 'Approvals', href: '/approvals' },
    { name: 'Crawl', href: '/crawl' },
    { name: 'Puck', href: '/puck' },
  ];

  return (
    <>
      <div className="w-64 bg-white border-r flex flex-col" role="banner">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">brAInwav</h1>
          <p className="text-xs text-gray-500">Cortex WebUI</p>
        </div>

        <div className="p-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center p-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <span className="ml-3">Search...</span>
            <span className="ml-auto text-xs text-gray-400">⌘K</span>
          </button>
        </div>

        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center p-2 text-sm rounded-lg ${
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="ml-3">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
              U
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-gray-500">user@example.com</p>
            </div>
          </div>
        </div>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Sidebar;
