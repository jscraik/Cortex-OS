import express, { NextFunction, Request, Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  A2ARequest,
  A2AResponse,
  AgentRegistration,
  CapabilityNegotiationRequest,
  createDiscoveryService,
  createNegotiationService,
  createSecurityService,
  createValidationService,
  WorkflowCoordinationRequest,
} from '../packages/a2a/src/index.js';

// Extended request interface with agent payload
interface AuthenticatedRequest extends Request {
  agentPayload?: {
    sub: string;
    iss: string;
    iat: number;
    exp: number;
    capabilities: string[];
    trustLevel: number;
    type: 'local' | 'remote' | 'system';
  };
}

// Initialize services
const securityService = createSecurityService({
  jwtSecret: process.env.A2A_JWT_SECRET || 'default-secret',
  tokenExpiry: 3600,
  minTrustLevel: 1,
  enableCapabilityValidation: true,
  enableRateLimit: true,
});

const discoveryService = createDiscoveryService(30000); // 30 second health checks
const negotiationService = createNegotiationService(() => discoveryService.getAllAgents());
const validationService = createValidationService();

// Simple mock git handler for the MCP server
const mockGitHandler = async (request: A2ARequest): Promise<A2AResponse> => {
  try {
    switch (request.action) {
      case 'git.commit':
        return {
          ok: true,
          result: {
            // Use crypto.randomUUID for secure hash
            hash: crypto.randomUUID(),
            message: (request.params as { message?: string })?.message || 'Mock commit',
            files: ['mock-file.txt'],
            author: { name: 'Test User', email: 'test@example.com' },
            timestamp: new Date().toISOString(),
          },
          id: request.id,
          timestamp: Date.now(),
        };

      case 'git.status':
        return {
          ok: true,
          result: {
            modified: ['file1.txt'],
            added: ['file2.txt'],
            deleted: [],
            untracked: ['file3.txt'],
            branch: 'main',
            clean: false,
          },
          id: request.id,
          timestamp: Date.now(),
        };

      case 'git.diff':
        return {
          ok: true,
          result: {
            diff: 'mock diff output',
            filesChanged: 1,
            insertions: 5,
            deletions: 2,
          },
          id: request.id,
          timestamp: Date.now(),
        };

      default:
        return {
          ok: false,
          error: `Unknown action: ${request.action}`,
          id: request.id,
          timestamp: Date.now(),
        };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      id: request.id,
      timestamp: Date.now(),
    };
  }
};

const app = express();
const PORT = process.env.PORT || 7100;

// Middleware
app.use(express.json());

// Security middleware for protected endpoints
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const authResult = securityService.authorizeAction(token, req.url);
  if (!authResult.authorized) {
    return res.status(403).json({ error: authResult.reason });
  }

  // Add payload to request for use in handlers
  (req as AuthenticatedRequest).agentPayload = authResult.payload;
  next();
};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mcp-server',
    version: '2.0.0',
    features: ['security', 'discovery', 'negotiation', 'validation'],
  });
});

// === SECURITY ENDPOINTS ===

// Register agent with security credentials
app.post('/security/register', async (req: Request, res: Response) => {
  try {
    const credentials = req.body;
    const token = securityService.registerAgent(credentials);

    res.status(201).json({
      success: true,
      token,
      agentId: credentials.agentId,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

// Generate API key for agent
app.post('/security/api-key', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agentPayload?.sub;
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID not found in token' });
    }

    const apiKey = securityService.generateApiKey(agentId);

    res.json({
      success: true,
      apiKey,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'API key generation failed',
    });
  }
});

// === DISCOVERY ENDPOINTS ===

// Register agent for discovery
app.post('/discovery/register', async (req: Request, res: Response) => {
  try {
    const registration = req.body as Omit<AgentRegistration, 'registeredAt' | 'lastSeen'>;
    await discoveryService.registerAgent(registration);

    res.status(201).json({
      success: true,
      message: 'Agent registered for discovery',
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Discovery registration failed',
    });
  }
});

// Discover agents
app.post('/discovery/search', async (req: Request, res: Response) => {
  try {
    const query = req.body;
    const result = await discoveryService.discoverAgents(query);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Discovery search failed',
    });
  }
});

// Get agent by ID
app.get('/discovery/agents/:agentId', (req: Request, res: Response) => {
  try {
    const agent = discoveryService.getAgent(req.params.agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get agent',
    });
  }
});

// Get discovery statistics
app.get('/discovery/stats', (_req: Request, res: Response) => {
  try {
    const stats = discoveryService.getDiscoveryStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get discovery stats',
    });
  }
});

// === NEGOTIATION ENDPOINTS ===

// Negotiate capabilities
app.post('/negotiation/capabilities', async (req: Request, res: Response) => {
  try {
    const request = req.body as CapabilityNegotiationRequest;
    const result = await negotiationService.negotiateCapabilities(request);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Capability negotiation failed',
    });
  }
});

// Coordinate workflow
app.post('/negotiation/workflow', async (req: Request, res: Response) => {
  try {
    const request = req.body as WorkflowCoordinationRequest;
    const result = await negotiationService.coordinateWorkflow(request);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Workflow coordination failed',
    });
  }
});

// === VALIDATION ENDPOINTS ===

// Validate agent capabilities
app.post('/validation/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const agent = discoveryService.getAgent(req.params.agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const context = {
      availableAgents: discoveryService.getAllAgents(),
      systemConstraints: {
        maxMemoryMB: 8192,
        maxCpuCores: 4,
        maxNetworkMbps: 1000,
      },
      securityPolicies: validationService.getSecurityPolicies(),
    };

    const report = await validationService.validateAgent(agent, context);
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Agent validation failed',
    });
  }
});

// Validate compatibility between agents
app.post('/validation/compatibility', async (req: Request, res: Response) => {
  try {
    const { sourceAgentId, targetAgentId, capability } = req.body;

    const sourceAgent = discoveryService.getAgent(sourceAgentId);
    const targetAgent = discoveryService.getAgent(targetAgentId);

    if (!sourceAgent || !targetAgent) {
      return res.status(404).json({ error: 'One or both agents not found' });
    }

    const result = await validationService.validateCompatibility(
      sourceAgent,
      targetAgent,
      capability,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Compatibility validation failed',
    });
  }
});

// === LEGACY ENDPOINTS ===

// Get agent card resources (legacy)
app.get('/resources/:card', (req: Request, res: Response) => {
  try {
    const cardPath = join(__dirname, '..', 'agents', 'cards', `${req.params.card}.json`);

    if (!existsSync(cardPath)) {
      return res.status(404).json({
        error: 'Agent card not found',
        card: req.params.card,
        searchPath: cardPath,
      });
    }

    const cardData = JSON.parse(readFileSync(cardPath, 'utf8'));
    res.json(cardData);
  } catch (error) {
    console.error(`Error loading agent card ${req.params.card}:`, error);
    res.status(500).json({
      error: 'Failed to load agent card',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Git agent endpoint (enhanced with security)
app.post('/local/git', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await mockGitHandler(req.body);
    res.json(result);
  } catch (error) {
    console.error('Git agent error:', error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize default agents on startup
async function initializeDefaultAgents() {
  try {
    // Register local git agent
    const gitAgentRegistration: Omit<AgentRegistration, 'registeredAt' | 'lastSeen'> = {
      agentId: 'local:git',
      name: 'Local Git Agent',
      description: 'Provides git operations for the local repository',
      version: '1.0.0',
      endpoints: {
        invoke: `http://localhost:${PORT}/local/git`,
      },
      capabilities: [
        {
          id: 'git.status',
          description: 'Get repository status',
          permissions: ['git.read'],
          securityLevel: 2,
          rateLimit: 60,
        },
        {
          id: 'git.diff',
          description: 'Get file differences',
          permissions: ['git.read'],
          securityLevel: 2,
          rateLimit: 60,
        },
        {
          id: 'git.commit',
          description: 'Create commits',
          permissions: ['git.write'],
          securityLevel: 3,
          rateLimit: 30,
        },
      ],
      tags: ['git', 'vcs', 'local'],
      status: 'online',
      trustLevel: 5,
      auth: {
        type: 'jwt',
      },
    };

    await discoveryService.registerAgent(gitAgentRegistration);
    console.log('✅ Default git agent registered');
  } catch (error) {
    console.error('❌ Failed to register default agents:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Enhanced MCP Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Security API: http://localhost:${PORT}/security/*`);
  console.log(`🔍 Discovery API: http://localhost:${PORT}/discovery/*`);
  console.log(`🤝 Negotiation API: http://localhost:${PORT}/negotiation/*`);
  console.log(`✅ Validation API: http://localhost:${PORT}/validation/*`);
  console.log(`📋 Agent cards: http://localhost:${PORT}/resources/git`);
  console.log(`🔄 Git agent: POST http://localhost:${PORT}/local/git`);

  // Initialize default agents
  await initializeDefaultAgents();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  discoveryService.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  discoveryService.cleanup();
  process.exit(0);
});
