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

## Notes & Troubleshooting

- Tailwind v4 caveats:
   - Tailwind v4 introduces some new tooling and stricter scanning rules. If you use `@apply` with opacity slash-notation utilities (for example `bg-white/30`), the scanner can sometimes report "unknown utility". Solutions:
      1. Include CSS files and `public/index.html` in your `tailwind.config.js` `content` array so Tailwind can discover classes used inside CSS files.
      2. Replace problematic `@apply` shorthand with equivalent explicit CSS properties (for example use `background-color: rgba(255,255,255,0.3)`), or move the utility classes to markup where the scanner can see them.
   - The `@tailwindcss/container-queries` plugin is deprecated in Tailwind v4 - container query utilities are now built-in.
   - We use `@tailwindcss/vite` plugin for optimal build performance in Vite-based projects.

- Native modules / `better-sqlite3`:
   - `better-sqlite3` is a native addon and must match the Node.js ABI. If you switch Node versions (or see `MODULE_NOT_FOUND` / ABI errors), try:

      ```bash
      # rebuild native modules across the workspace
      pnpm -w rebuild

      # or install using a specific Node runtime (e.g. via nvm)
      nvm use 22 && pnpm -w install
      ```

   - If tests or the backend fail to require `better-sqlite3`, ensure the package is installed/hoisted into the workspace, then run the rebuild step above. If problems persist, pin the `better-sqlite3` version to one that matches your desired Node runtime (we use `^12.2.0` for Node 22+ in this repo).
