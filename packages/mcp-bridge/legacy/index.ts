import express, { NextFunction, Request, Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Import the compiled A2A types
interface A2ARequest {
  action: string;
  params?: any;
  id?: string;
  timestamp?: number;
}

interface A2AResponse {
  ok: boolean;
  result?: any;
  error?: string;
  id?: string;
  timestamp?: number;
}

// Simple mock git handler for the MCP server
// In production, this would connect to the actual git agent
const mockGitHandler = async (request: A2ARequest): Promise<A2AResponse> => {
  try {
    // Mock successful git operations
    switch (request.action) {
      case 'git.commit':
        return {
          ok: true,
          result: {
            hash: 'abc' + Math.random().toString(36).substr(2, 6),
            message: request.params?.message || 'Mock commit',
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

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mcp-server',
    version: '1.0.0',
  });
});

// Get agent card resources
app.get('/resources/:card', (req: Request, res: Response) => {
  try {
    // Look for cards in the parent directory's agents/cards folder
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

// Git agent endpoint
app.post('/local/git', async (req: Request, res: Response) => {
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
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Agent cards: http://localhost:${PORT}/resources/git`);
  console.log(`🔄 Git agent: POST http://localhost:${PORT}/local/git`);
});
