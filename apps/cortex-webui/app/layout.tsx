import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Cortex WebUI',
  description: 'A modern web interface for AI models',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
