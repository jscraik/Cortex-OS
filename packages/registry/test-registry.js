import { SchemaRegistry } from './dist/index.js';

console.log('Starting Schema Registry...');

const registry = new SchemaRegistry({
  port: 3001,
});

registry.start();
