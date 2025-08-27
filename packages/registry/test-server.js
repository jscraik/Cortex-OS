#!/usr/bin/env node

import path from 'path';
import { SchemaRegistry } from './src/index.js';

// Create a test contracts directory structure
const contractsPath = path.join(process.cwd(), 'test-contracts');

// Initialize the registry
const registry = new SchemaRegistry({
  port: 3001,
  contractsPath,
  corsOrigin: '*',
});

// Start the server
console.log('🚀 Starting Schema Registry test server...');
console.log(`📁 Contracts path: ${contractsPath}`);
console.log('🌐 Server will run on http://localhost:3001');
console.log('\nAvailable endpoints:');
console.log('  GET  /health - Health check');
console.log('  GET  /schemas - List all schemas');
console.log('  GET  /schemas/:id - Get specific schema');
console.log('  POST /validate/:id - Validate event against schema');
console.log('  GET  /categories/:category - Get schemas by category');

registry.start();
