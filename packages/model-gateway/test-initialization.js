import { ModelRouter } from './src/model-router.js';

async function main() {
  console.log('Creating ModelRouter...');
  const router = new ModelRouter();

  console.log('Initializing ModelRouter...');
  try {
    await router.initialize();
    console.log('ModelRouter initialized successfully!');

    console.log('Testing embedding generation...');
    const emb = await router.generateEmbedding({ text: 'Hello from test', model: 'auto' });
    console.log('Embedding length:', emb.length);
  } catch (err) {
    console.error('Error during initialization or embedding:', err);
  }
}

main().catch(console.error);
