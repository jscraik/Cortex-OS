---
title: Project Structure
sidebar_label: Project Structure
---

# Project Structure Documentation

This document provides an overview of the Cortex WebUI project structure and architecture.

## Overview

Cortex WebUI is a monorepo project with the following main components:

```
cortex-webui/
├── backend/                   # Node.js/Express/TypeScript backend
├── frontend/                  # React/TypeScript frontend with Vite
├── shared/                    # Shared code between frontend and backend
├── docs/                      # Documentation
├── k8s/                       # Kubernetes configuration
└── utils/                     # Utility functions
```

├── backend/                  # Express.js backend
└── shared/                   # Shared types and constants

```

## Architecture

The application follows a monorepo structure with separate frontend and backend applications:

### Frontend

The frontend is built with Vite, React 18, and TypeScript. It provides a modern web interface for AI model interactions with real-time chat capabilities.

### Backend

The backend is built with Node.js, Express, and TypeScript. It provides a RESTful API and WebSocket server for real-time communication.

### Structure

```

backend/
├── src/
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Express middleware
│   ├── models/               # Database models
│   ├── services/             # Business logic
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript types
│   └── server.ts             # Main server file
├── data/                     # Database files
├── logs/                     # Application logs
├── uploads/                  # File uploads
├── tests/                    # Backend tests
├── package.json
├── tsconfig.json
└── .env.example

```

### Key Components

1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Core business logic
3. **Models**: Database schemas and relationships
4. **Middleware**: Request processing and security
5. **Utils**: Helper functions and utilities

## Frontend

The frontend is built with React, TypeScript, and Vite. It provides a modern, responsive user interface.

### Structure

```

frontend/
├── src/
│   ├── components/           # React components
│   ├── hooks/                # Custom hooks
│   ├── pages/                # Page components
│   ├── services/             # API services
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   ├── App.tsx               # Main App component
│   └── index.tsx             # Entry point
├── public/                   # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example

```

### Key Components

1. **Components**: Reusable UI components
2. **Pages**: Route-specific page components
3. **Services**: API communication and state management
4. **Hooks**: Custom React hooks for state and effects
5. **Utils**: Client-side helper functions

## Shared

The shared directory contains code that is used by both the frontend and backend.

### Structure

```

shared/
├── types/                    # Common TypeScript types
└── constants/                # Application constants

```

## Migration Status

The project has been successfully migrated from Next.js to a Vite + Express architecture:

- **Frontend**: Migrated from `app/` to `frontend/src/` with React Router
- **Backend**: API routes migrated from `app/api/` to `backend/src/controllers/`
- **Shared**: Common utilities and types moved to `shared/`
- **Linting**: Updated to use consistent ESLint configurations

The old `app/` directory can be safely removed after verifying all functionality works correctly.

## Development Workflow

1. **Frontend Development**: Run `pnpm dev` in the frontend directory
2. **Backend Development**: Run `pnpm dev` in the backend directory
3. **Monorepo Development**: Run `pnpm dev` in the root directory to start both services

## Deployment

The application can be deployed using:

1. **Docker**: Using the provided Dockerfiles and docker-compose.yml
2. **Kubernetes**: Using the manifests in the k8s/ directory
3. **Traditional Deployment**: Building and running the services separately

## Environment Variables

Each component has its own `.env.example` file that should be copied to `.env` and configured appropriately.

```