import { ModelRouter } from './src/model-router';

async function main() {
  console.log('Creating ModelRouter...');
  const router = new ModelRouter();

  console.log('Initializing ModelRouter...');
  try {
    await router.initialize();
    console.log('ModelRouter initialized successfully!');

    console.log('Testing embedding generation...');
    const { embedding } = await router.generateEmbedding({ text: 'Hello from test', model: 'auto' });
    console.log('Embedding length:', embedding.length);
  } catch (err) {
    console.error('Error during initialization or embedding:', err);
  }
}

main().catch(console.error);
