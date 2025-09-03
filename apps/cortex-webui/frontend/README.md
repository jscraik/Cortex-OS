# Cortex WebUI Frontend

This is the frontend component of the Cortex WebUI project, built with React, TypeScript, and Vite.

## Features

- Real-time chat interface with streaming responses
- Conversation management
- User authentication (login/registration)
- File upload capabilities
- Dark/light theme support
- Responsive design for desktop and mobile

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Zod** for validation
- **WebSocket** for real-time communication

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

4. Preview the production build:
   ```bash
   pnpm preview
   ```

## Project Structure

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── services/       # API and WebSocket services
├── types/          # TypeScript types
├── utils/          # Utility functions
├── App.tsx         # Main App component
└── index.tsx       # Entry point
```

## Environment Variables

Create a `.env` file in the root of the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## Development

- The development server runs on port 3000 by default
- API requests are proxied to `http://localhost:3001` (backend)
- Hot module replacement is enabled for fast development

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
