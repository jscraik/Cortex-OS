import { ModelRouter } from './src/model-router.js';

async function main() {
  const router = new ModelRouter();
  console.log('Initializing ModelRouter...');
  try {
    await router.initialize();
    console.log('Initialized');

    console.log('Calling generateChat...');
    const resp = await router.generateChat({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one sentence.' },
      ],
      model: 'auto',
      max_tokens: 200,
      temperature: 0.2,
    });

    console.log('Chat response:', resp);
  } catch (err) {
    console.error('Error during chat test:', err);
  }
}

main().catch(console.error);
