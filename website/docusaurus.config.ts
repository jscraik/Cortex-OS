import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
    title: 'Cortex Docs',
    url: 'https://jamiescottcraik.github.io',
    baseUrl: '/Cortex-OS/',
    trailingSlash: false,
    favicon: 'img/favicon.png',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    i18n: { defaultLocale: 'en', locales: ['en'] },

    // GitHub pages deployment config
    organizationName: 'jamiescottcraik',
    projectName: 'Cortex-OS',
    deploymentBranch: 'gh-pages',

    markdown: {
        mermaid: true,
    },
    themes: ['@docusaurus/theme-mermaid'],

    // Make docs the homepage: route docs at "/"
    presets: [
        [
            'classic',
            {
                docs: {
                    routeBasePath: '/',          // ← Docs at site root
                    sidebarPath: './sidebars.js',
                    editUrl: 'https://github.com/jamiescottcraik/Cortex-OS/edit/main/website/',
                },
                blog: false,                   // keep site focused
                theme: { customCss: './src/css/custom.css' },
                sitemap: { changefreq: 'weekly', priority: 0.6 },
            },
        ],
    ],

    themeConfig: {
        // Algolia DocSearch configuration
        // To set up Algolia search:
        // 1. Apply for free DocSearch at https://docsearch.algolia.com/apply/
        // 2. Or create a paid Algolia account at https://www.algolia.com/
        // 3. Replace the placeholder values below with your actual credentials
        // 4. See /docs/guides/algolia-setup for detailed setup instructions
        algolia: {
            appId: 'YOUR_APP_ID', // Replace with your Algolia app ID
            apiKey: 'YOUR_SEARCH_API_KEY', // Replace with your search-only API key  
            indexName: 'cortex-os-docs', // Replace with your index name
            contextualSearch: true,
            searchParameters: {},
            searchPagePath: 'search',
        },
        colorMode: {
            defaultMode: 'dark',
            disableSwitch: false,
            respectPrefersColorScheme: false,
        },
        navbar: {
            title: 'Cortex Docs',
            // Removed logo references until files are added
            items: [
                { type: 'doc', docId: 'intro', label: 'Docs', position: 'left' },
                { href: 'https://github.com/jamiescottcraik/Cortex-OS', label: 'GitHub', position: 'right' },
                {
                    type: 'search',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [],
            copyright: `© ${new Date().getFullYear()} Cortex`,
        },
        prism: {
            theme: prismThemes.palenight,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ['rust', 'bash', 'python', 'json', 'yaml', 'toml'],
        },
        // Copy code button configuration
        codeblock: {
            showGutter: true,
        },
    },
};

export default config;
