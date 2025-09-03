/* @ts-nocheck */
'use client';

import Chat from '../../components/chat/Chat';
import Layout from '../../components/layout/Layout';

export default function ChatPage() {
  return (
    <Layout activePage="chat">
      <main className="h-full flex flex-col" aria-label="Chat interface">
        <a href="#composer" className="sr-only focus:not-sr-only focus:underline">
          Skip to composer
        </a>
        <Chat />
      </main>
    </Layout>
  );
}
