---
title: Development Setup
sidebar_label: Development Setup
---

# Development Setup Guide

This guide provides instructions for setting up the Cortex WebUI development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher)
2. **pnpm** (v7 or higher)
3. **Git**
4. **SQLite** (usually included with Node.js)

## Initial Setup

1. Clone the repository:

   ```bash
   git clone &lt;repository-url&gt;
   cd cortex-webui
```

2. Install root dependencies:
   ```bash
   pnpm install
```

## Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
```

2. Install backend dependencies:

   ```bash
   pnpm install
```

3. Create a `.env` file from the example:

   ```bash
   cp .env.example .env
```

4. Configure the `.env` file:

   ```env
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=your_secure_jwt_secret_here
   FRONTEND_URL=http://localhost:3000
   ```

5. Initialize the database directory:

   ```bash
   mkdir -p data
```

6. Start the backend development server:
   ```bash
   pnpm dev
```

The backend server will start on port 3001.

## Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
```

2. Install frontend dependencies:

   ```bash
   pnpm install
```

3. Create a `.env` file from the example:

   ```bash
   cp .env.example .env
```

4. Configure the `.env` file:

   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

5. Start the frontend development server:
   ```bash
   pnpm dev
```

The frontend server will start on port 3000.

## Monorepo Development

To run both frontend and backend simultaneously:

1. From the root directory:
   ```bash
   pnpm dev
```

This will start both servers concurrently.

## Database

The application uses SQLite for data storage. The database file is automatically created at `backend/data/cortex.db` when the application starts.

### Database Schema

The database includes the following tables:

1. **users**: Stores user account information
2. **conversations**: Stores conversation metadata
3. **messages**: Stores individual messages
4. **models**: Stores AI model information

## Testing

### Backend Testing

1. Navigate to the backend directory:

   ```bash
   cd backend
```

2. Run tests:
   ```bash
   pnpm test
```

### Frontend Testing

1. Navigate to the frontend directory:

   ```bash
   cd frontend
```

2. Run tests:
   ```bash
   pnpm test
```

## Linting

Both frontend and backend codebases use ESLint for code quality enforcement.

### Backend Linting

```bash
cd backend
pnpm lint
```

### Frontend Linting

```bash
cd frontend
pnpm lint
```

## Building for Production

### Backend Build

```bash
cd backend
pnpm build
```

The built files will be in the `backend/dist/` directory.

### Frontend Build

```bash
cd frontend
pnpm build
```

The built files will be in the `frontend/dist/` directory.

## Running Production Builds

### Backend

```bash
cd backend
pnpm start
```

### Frontend

The frontend is a static site that can be served by any web server. After building, serve the contents of `frontend/dist/`.

## Docker Development

To develop with Docker:

1. Build the images:

   ```bash
   docker-compose build
```

2. Start the services:

   ```bash
   docker-compose up
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api

## Debugging

### Backend Debugging

The backend uses console logging for debugging. In development, detailed error messages are shown.

To enable more verbose logging, set:

```env
NODE_ENV=development
DEBUG=*
```

### Frontend Debugging

The frontend uses browser developer tools for debugging. React Developer Tools and Redux DevTools extensions are recommended.

## Common Development Tasks

### Adding a New API Endpoint

1. Create a new controller in `backend/src/controllers/`
2. Add the route in `backend/src/server.ts`
3. Create corresponding service methods in `backend/src/services/`
4. Update API documentation in `docs/api.md`

### Adding a New UI Component

1. Create a new component in `frontend/src/components/`
2. Add any necessary types to `frontend/src/types/`
3. Create corresponding tests in `frontend/src/components/__tests__/`

### Adding a New Database Table

1. Create a new model in `backend/src/models/`
2. Update the database initialization in `backend/src/utils/database.ts`
3. Create corresponding service methods in `backend/src/services/`
4. Add controller methods in `backend/src/controllers/`

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:

1. Change the port in the backend `.env` file:

   ```env
   PORT=3002
   ```

2. Update the frontend `.env` file to match:
   ```env
   VITE_API_BASE_URL=http://localhost:3002/api
   ```

### Database Issues

If you encounter database issues:

1. Stop the development server
2. Delete the `backend/data/cortex.db` file
3. Restart the development server (the database will be recreated)

### Dependency Issues

If you encounter dependency issues:

1. Clear the pnpm cache:

   ```bash
   pnpm store prune
```

2. Remove node_modules directories:

   ```bash
   rm -rf node_modules
   rm -rf frontend/node_modules
   rm -rf backend/node_modules
```

3. Reinstall dependencies:
   ```bash
   pnpm install
```

## Code Quality

### TypeScript

Both frontend and backend use TypeScript for type safety. Strict mode is enabled.

### ESLint

ESLint is configured for both projects with TypeScript support.

### Prettier

Prettier is used for code formatting. Configuration files are included in each project.

## Version Control

### Git Hooks

The project uses husky for git hooks to ensure code quality:

- Pre-commit: Runs linter and tests
- Pre-push: Runs full test suite

### Commit Messages

Follow conventional commit format:

- `feat: Add new feature`
- `fix: Fix bug`
- `docs: Update documentation`
- `refactor: Refactor code`
- `test: Add tests`

## IDE Setup

### VS Code

Recommended extensions:

- ESLint
- Prettier
- TypeScript Importer
- GitLens
- Bracket Pair Colorizer

### WebStorm

WebStorm has built-in support for most features. Enable:

- TypeScript
- ESLint
- Prettier

## Performance Considerations

### Backend

- Database connections are pooled
- API responses are compressed
- Caching strategies are implemented where appropriate

### Frontend

- Code splitting is enabled
- Lazy loading is used for components
- Bundle size is monitored

## Security Considerations

### Backend

- JWT tokens are used for authentication
- Passwords are hashed with bcrypt
- Input validation is performed with Zod
- CORS is configured appropriately

### Frontend

- Sensitive data is not logged
- API keys are stored securely
- Content Security Policy is enforced

## Accessibility

The frontend follows WCAG 2.1 AA guidelines:

- Semantic HTML
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility

## Internationalization

The application is designed to support internationalization:

- All user-facing strings are in separate files
- RTL language support is considered
- Date/time formatting is locale-aware
