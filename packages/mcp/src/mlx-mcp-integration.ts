/**
 * @file_path apps/cortex-os/packages/mcp/src/mlx-mcp-integration.ts
 * @description Auto-register MLX neuron as MCP server in the universal system
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { MLXMcpServer } from './mlx-mcp-server.js';
import { universalMcpManager } from './universal-mcp-manager.js';

/**
 * MLX MCP Integration - Automatically embeds MLX neuron into MCP structure
 */
export class MLXMcpIntegration {
  private mlxServer: MLXMcpServer;
  private isRegistered = false;

  constructor(configPath?: string) {
    // Use the absolute path to root MLX config
    const defaultConfigPath = configPath || '/Users/jamiecraik/.cortex-os/mlx-server-config.json';
    this.mlxServer = new MLXMcpServer(defaultConfigPath);
  }

  /**
   * Auto-register MLX neuron as an MCP server
   */
  async autoRegister(): Promise<void> {
    if (this.isRegistered) {
      console.log('✅ MLX neuron already registered in MCP system');
      return;
    }

    try {
      // Initialize MLX server
      await this.mlxServer.initialize();

      // Check if MLX is already registered
      const isInstalled = await universalMcpManager.isServerInstalled('mlx-neuron');

      if (isInstalled) {
        console.log('✅ MLX neuron already registered as MCP server');
        this.isRegistered = true;
        return;
      }

      // Auto-register MLX as MCP server
      const mlxServerCommand =
        'cortex mcp add mlx-neuron --transport http --url http://localhost:8080/v1/chat/completions';

      const result = await universalMcpManager.addMcpServer(mlxServerCommand, true);

      if (result.success) {
        console.log('✅ MLX neuron automatically registered as MCP server');
        console.log(`   - Name: mlx-neuron`);
        console.log(`   - Transport: HTTP`);
        console.log(`   - Endpoint: http://localhost:8080/v1/chat/completions`);
        console.log(`   - Models: ${this.mlxServer.getAvailableModels().length} available`);
        this.isRegistered = true;
      } else {
        console.warn('⚠️ Failed to auto-register MLX neuron:', result.message);
      }
    } catch (error) {
      console.error('❌ Error during MLX auto-registration:', error);
    }
  }

  /**
   * Start MLX HTTP server for MCP integration
   */
  async startMLXServer(port = 8080): Promise<void> {
    try {
      // Import express dynamically to avoid dependency issues
      const express = await import('express').then((m) => m.default);
      const app = express();

      app.use(express.json());

      // OpenAI-compatible chat completions endpoint
      app.post('/v1/chat/completions', async (req, res) => {
        try {
          const response = await this.mlxServer.chat(req.body);
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

      // Health check endpoint
      app.get('/health', async (req, res) => {
        try {
          const health = await this.mlxServer.getHealth();
          res.json(health);
        } catch (error) {
          res.status(500).json({ error: `Health check failed: ${error}` });
        }
      });

      // Models endpoint
      app.get('/v1/models', (req, res) => {
        try {
          const models = this.mlxServer.getAvailableModels();
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

      app.listen(port, '127.0.0.1', () => {
        console.log(`🚀 MLX MCP server running on http://127.0.0.1:${port}`);
        console.log(`   - Chat: POST /v1/chat/completions`);
        console.log(`   - Models: GET /v1/models`);
        console.log(`   - Health: GET /health`);
      });

      // Auto-register after server starts
      setTimeout(() => this.autoRegister(), 1000);
    } catch (error) {
      console.error('❌ Failed to start MLX HTTP server:', error);
    }
  }

  /**
   * Get MLX server instance
   */
  getMLXServer(): MLXMcpServer {
    return this.mlxServer;
  }
}

// Export singleton instance
export const mlxMcpIntegration = new MLXMcpIntegration();

// Auto-start integration when imported
mlxMcpIntegration.autoRegister().catch(console.error);
