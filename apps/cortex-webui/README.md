# Cortex WebUI

A modern, accessible web interface for AI models with real-time chat capabilities, designed as part of the Cortex-OS ecosystem.

## Features

- Real-time chat interface with streaming responses
- Support for multiple AI models (OpenAI, Anthropic, local models)
- Modern authentication system using Better Auth
- User session management and OAuth providers
- Conversation history and management
- File upload and processing
- Dark/light theme support
- Responsive design for desktop and mobile
- Accessibility compliant (WCAG 2.1 AA)
- WebSocket-based real-time communication

## Project Structure

```
cortex-webui/
├── backend/          # Node.js/Express backend API
├── frontend/         # React/TypeScript frontend
├── shared/           # Shared code between frontend and backend
├── docs/             # Documentation
├── k8s/              # Kubernetes configurations
└── utils/            # Utility functions
```

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Zod for validation
- WebSocket for real-time communication

### Backend

- Node.js with TypeScript
- Express web framework
- Better Auth for authentication and session management
- SQLite for data storage with Drizzle ORM
- WebSocket for real-time communication
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd cortex-webui
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `backend/.env.example` to `backend/.env` and configure
   - Copy `frontend/.env.example` to `frontend/.env` and configure

4. Start the development servers:

   ```bash
   pnpm dev
   ```

This will start both the backend (port 3001) and frontend (port 3000) servers.

### Building for Production

```bash
pnpm build
```

### Running in Production

```bash
pnpm start
```

## Development

### Frontend Development

The frontend runs on port 3000 by default and proxies API requests to the backend on port 3001.

```bash
cd frontend
pnpm dev
```

### Backend Development

The backend runs on port 3001 by default.

```bash
cd backend
pnpm dev
```

## API Documentation

The backend provides a RESTful API with the following main endpoints:

### Authentication

- `POST /api/auth/sign-up/email` - Register a new user with email/password
- `POST /api/auth/sign-in/email` - Login user with email/password
- `POST /api/auth/sign-in/social` - OAuth login (GitHub, Google, etc.)
- `POST /api/auth/sign-out` - Logout user
- `GET /api/auth/session` - Get current session
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Conversations

- `GET /api/conversations` - Get all conversations for user
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations/:id` - Get a specific conversation
- `PUT /api/conversations/:id` - Update a conversation
- `DELETE /api/conversations/:id` - Delete a conversation

### Messages

- `GET /api/conversations/:conversationId/messages` - Get messages for a conversation
- `POST /api/conversations/:conversationId/messages` - Create a new message

### Models

- `GET /api/models` - Get all AI models
- `GET /api/models/:id` - Get a specific AI model

### Files

- `POST /api/files/upload` - Upload a file
- `DELETE /api/files/:id` - Delete a file

## WebSocket API

Real-time communication is available through WebSocket:

- **Endpoint**: `ws://localhost:3001/ws`
- **Authentication**: Uses Better Auth session cookies for authentication

## Testing

Run tests for both frontend and backend:

```bash
pnpm test
```

## Deployment

### Docker

Build and run with Docker:

```bash
docker-compose up --build
```

### Kubernetes

Deploy to Kubernetes using the manifests in the `k8s/` directory:

```bash
kubectl apply -f k8s/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built as part of the Cortex-OS ecosystem
- Inspired by modern AI chat interfaces
- Designed with accessibility in mind
