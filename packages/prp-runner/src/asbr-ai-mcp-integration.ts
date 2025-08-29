/**
 * @file asbr-ai-mcp-integration.ts
 * @description Auto-register ASBR AI capabilities as MCP tools in the universal system
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 * @last_updated 2025-08-22
 * @maintainer @jamiescottcraik
 */

import { ASBRAIMcpServer } from './asbr-ai-mcp-server.js';
import express from 'express';
import { createToolsRouter } from './lib/server/tools-router.js';
import { createHealthRouter } from './lib/server/health-router.js';
import { createCapabilitiesRouter } from './lib/server/capabilities-router.js';
import { createKnowledgeRouter } from './lib/server/knowledge-router.js';

/**
 * ASBR AI MCP Integration - Automatically exposes AI capabilities as MCP tools
 */
export class ASBRAIMcpIntegration {
  private mcpServer: ASBRAIMcpServer;
  private isRegistered = false;
  private httpServer?: any;

  constructor() {
    this.mcpServer = new ASBRAIMcpServer();
  }

  /**
   * Auto-register ASBR AI capabilities as MCP tools
   */
  async autoRegister(): Promise<void> {
    if (this.isRegistered) {
      console.log('✅ ASBR AI capabilities already registered in MCP system');
      return;
    }

    try {
      // Initialize ASBR AI MCP server
      await this.mcpServer.initialize();

      // Check server health
      const health = await this.mcpServer.getHealth();

      if (health.status === 'healthy') {
        console.log('✅ ASBR AI MCP server initialized successfully');
        console.log(`   - Status: ${health.status}`);
        console.log(`   - Available tools: ${health.tools}`);
        console.log(`   - AI features: ${health.features.join(', ')}`);
        this.isRegistered = true;
      } else {
        console.warn('⚠️ ASBR AI MCP server health check failed');
      }
    } catch (error) {
      console.error('❌ Error during ASBR AI MCP auto-registration:', error);
      throw error;
    }
  }

  /**
   * Start HTTP server for MCP tool access
   */
  async startHTTPServer(port = 8081): Promise<void> {
    try {
      const app = express();
      app.use(express.json());

      app.use('/mcp/tools', createToolsRouter(this.mcpServer));
      app.use('/health', createHealthRouter(this.mcpServer));
      app.use('/mcp/capabilities', createCapabilitiesRouter(this.mcpServer));
      app.use('/mcp/knowledge', createKnowledgeRouter(this.mcpServer));

      this.httpServer = app.listen(port, '127.0.0.1', () => {
        console.log(`🚀 ASBR AI MCP server running on http://127.0.0.1:${port}`);
        console.log(`   - Tools list: GET /mcp/tools/list`);
        console.log(`   - Tool call: POST /mcp/tools/call`);
        console.log(`   - Capabilities: GET /mcp/capabilities`);
        console.log(`   - Knowledge stats: GET /mcp/knowledge/stats`);
        console.log(`   - Health: GET /health`);
      });

      setTimeout(() => this.autoRegister(), 1000);
    } catch (error) {
      console.error('❌ Failed to start ASBR AI MCP HTTP server:', error);
    }
  }

  /**
   * Get MCP server instance
   */
  getMcpServer(): ASBRAIMcpServer {
    return this.mcpServer;
  }

  /**
   * Check if integration is registered and healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isRegistered) return false;

    try {
      const health = await this.mcpServer.getHealth();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = undefined;
      this.isRegistered = false;
      console.log('🛑 ASBR AI MCP server stopped');
    }
  }

  /**
   * Test MCP tool functionality
   */
  async testTools(): Promise<{ passed: number; failed: number; results: any[] }> {
    const results = [];
    let passed = 0;
    let failed = 0;

    const testCases = [
      {
        name: 'ai_get_capabilities',
        args: {},
      },
      {
        name: 'ai_get_knowledge_stats',
        args: {},
      },
      {
        name: 'ai_generate_text',
        args: {
          prompt: 'Hello, this is a test of the MLX integration.',
          maxTokens: 50,
        },
      },
      {
        name: 'ai_calculate_similarity',
        args: {
          text1: 'Machine learning is a subset of artificial intelligence',
          text2: 'AI includes machine learning as one of its components',
        },
      },
    ];

    for (const testCase of testCases) {
      try {
        const response = await this.mcpServer.callTool({
          method: 'tools/call',
          params: {
            name: testCase.name,
            arguments: testCase.args,
          },
        });

        if (response.isError) {
          failed++;
          results.push({
            tool: testCase.name,
            status: 'failed',
            error: response.content[0]?.text,
          });
        } else {
          passed++;
          results.push({
            tool: testCase.name,
            status: 'passed',
            response: response.content[0]?.text?.substring(0, 100) + '...',
          });
        }
      } catch (error) {
        failed++;
        results.push({
          tool: testCase.name,
          status: 'error',
          error: String(error),
        });
      }
    }

    return { passed, failed, results };
  }
}

/**
 * Export singleton instance
 */
export const asbrAIMcpIntegration = new ASBRAIMcpIntegration();

/**
 * MCP Tool Registry for ASBR AI capabilities
 */
export const ASBR_AI_MCP_TOOLS = {
  // Text generation tools
  AI_GENERATE_TEXT: 'ai_generate_text',
  AI_RAG_QUERY: 'ai_rag_query',

  // Knowledge management tools
  AI_SEARCH_KNOWLEDGE: 'ai_search_knowledge',
  AI_ADD_KNOWLEDGE: 'ai_add_knowledge',
  AI_GET_KNOWLEDGE_STATS: 'ai_get_knowledge_stats',

  // Embedding and similarity tools
  AI_GET_EMBEDDING: 'ai_get_embedding',
  AI_CALCULATE_SIMILARITY: 'ai_calculate_similarity',

  // ASBR evidence tools
  ASBR_COLLECT_ENHANCED_EVIDENCE: 'asbr_collect_enhanced_evidence',
  ASBR_FACT_CHECK_EVIDENCE: 'asbr_fact_check_evidence',

  // System tools
  AI_GET_CAPABILITIES: 'ai_get_capabilities',
} as const;

/**
 * Helper function to call ASBR AI MCP tools
 */
export async function callASBRAITool(toolName: string, args: Record<string, any>): Promise<any> {
  try {
    const response = await asbrAIMcpIntegration.getMcpServer().callTool({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    });

    if (response.isError) {
      throw new Error(response.content[0]?.text || 'Unknown MCP tool error');
    }

    // Parse JSON response if available
    const responseText = response.content[0]?.text;
    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  } catch (error) {
    console.error(`ASBR AI MCP tool call failed for ${toolName}:`, error);
    throw error;
  }
}

// Auto-start integration when imported (optional - can be disabled)
// asbrAIMcpIntegration.autoRegister().catch(console.error);
