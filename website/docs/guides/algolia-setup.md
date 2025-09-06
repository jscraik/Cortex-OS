# Algolia DocSearch Setup Guide

This guide explains how to set up Algolia DocSearch for enhanced search functionality in the Cortex Docs site.

## Overview

Algolia DocSearch provides powerful, fast search capabilities for documentation sites.
It crawls your documentation, indexes the content, and provides an instant search experience
with autocomplete and faceted search.

## Prerequisites

### 1. Algolia Account Requirements

- **Free Algolia Account**: Sign up at [algolia.com](https://www.algolia.com/)
- **DocSearch Program**: Apply for the free DocSearch program (for open-source projects) or set up a paid plan
- **Website Requirements**: Your documentation must be:
  - Publicly accessible
  - Open-source (for free DocSearch)
  - Well-structured with proper HTML semantics

### 2. Application Process

#### Option A: Free DocSearch Program (Recommended for Open Source)

1. **Apply**: Visit [docsearch.algolia.com](https://docsearch.algolia.com/apply/)
2. **Provide Details**:

   - Website URL: `https://docs.cortex-os.com`
   - Repository URL: `https://github.com/jamiescottcraik/Cortex-OS`
   - Contact email
   - Confirm it's an open-source project

3. **Wait for Approval**: Algolia team will review (typically 1-2 weeks)
4. **Receive Credentials**: You'll get:
   - `appId`
   - `apiKey` (search-only)
   - `indexName`

#### Option B: Self-Managed Algolia (Paid Plans)

1. **Create Application**: In your Algolia dashboard, create a new application
2. **Create Index**: Set up an index for your documentation
3. **Configure Crawler**: Set up the web crawler or use their API
4. **Get Credentials**: Note your app ID, search API key, and index name

## Configuration

### 1. Environment Variables (Recommended)

Create a `.env.local` file in your website directory:

```bash
# Algolia DocSearch Configuration
ALGOLIA_APP_ID=your_app_id_here
ALGOLIA_API_KEY=your_search_api_key_here
ALGOLIA_INDEX_NAME=cortex-os-docs
```

### 2. Update Docusaurus Configuration

The site is pre-configured for Algolia. Update `docusaurus.config.ts`:

```typescript
// Replace the placeholder values with your actual credentials
algolia: {
  appId: process.env.ALGOLIA_APP_ID || 'YOUR_APP_ID',
  apiKey: process.env.ALGOLIA_API_KEY || 'YOUR_SEARCH_API_KEY',
  indexName: process.env.ALGOLIA_INDEX_NAME || 'cortex-os-docs',
  contextualSearch: true,
  searchParameters: {},
  searchPagePath: 'search',
},
```

### 3. Production Deployment

For production deployments, set environment variables in your hosting platform:

#### Vercel

```bash
vercel env add ALGOLIA_APP_ID
vercel env add ALGOLIA_API_KEY
vercel env add ALGOLIA_INDEX_NAME
```

#### Netlify

Add to your site settings or `netlify.toml`:

```toml
[build.environment]
  ALGOLIA_APP_ID = "your_app_id"
  ALGOLIA_API_KEY = "your_api_key"
  ALGOLIA_INDEX_NAME = "cortex-os-docs"
```

#### GitHub Pages

Add to repository secrets and update your GitHub Actions workflow.

## Advanced Configuration

### Search Parameters

Customize search behavior with additional parameters:

```typescript
algolia: {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'cortex-os-docs',
  contextualSearch: true,
  searchParameters: {
    facetFilters: ['language:en'],
    hitsPerPage: 10,
    attributesToRetrieve: ['hierarchy', 'content', 'anchor', 'url'],
  },
  searchPagePath: 'search',
  placeholder: 'Search Cortex docs...',
  translations: {
    button: {
      buttonText: 'Search',
      buttonAriaLabel: 'Search',
    },
    modal: {
      searchBox: {
        resetButtonTitle: 'Clear the query',
        resetButtonAriaLabel: 'Clear the query',
        cancelButtonText: 'Cancel',
        cancelButtonAriaLabel: 'Cancel',
      },
    },
  },
},
```

### Custom Crawler Configuration

If using self-managed Algolia, configure the crawler with this config:

```json
{
  "index_name": "cortex-os-docs",
  "start_urls": ["https://docs.cortex-os.com/"],
  "sitemap_urls": ["https://docs.cortex-os.com/sitemap.xml"],
  "selectors": {
    "lvl0": ".markdown h1",
    "lvl1": ".markdown h2",
    "lvl2": ".markdown h3",
    "lvl3": ".markdown h4",
    "lvl4": ".markdown h5",
    "lvl5": ".markdown h6",
    "text": ".markdown p, .markdown li"
  },
  "conversation_id": ["cortex-os-docs"],
  "nb_hits": 46250
}
```

## Testing

### 1. Local Development

1. Start the development server:

   ```bash
   npm start
   ```

2. Open `http://localhost:3005`
3. Use the search box in the top navigation
4. Verify search results appear and are relevant

### 2. Production Testing

1. Deploy to staging/production
2. Test search functionality
3. Verify all documentation sections are indexed
4. Check search analytics in Algolia dashboard

## Troubleshooting

### Common Issues

#### Search Not Working

- **Check credentials**: Verify `appId`, `apiKey`, and `indexName` are correct
- **Check index**: Ensure your Algolia index has been crawled and contains data
- **Check console**: Look for JavaScript errors in browser developer tools

#### No Search Results

- **Index empty**: Wait for initial crawl or trigger manual crawl
- **Wrong index**: Verify `indexName` matches your Algolia index
- **Crawl configuration**: Check if crawler is properly configured

#### Search Box Not Appearing

- **Theme configuration**: Ensure search is enabled in navbar items
- **Package installation**: Verify `@docusaurus/theme-search-algolia` is installed
- **Build cache**: Clear `.docusaurus` folder and rebuild

### Debug Mode

Enable debug mode for troubleshooting:

```typescript
algolia: {
  // ... other config
  debug: true, // Enable debug mode
},
```

## Support

- **Algolia Documentation**: [docsearch.algolia.com/docs](https://docsearch.algolia.com/docs/)
- **Docusaurus Search**: [docusaurus.io/docs/search](https://docusaurus.io/docs/search)
- **GitHub Issues**: Report issues in the Cortex-OS repository
- **Community Support**: Join the Docusaurus Discord for help

## Security Notes

- **API Key**: Only use search-only API keys in frontend code
- **Environment Variables**: Never commit API keys to version control
- **Rate Limiting**: Be aware of Algolia's rate limits for your plan
- **Index Permissions**: Ensure proper read permissions are set for your index

## Next Steps

After setting up Algolia:

1. **Monitor Usage**: Check Algolia dashboard for search analytics
2. **Optimize Results**: Adjust crawler configuration based on user feedback
3. **Custom Styling**: Customize search UI to match your brand
4. **Advanced Features**: Explore faceted search, filters, and instant search
