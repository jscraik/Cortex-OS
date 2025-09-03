'use client';

import { Puck } from '@measured/puck';
import '@measured/puck/puck.css';
import { z } from 'zod';
import Layout from '../components/layout/Layout';

const config = {
  components: {
    HeadingBlock: {
      fields: {
        text: { type: 'text' },
      },
      render: ({ text }: { text: string }) => <h1>{text}</h1>,
    },
  },
};

const dataSchema = z.unknown();

export default function PuckPage() {
  function handlePublish(data: unknown) {
    // Validate incoming data before using it
    const validData = dataSchema.parse(data);
    console.log('puck data', validData);
  }

  return (
    <Layout activePage="puck">
      <main className="p-4 h-full" aria-label="puck editor">
        <h1>Puck Editor</h1>
        <Puck config={config} data={{}} onPublish={handlePublish} />
      </main>
    </Layout>
  );
}
