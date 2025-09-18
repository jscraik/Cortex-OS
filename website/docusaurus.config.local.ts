import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
	title: 'Cortex-OS',
	tagline: 'Enterprise-grade multi-modal AI orchestration platform',
	favicon: 'img/favicon.ico',

	// Set the production url of your site here
	url: 'http://localhost:3005',
	// Local development - use root path
	baseUrl: '/',

	// Disable for local development
	organizationName: 'jamiescottcraik',
	projectName: 'Cortex-OS',
	trailingSlash: false,

	onBrokenLinks: 'warn', // Changed from 'throw' to 'warn' for local dev
	onBrokenMarkdownLinks: 'warn',

	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en'],
	},

	markdown: {
		mermaid: true,
	},

	themes: ['@docusaurus/theme-mermaid'],

	presets: [
		[
			'classic',
			{
				docs: {
					sidebarPath: './sidebars.ts',
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					editUrl:
						'https://github.com/jamiescottcraik/Cortex-OS/tree/main/website/',
				},
				blog: {
					showReadingTime: true,
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					editUrl:
						'https://github.com/jamiescottcraik/Cortex-OS/tree/main/website/',
				},
				theme: {
					customCss: './src/css/custom.css',
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		// Replace with your project's social card
		image: 'img/docusaurus-social-card.jpg',
		navbar: {
			title: 'Cortex-OS',
			logo: {
				alt: 'Cortex-OS Logo',
				src: 'img/logo.svg',
			},
			items: [
				{
					type: 'docSidebar',
					sidebarId: 'tutorialSidebar',
					position: 'left',
					label: 'Documentation',
				},
				{ to: '/blog', label: 'Blog', position: 'left' },
				{
					href: 'https://github.com/jamiescottcraik/Cortex-OS',
					label: 'GitHub',
					position: 'right',
				},
			],
		},
		footer: {
			style: 'dark',
			links: [
				{
					title: 'Docs',
					items: [
						{
							label: 'Getting Started',
							to: '/docs/getting-started',
						},
						{
							label: 'Architecture',
							to: '/docs/getting-started/architecture-overview',
						},
					],
				},
				{
					title: 'Community',
					items: [
						{
							label: 'GitHub Issues',
							href: 'https://github.com/jamiescottcraik/Cortex-OS/issues',
						},
						{
							label: 'Discussions',
							href: 'https://github.com/jamiescottcraik/Cortex-OS/discussions',
						},
					],
				},
				{
					title: 'More',
					items: [
						{
							label: 'Blog',
							to: '/blog',
						},
						{
							label: 'GitHub',
							href: 'https://github.com/jamiescottcraik/Cortex-OS',
						},
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} Cortex-OS. Built with Docusaurus.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
			additionalLanguages: [
				'bash',
				'json',
				'yaml',
				'typescript',
				'python',
				'rust',
			],
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
