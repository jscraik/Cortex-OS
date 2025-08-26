#!/usr/bin/env node

/**
 * @file_path apps/cortex-os/packages/mcp/src/scripts/embed-mlx-neuron.mjs
 * @description Auto-embed MLX neuron into MCP system
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { mlxMcpIntegration } from '../mlx-mcp-integration.js';

console.log('🧠 Embedding MLX neuron into MCP system...');

try {
  // Start MLX HTTP server and auto-register
  await mlxMcpIntegration.startMLXServer(8080);

  console.log('✅ MLX neuron successfully embedded in MCP system');
  console.log('🎯 MLX is now available to all MCP frontends:');
  console.log('   - cortex mcp add mlx-neuron');
  console.log('   - claude desktop mcp');
  console.log('   - vs code extensions');
  console.log('   - github copilot');
  console.log('   - gemini cli');
} catch (error) {
  console.error('❌ Failed to embed MLX neuron:', error);
  process.exit(1);
}
