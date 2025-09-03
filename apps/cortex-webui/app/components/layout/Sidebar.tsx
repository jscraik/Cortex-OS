'use client';

import Link from 'next/link';
import React from 'react';

interface SidebarProps {
  activePage: 'chat' | 'approvals' | 'crawl' | 'map' | 'puck';
}

const Sidebar: React.FC<SidebarProps> = ({ activePage }) => {
  const navItems = [
    { id: 'chat', label: 'Chat', href: '/mvp/chat' },
    { id: 'approvals', label: 'Approvals', href: '/approvals' },
    { id: 'crawl', label: 'Crawl', href: '/crawl' },
    { id: 'map', label: 'Map', href: '/mvp/map' },
    { id: 'puck', label: 'Puck', href: '/puck' },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Cortex WebUI</h2>
      </div>
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`block px-4 py-2 rounded ${
                  activePage === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t text-xs text-gray-500">
        <p>brAInwav Cortex OS</p>
      </div>
    </div>
  );
};

export default Sidebar;
