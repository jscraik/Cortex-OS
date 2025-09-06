import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
    // By default, Docusaurus generates a sidebar from the docs folder structure
    tutorialSidebar: [
        'intro',
        {
            type: 'category',
            label: 'Getting Started',
            items: [
                'getting-started/quick-start',
                'getting-started/python-integration',
                'getting-started/architecture-overview',
            ],
        },
        {
            type: 'category',
            label: 'Agents',
            items: [
                'agents/overview',
                'agents/contracts-validation',
                'agents/memory-state',
            ],
        },
        {
            type: 'category',
            label: 'Development',
            items: [
                'development/contributing',
                'development/code-quality',
                'development/testing-strategy',
            ],
        },
        {
            type: 'category',
            label: 'Security & Compliance',
            items: [
                'security/security-practices',
                'security/license-sbom',
            ],
        },
        {
            type: 'category',
            label: 'Operations',
            items: [
                'operations/deployment',
                'operations/carbon-sustainability',
            ],
        },
    ],
};

export default sidebars;
