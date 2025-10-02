/**
 * MCP API Routes for cortex-webui
 *
 * Defines REST API routes for MCP tool and server management
 * with proper middleware and error handling.
 */

import { Router } from 'express';
import {
	callServerTool,
	disconnectServer,
	executeTool,
	getServer,
	getStats,
	getTool,
	listServers,
	listTools,
	registerServer,
	searchTools,
} from '../controllers/mcpController.js';

const router = Router();

/**
 * @route GET /api/v1/mcp/tools
 * @desc List available MCP tools with optional filtering
 * @access Public
 */
router.get('/tools', listTools);

/**
 * @route GET /api/v1/mcp/tools/search
 * @desc Search for tools by query string
 * @access Public
 */
router.get('/tools/search', searchTools);

/**
 * @route GET /api/v1/mcp/tools/:id
 * @desc Get detailed information about a specific tool
 * @access Public
 */
router.get('/tools/:id', getTool);

/**
 * @route POST /api/v1/mcp/tools/:id/execute
 * @desc Execute an MCP tool
 * @access Public (with security validation)
 */
router.post('/tools/:id/execute', executeTool);

/**
 * @route GET /api/v1/mcp/servers
 * @desc List registered MCP servers
 * @access Public
 */
router.get('/servers', listServers);

/**
 * @route POST /api/v1/mcp/servers/register
 * @desc Register a new MCP server
 * @access Public
 */
router.post('/servers/register', registerServer);

/**
 * @route GET /api/v1/mcp/servers/:id
 * @desc Get detailed information about a specific server
 * @access Public
 */
router.get('/servers/:id', getServer);

/**
 * @route DELETE /api/v1/mcp/servers/:id
 * @desc Disconnect and unregister a server
 * @access Public
 */
router.delete('/servers/:id', disconnectServer);

/**
 * @route POST /api/v1/mcp/servers/:id/tools/:toolName/call
 * @desc Call a tool on a specific server
 * @access Public
 */
router.post('/servers/:id/tools/:toolName/call', callServerTool);

/**
 * @route GET /api/v1/mcp/stats
 * @desc Get MCP system statistics
 * @access Public
 */
router.get('/stats', getStats);

export default router;
