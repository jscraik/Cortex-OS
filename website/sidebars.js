/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['getting-started/installation', 'getting-started/structure', 'getting-started/quick-start'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/overview', 'architecture/agents', 'architecture/communication'],
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['guides/python-integration', 'guides/algolia-setup'],
    },
    {
      type: 'category',
      label: 'Development',
      items: ['development/contributing'],
    },
    'test-features',
  ],
};

module.exports = sidebars;
