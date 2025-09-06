# Cortex Documentation Website

This directory contains the Docusaurus-powered documentation website for Cortex-OS.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build
npm run serve
```

## Features

### ✅ Enhanced Search with Algolia DocSearch

- **Status**: Configured, awaiting credentials
- **Setup Guide**: [docs/guides/algolia-setup.md](docs/guides/algolia-setup.md)
- **Requirements**: Algolia account and DocSearch application

### ✅ Enhanced Code Blocks

- **Copy button**: Hover animations, success feedback
- **Shell integration**: Special highlighting for commands/output
- **Mobile responsive**: Optimized for all devices

### ✅ Dark Theme

- **Design**: Anthropic-inspired dark palette
- **Mode switching**: User preference support
- **Responsive**: Mobile-first approach

### ✅ Port Configuration

- **Development**: Runs on port 3005
- **Registry**: Configured in `../config/ports.env`
- **Scripts**: Updated for consistent port usage

## Algolia DocSearch Setup

### Quick Setup Checklist

1. **Apply for DocSearch**

   - Visit: [docsearch.algolia.com/apply](https://docsearch.algolia.com/apply/)
   - Provide: Website URL, GitHub repo, contact email
   - Confirm: Open-source project status

2. **Get Credentials** (after approval)

   - `appId`: Your Algolia application ID
   - `apiKey`: Search-only API key (public safe)
   - `indexName`: Index name (usually project-name-docs)

3. **Update Configuration**

   ```typescript
   // In docusaurus.config.ts
   algolia: {
     appId: 'YOUR_APP_ID',           // Replace this
     apiKey: 'YOUR_SEARCH_API_KEY',  // Replace this
     indexName: 'cortex-os-docs',    // Replace this
     // ... other settings
   },
   ```

4. **Environment Variables** (recommended)

   ```bash
   # .env.local
   ALGOLIA_APP_ID=your_app_id
   ALGOLIA_API_KEY=your_search_key
   ALGOLIA_INDEX_NAME=cortex-os-docs
   ```

### Alternative: Self-Managed Algolia

For paid plans or custom setups:

1. **Create Algolia Account**: [algolia.com](https://www.algolia.com/)
2. **Create Application**: In Algolia dashboard
3. **Set up Crawler**: Configure web crawler or use API
4. **Configure Index**: Set up search index with proper schema

## File Structure

```text
website/
├── docs/                    # Documentation content
│   ├── guides/
│   │   ├── algolia-setup.md # Algolia setup guide
│   │   └── python-integration.md
│   ├── architecture/        # Architecture docs
│   ├── development/         # Development guides
│   └── getting-started/     # Getting started guides
├── src/
│   ├── css/
│   │   └── custom.css       # Custom styling
│   └── theme/               # Custom theme overrides
│       └── CodeBlock/       # Enhanced code blocks
├── static/                  # Static assets
├── docusaurus.config.ts     # Main configuration
├── sidebars.js             # Sidebar configuration
└── package.json            # Dependencies and scripts
```

## Configuration Files

### Key Files to Modify

- **`docusaurus.config.ts`**: Main site configuration, Algolia settings
- **`sidebars.js`**: Navigation structure
- **`src/css/custom.css`**: Custom styling and dark theme
- **`src/theme/CodeBlock/`**: Enhanced code block components

### Dependencies

Required packages for all features:

- `@docusaurus/core`: Core framework
- `@docusaurus/preset-classic`: Standard preset
- `@docusaurus/theme-search-algolia`: Algolia search integration
- `@docusaurus/theme-mermaid`: Diagram support

## Development

### Commands

```bash
npm start          # Development server (port 3005)
npm run build      # Production build
npm run serve      # Serve production build
npm run clear      # Clear build cache
npm run typecheck  # TypeScript checking
```

### Customization

#### Adding New Pages

1. Create `.md` file in `docs/` directory
2. Add to `sidebars.js` for navigation
3. Use frontmatter for metadata

#### Styling

- Modify `src/css/custom.css` for global styles
- Create theme overrides in `src/theme/`
- Use CSS custom properties for theming

#### Search Configuration

- See [Algolia Setup Guide](docs/guides/algolia-setup.md)
- Test locally with development server
- Monitor search analytics in Algolia dashboard

## Deployment

### Environment Variables

Set these in your deployment platform:

- `ALGOLIA_APP_ID`
- `ALGOLIA_API_KEY`
- `ALGOLIA_INDEX_NAME`

### Build Process

1. **Install dependencies**: `npm install`
2. **Build site**: `npm run build`
3. **Deploy**: Upload `build/` directory to hosting platform

### Hosting Platforms

- **Vercel**: Auto-deploy from GitHub, environment variables in dashboard
- **Netlify**: Drag-and-drop or Git integration, environment in site settings
- **GitHub Pages**: Use GitHub Actions workflow with secrets

## Troubleshooting

### Common Issues

- **Search not working**: Check Algolia credentials and index status
- **Build failures**: Clear cache with `npm run clear`
- **Port conflicts**: Check if port 3005 is available
- **Theme issues**: Verify custom component imports

### Getting Help

- **Documentation**: [docusaurus.io](https://docusaurus.io)
- **Algolia Support**: [docsearch.algolia.com/docs](https://docsearch.algolia.com/docs)
- **Project Issues**: GitHub repository issues
- **Community**: Docusaurus Discord server
