/**
 * @file_path packages/mcp-bridge/src/mlx-mcp-integration.ts
 * @description MLX neuron integration factory for MCP system
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-28
 * @version 1.1.0
 * @status active
 */

import { z } from 'zod';
import { MLXMcpServer } from './mlx-mcp-server.js';
import { universalMcpManager } from './universal-mcp-manager.js';

const configPathSchema = z.string().min(1, 'MLX config path is required');
const portSchema = z.number().int().positive().max(65535);

function resolveConfigPath(configPath?: string): string {
  const resolved = configPath ?? process.env.MLX_CONFIG_PATH;
  if (!resolved || resolved.trim() === '') {
    // Optionally, set a default fallback path here, e.g. './mlx-config.json'
    // const fallbackPath = './mlx-config.json';
    // return fallbackPath;
    throw new Error(
      'MLX config path must be provided either as a function argument or via the MLX_CONFIG_PATH environment variable.'
    );
  }
  return configPathSchema.parse(resolved);
}

export function createMlxIntegration(configPath?: string) {
  const resolvedConfigPath = resolveConfigPath(configPath);
  const mlxServer = new MLXMcpServer(resolvedConfigPath);
  let isRegistered = false;

  async function autoRegister(): Promise<void> {
    if (isRegistered) {
      console.log('✅ MLX neuron already registered in MCP system');
      return;
    }

    try {
      await mlxServer.initialize();

      const installed = await universalMcpManager.isServerInstalled('mlx-neuron');
      if (installed) {
        console.log('✅ MLX neuron already registered as MCP server');
        isRegistered = true;
        return;
      }

      const mlxServerCommand =
        'cortex mcp add mlx-neuron --transport http --url http://localhost:8080/v1/chat/completions';

      const result = await universalMcpManager.addMcpServer(mlxServerCommand, true);

      if (result.success) {
        console.log('✅ MLX neuron automatically registered as MCP server');
        console.log('   - Name: mlx-neuron');
        console.log('   - Transport: HTTP');
        console.log('   - Endpoint: http://localhost:8080/v1/chat/completions');
        console.log(`   - Models: ${mlxServer.getAvailableModels().length} available`);
        isRegistered = true;
      } else {
        console.warn('⚠️ Failed to auto-register MLX neuron:', result.message);
      }
    } catch (error) {
      console.error('❌ Error during MLX auto-registration:', error);
    }
  }

  async function startMLXServer(port = 8080): Promise<void> {
    try {
      const p = portSchema.parse(port);
      const express = await import('express').then((m) => m.default);
      const app = express();

      app.use(express.json());

      app.post('/v1/chat/completions', async (req, res) => {
        try {
          const response = await mlxServer.chat(req.body);
          res.json(response);
        } catch (error) {
          res.status(500).json({
            error: {
              message: `MLX error: ${error}`,
              type: 'mlx_error',
            },
          });
        }
      });

      app.get('/health', async (req, res) => {
        try {
          const health = await mlxServer.getHealth();
          res.json(health);
        } catch (error) {
          res.status(500).json({ error: `Health check failed: ${error}` });
        }
      });

      app.get('/v1/models', (req, res) => {
        try {
          const models = mlxServer.getAvailableModels();
          res.json({
            object: 'list',
            data: models.map((model) => ({
              id: model.id,
              object: 'model',
              created: Date.now(),
              owned_by: 'cortex-os-mlx',
              permission: [],
              root: model.id,
              parent: null,
            })),
          });
        } catch (error) {
          res.status(500).json({ error: `Models list failed: ${error}` });
        }
      });

      await new Promise<void>((resolve) => {
        app.listen(p, '127.0.0.1', () => {
          console.log(`🚀 MLX MCP server running on http://127.0.0.1:${p}`);
          console.log('   - Chat: POST /v1/chat/completions');
          console.log('   - Models: GET /v1/models');
          console.log('   - Health: GET /health');
          resolve();
        });
      });
    } catch (error) {
      console.error('❌ Failed to start MLX HTTP server:', error);
    }
  }

  function getMLXServer(): MLXMcpServer {
    return mlxServer;
  }

  return { autoRegister, startMLXServer, getMLXServer };
}

export async function startIntegration(configPath?: string, port = 8080) {
  const integration = createMlxIntegration(configPath);
  await integration.startMLXServer(port);
  await integration.autoRegister();
  return integration;
}
