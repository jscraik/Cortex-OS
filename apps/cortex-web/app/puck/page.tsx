'use client';

import { Puck } from '@measured/puck';
import '@measured/puck/puck.css';
import { z } from 'zod';

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
    <main className="p-4" aria-label="puck editor">
      <h1>Puck Editor</h1>
      <Puck config={config} data={{}} onPublish={handlePublish} />
    </main>
  );
}
