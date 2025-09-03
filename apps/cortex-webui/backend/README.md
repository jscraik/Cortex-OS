# Cortex WebUI Backend

This is the backend component of the Cortex WebUI project, built with Node.js, Express, and SQLite.

## Features

- User authentication (registration, login, logout)
- Conversation management (create, read, update, delete)
- Message handling with real-time WebSocket support
- File upload and management
- AI model management
- RESTful API design
- SQLite database for data persistence

## Tech Stack

- **Node.js** with TypeScript
- **Express** for the web framework
- **SQLite** for database storage
- **WebSocket** for real-time communication
- **Zod** for validation
- **JWT** for authentication
- **Multer** for file uploads

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
   pnpm dev
   ```

3. Build for production:

   ```bash
   pnpm build
   ```

4. Start the production server:
   ```bash
   pnpm start
   ```

## Project Structure

```
src/
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── models/         # Database models
├── services/       # Business logic
├── utils/          # Utility functions
├── types/          # TypeScript types
└── server.ts       # Main server file
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

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

The backend also provides a WebSocket server for real-time communication:

- **Endpoint**: `ws://localhost:3001/ws`
- **Authentication**: Pass JWT token as query parameter `?token=YOUR_JWT_TOKEN`

## Environment Variables

Create a `.env` file in the root of the backend directory:

```env
PORT=3001
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000
```

## Database

The application uses SQLite for data storage. The database file is automatically created at `./data/cortex.db` when the application starts.

## Development

- The development server runs on port 3001 by default
- Changes to TypeScript files are automatically compiled and the server restarts
- API endpoints are prefixed with `/api`
- WebSocket endpoint is available at `/ws`

## Testing

Run tests with Vitest:

```bash
pnpm test
```

## Building

Create a production build:

```bash
pnpm build
```

The build output will be in the `dist/` directory.
