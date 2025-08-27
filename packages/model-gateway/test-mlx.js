import { MLXAdapter } from './src/adapters/mlx-adapter.js';

async function testMLXAdapter() {
  console.log('Testing MLX Adapter...');
  const adapter = new MLXAdapter();

  try {
    // Test embedding generation
    const result = await adapter.generateEmbedding({
      text: 'test text',
      model: 'qwen3-embedding-4b-mlx',
    });
    console.log('Embedding result:', result);
  } catch (error) {
    console.error('MLX Adapter error:', error);
  }
}

testMLXAdapter();
