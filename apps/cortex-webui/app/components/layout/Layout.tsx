'use client';

import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activePage: 'chat' | 'approvals' | 'crawl' | 'map' | 'puck';
}

const Layout: React.FC<LayoutProps> = ({ children, activePage }) => {
  return (
    <div className="flex h-screen">
      <Sidebar activePage={activePage} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
};

export default Layout;
