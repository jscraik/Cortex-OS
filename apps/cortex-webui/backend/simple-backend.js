const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3033;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for chat sessions
let chatSessions = [];
let currentSessionId = null;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  res.json(chatSessions);
});

// Create new session
app.post('/api/sessions', (req, res) => {
  const session = {
    id: Date.now().toString(),
    modelId: null,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: 'New Chat',
    userId: null,
    metadata: {}
  };
  chatSessions.push(session);
  currentSessionId = session.id;
  res.json(session);
});

// Get session by ID
app.get('/api/sessions/:id', (req, res) => {
  const session = chatSessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!sessionId && !currentSessionId) {
    // Create new session if none exists
    const newSession = {
      id: Date.now().toString(),
      modelId: null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: 'New Chat',
      userId: null,
      metadata: {}
    };
    chatSessions.push(newSession);
    currentSessionId = newSession.id;
  }

  const session = chatSessions.find(s => s.id === (sessionId || currentSessionId));
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Add user message
  const userMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: message,
    createdAt: new Date().toISOString(),
    tokenCount: message.split(' ').length,
    modelId: null,
    metadata: {}
  };
  session.messages.push(userMessage);

  // Simulate AI response
  setTimeout(() => {
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `brAInwav AI response to: "${message}". I'm a simple backend service running at http://localhost:3033. This is a demonstration that the chat interface is working.`,
      createdAt: new Date().toISOString(),
      tokenCount: 30,
      modelId: 'brainwav-demo',
      metadata: {}
    };
    session.messages.push(assistantMessage);
    session.updatedAt = new Date().toISOString();
  }, 500);

  res.json({
    success: true,
    sessionId: session.id,
    message: 'Message received and processed by brAInwav backend'
  });
});

// Get messages for a session
app.get('/api/sessions/:id/messages', (req, res) => {
  const session = chatSessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session.messages);
});

// Update session title
app.put('/api/sessions/:id/title', (req, res) => {
  const { title } = req.body;
  const session = chatSessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  session.title = title || session.title;
  session.updatedAt = new Date().toISOString();
  res.json(session);
});

// Delete session
app.delete('/api/sessions/:id', (req, res) => {
  const index = chatSessions.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const deleted = chatSessions.splice(index, 1)[0];
  if (deleted.id === currentSessionId) {
    currentSessionId = chatSessions.length > 0 ? chatSessions[0].id : null;
  }
  res.json({ success: true, deleted: deleted.id });
});

// Get current session ID
app.get('/api/current-session', (req, res) => {
  res.json({ sessionId: currentSessionId });
});

// Set current session
app.post('/api/current-session', (req, res) => {
  const { sessionId } = req.body;
  const session = chatSessions.find(s => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  currentSessionId = sessionId;
  res.json({ success: true, sessionId: currentSessionId });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 brAInwav Cortex-OS Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`💾 Chat sessions stored in memory`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down brAInwav backend server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down brAInwav backend server...');
  process.exit(0);
});