import { ConfigSchema } from '../src/schema.js';

console.log('# Config Options');
for (const key of Object.keys(ConfigSchema.shape)) {
  console.log(`- ${key}`);
}
