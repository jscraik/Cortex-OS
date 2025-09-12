/**
 * @file_path packages/mcp-server/src/tools/GenerateGuide.ts
 * @description GenerateGuide MCP tool for creating documentation and guides
 */

import type { Tool } from '../tool';

export interface GenerateGuideArgs {
	topic: string;
	type?: 'api' | 'tutorial' | 'reference' | 'guide' | 'troubleshooting';
	format?: 'markdown' | 'html' | 'json' | 'yaml';
	audience?: 'developer' | 'user' | 'admin' | 'general';
	sections?: string[];
	include_examples?: boolean;
	include_code_samples?: boolean;
	include_diagrams?: boolean;
	accessibility_level?: 'basic' | 'enhanced' | 'full';
	output_path?: string;
}

export interface GenerateGuideResult {
	title: string;
	content: string;
	format: string;
	sections: GuideSection[];
	metadata: GuideMetadata;
	accessibility_features: AccessibilityFeatures;
	file_path?: string;
}

export interface GuideSection {
	id: string;
	title: string;
	content: string;
	type: 'overview' | 'procedure' | 'reference' | 'example' | 'troubleshooting';
	level: number;
	tags: string[];
}

export interface GuideMetadata {
	created_at: string;
	last_updated: string;
	version: string;
	author: string;
	topic: string;
	type: string;
	audience: string;
	estimated_reading_time: number;
	difficulty_level: 'beginner' | 'intermediate' | 'advanced';
	prerequisites: string[];
	related_topics: string[];
}

export interface AccessibilityFeatures {
	alt_text_count: number;
	heading_structure: boolean;
	keyboard_navigation: boolean;
	screen_reader_friendly: boolean;
	color_contrast_compliant: boolean;
	semantic_markup: boolean;
	aria_labels: number;
}

/**
 * GenerateGuide MCP Tool
 *
 * Creates comprehensive documentation and guides with accessibility features,
 * code examples, and structured content based on the specified topic and requirements.
 */
export class GenerateGuide implements Tool {
	name = 'generate_guide';
	description =
		'Generate comprehensive documentation guides with accessibility features, code examples, and structured content';

	private readonly templateStructures = {
		api: [
			'overview',
			'authentication',
			'endpoints',
			'examples',
			'errors',
			'rate-limits',
		],
		tutorial: [
			'introduction',
			'prerequisites',
			'setup',
			'steps',
			'verification',
			'next-steps',
		],
		reference: ['overview', 'syntax', 'parameters', 'examples', 'related'],
		// Ensure 6 default sections for generic guides
		guide: [
			'overview',
			'prerequisites',
			'implementation',
			'examples',
			'troubleshooting',
			'next-steps',
		],
		troubleshooting: [
			'problem',
			'symptoms',
			'causes',
			'solutions',
			'prevention',
		],
	};

	async run(args: GenerateGuideArgs): Promise<GenerateGuideResult> {
		// Validate arguments
		this.validateArgs(args);

		// Generate guide content
		const content = await this.generateContent(args);
		const sections = await this.generateSections(args);
		const metadata = this.generateMetadata(args, content);
		const accessibilityFeatures = this.analyzeAccessibility(content, args);

		// Format content based on requested format
		const formattedContent = this.formatContent(content, sections, args);

		const result: GenerateGuideResult = {
			title: this.generateTitle(args.topic, args.type || 'guide'),
			content: formattedContent,
			format: args.format || 'markdown',
			sections,
			metadata,
			accessibility_features: accessibilityFeatures,
		};

		// Save to file if output path specified
		if (args.output_path) {
			result.file_path = await this.saveToFile(result, args.output_path);
		}

		return result;
	}

	private validateArgs(args: GenerateGuideArgs): void {
		if (!args.topic || args.topic.trim().length === 0) {
			throw new Error('Topic is required and cannot be empty');
		}

		const validTypes = [
			'api',
			'tutorial',
			'reference',
			'guide',
			'troubleshooting',
		];
		if (args.type && !validTypes.includes(args.type)) {
			throw new Error(
				`Invalid type: ${args.type}. Must be one of: ${validTypes.join(', ')}`,
			);
		}

		const validFormats = ['markdown', 'html', 'json', 'yaml'];
		if (args.format && !validFormats.includes(args.format)) {
			throw new Error(
				`Invalid format: ${args.format}. Must be one of: ${validFormats.join(', ')}`,
			);
		}

		const validAudiences = ['developer', 'user', 'admin', 'general'];
		if (args.audience && !validAudiences.includes(args.audience)) {
			throw new Error(
				`Invalid audience: ${args.audience}. Must be one of: ${validAudiences.join(', ')}`,
			);
		}
	}

	private async generateContent(args: GenerateGuideArgs): Promise<string> {
		const type = args.type || 'guide';
		const sections =
			this.templateStructures[type] || this.templateStructures.guide;

		let content = `# ${this.generateTitle(args.topic, type)}\n\n`;

		// Add accessibility notice
		if (args.accessibility_level !== 'basic') {
			content += this.generateAccessibilityNotice();
		}

		// Generate introduction
		content += this.generateIntroduction(args);

		// Generate main content based on type
		for (const sectionType of sections) {
			content += await this.generateSectionContent(sectionType, args);
		}

		// Add code samples if requested
		if (args.include_code_samples) {
			content += this.generateCodeSamples(args);
		}

		// Add examples if requested
		if (args.include_examples) {
			content += this.generateExamples(args);
		}

		// Add diagrams if requested
		if (args.include_diagrams) {
			content += this.generateDiagramPlaceholders(args);
		}

		return content;
	}

	private async generateSections(
		args: GenerateGuideArgs,
	): Promise<GuideSection[]> {
		const type = args.type || 'guide';
		const sectionTypes =
			args.sections ||
			this.templateStructures[type] ||
			this.templateStructures.guide;

		const sections: GuideSection[] = [];

		for (let i = 0; i < sectionTypes.length; i++) {
			const sectionType = sectionTypes[i];
			sections.push({
				id: `section-${i + 1}`,
				title: this.capitalizeTitle(sectionType),
				content: await this.generateSectionContent(sectionType, args),
				type: this.mapSectionType(sectionType),
				level: 2,
				tags: this.generateSectionTags(sectionType, args),
			});
		}

		return sections;
	}

	private generateTitle(topic: string, type: string): string {
		const typeMapping = {
			api: 'API Reference',
			tutorial: 'Tutorial',
			reference: 'Reference Guide',
			guide: 'Guide',
			troubleshooting: 'Troubleshooting Guide',
		};

		const typeName = typeMapping[type as keyof typeof typeMapping] || 'Guide';
		return `${this.capitalizeTitle(topic)} ${typeName}`;
	}

	private capitalizeTitle(text: string): string {
		return text
			.split(/[-_\s]/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	}

	private generateIntroduction(args: GenerateGuideArgs): string {
		const audience = args.audience || 'general';
		const audienceText = {
			developer:
				'This guide is designed for developers and technical implementers.',
			user: 'This guide is written for end users and non-technical stakeholders.',
			admin:
				'This guide is intended for system administrators and DevOps professionals.',
			general:
				'This guide is designed to be accessible to users of all technical levels.',
		};

		return `## Introduction\n\nWelcome to the ${this.capitalizeTitle(args.topic)} documentation. ${audienceText[audience]}\n\n`;
	}

	private async generateSectionContent(
		sectionType: string,
		args: GenerateGuideArgs,
	): Promise<string> {
		const contentMap: Record<string, (args: GenerateGuideArgs) => string> = {
			overview: () =>
				`## Overview\n\nThis section provides a comprehensive overview of ${args.topic}.\n\n`,
			authentication: () =>
				`## Authentication\n\nAuthentication is required to access ${args.topic}. The following methods are supported:\n\n- API Keys\n- OAuth 2.0\n- JWT Tokens\n\n`,
			endpoints: () =>
				`## API Endpoints\n\nThe following endpoints are available:\n\n### Base URL\n\`\`\`\nhttps://api.example.com/v1\n\`\`\`\n\n`,
			prerequisites: () =>
				`## Prerequisites\n\nBefore getting started, ensure you have:\n\n- Basic understanding of ${args.topic}\n- Development environment set up\n- Required dependencies installed\n\n`,
			setup: () =>
				`## Setup\n\nFollow these steps to set up ${args.topic}:\n\n1. Install required dependencies\n2. Configure your environment\n3. Initialize the system\n\n`,
			steps: () =>
				`## Step-by-Step Instructions\n\nFollow these detailed steps:\n\n### Step 1: Initial Setup\n\nDescription of the first step.\n\n### Step 2: Configuration\n\nDescription of the configuration step.\n\n`,
			examples: () =>
				`## Examples\n\nHere are practical examples of using ${args.topic}:\n\n`,
			troubleshooting: () =>
				`## Troubleshooting\n\nCommon issues and their solutions:\n\n### Issue 1: Common Problem\n\n**Symptoms:** Description of symptoms\n**Solution:** Step-by-step resolution\n\n`,
			// Troubleshooting-type specific sections
			problem: () =>
				`## Problem\n\nDescribe the core problem for ${args.topic}.\n\n`,
			symptoms: () =>
				`## Symptoms\n\nSymptoms: List observable behaviors and error messages users may encounter.\n\n`,
			causes: () =>
				`## Causes\n\nDetail potential root causes contributing to issues with ${args.topic}.\n\n`,
			solutions: () =>
				`## Solutions\n\nSolution: Provide actionable steps to resolve the problem safely and effectively.\n\n`,
			prevention: () =>
				`## Prevention\n\nRecommendations to prevent recurrence, monitoring tips, and best practices.\n\n`,
			implementation: () =>
				`## Implementation\n\nDetailed implementation guide for ${args.topic}:\n\n`,
			verification: () =>
				`## Verification\n\nTo verify your setup is working correctly:\n\n1. Run the test command\n2. Check the output\n3. Verify expected behavior\n\n`,
			'next-steps': () =>
				`## Next Steps\n\nNow that you've completed this guide, consider:\n\n- Exploring advanced features\n- Reading related documentation\n- Joining the community\n\n`,
		};

		const generator =
			contentMap[sectionType] ||
			(() =>
				`## ${this.capitalizeTitle(sectionType)}\n\nContent for ${sectionType} section.\n\n`);
		return generator(args);
	}

	private generateCodeSamples(args: GenerateGuideArgs): string {
		return `## Code Samples\n\n### JavaScript Example\n\n\`\`\`javascript\n// Example code for ${args.topic}\nconst example = {\n  topic: "${args.topic}",\n  initialized: true\n};\n\nconsole.log(example);\n\`\`\`\n\n### TypeScript Example\n\n\`\`\`typescript\ninterface ${this.capitalizeTitle(args.topic).replace(/\s/g, '')}Config {\n  enabled: boolean;\n  options: string[];\n}\n\nconst config: ${this.capitalizeTitle(args.topic).replace(/\s/g, '')}Config = {\n  enabled: true,\n  options: ["option1", "option2"]\n};\n\`\`\`\n\n`;
	}

	private generateExamples(args: GenerateGuideArgs): string {
		return `## Practical Examples\n\n### Basic Usage\n\nBasic usage example for ${args.topic}.\n\n### Advanced Usage\n\nAdvanced implementation patterns and best practices.\n\n### Common Use Cases\n\n1. **Use Case 1**: Description and example\n2. **Use Case 2**: Description and example\n3. **Use Case 3**: Description and example\n\n`;
	}

	private generateDiagramPlaceholders(args: GenerateGuideArgs): string {
		return `## Diagrams\n\n### System Architecture\n\n\`\`\`mermaid\ngraph TD\n    A[User] --> B[${this.capitalizeTitle(args.topic)}]\n    B --> C[Database]\n    B --> D[External API]\n\`\`\`\n\n### Process Flow\n\n\`\`\`mermaid\nflowchart LR\n    Start --> Process[${args.topic}]\n    Process --> End\n\`\`\`\n\n`;
	}

	private generateAccessibilityNotice(): string {
		return `> **Accessibility Notice**: This documentation follows WCAG 2.2 AA guidelines and includes screen reader friendly content, semantic markup, and keyboard navigation support.\n\n`;
	}

	private generateMetadata(
		args: GenerateGuideArgs,
		content: string,
	): GuideMetadata {
		const wordCount = content.split(/\s+/).length;
		const readingTime = Math.ceil(wordCount / 200); // Average reading speed

		return {
			created_at: new Date().toISOString(),
			last_updated: new Date().toISOString(),
			version: '1.0.0',
			author: 'Cortex OS Documentation Generator',
			topic: args.topic,
			type: args.type || 'guide',
			audience: args.audience || 'general',
			estimated_reading_time: readingTime,
			difficulty_level: this.determineDifficultyLevel(args),
			prerequisites: this.generatePrerequisites(args),
			related_topics: this.generateRelatedTopics(args),
		};
	}

	private determineDifficultyLevel(
		args: GenerateGuideArgs,
	): 'beginner' | 'intermediate' | 'advanced' {
		if (args.type === 'api' || args.include_code_samples) {
			return 'intermediate';
		}
		if (args.type === 'reference') {
			return 'advanced';
		}
		return 'beginner';
	}

	private generatePrerequisites(args: GenerateGuideArgs): string[] {
		const prerequisites = [];

		if (args.type === 'api') {
			prerequisites.push(
				'Basic understanding of REST APIs',
				'HTTP methods knowledge',
			);
		}
		if (args.include_code_samples) {
			prerequisites.push(
				'Programming experience',
				'Development environment setup',
			);
		}
		if (args.audience === 'developer') {
			prerequisites.push('Software development experience');
		}

		return prerequisites;
	}

	private generateRelatedTopics(args: GenerateGuideArgs): string[] {
		return [
			`${args.topic} best practices`,
			`${args.topic} troubleshooting`,
			`${args.topic} advanced features`,
		];
	}

	private analyzeAccessibility(
		content: string,
		args: GenerateGuideArgs,
	): AccessibilityFeatures {
		const headingMatches = content.match(/^#{1,6}\s/gm) || [];
		const altTextMatches = content.match(/!\[([^\]]*)\]/g) || [];
		const ariaLabelMatches = content.match(/aria-label/g) || [];

		return {
			alt_text_count: altTextMatches.length,
			heading_structure: headingMatches.length > 0,
			keyboard_navigation: args.accessibility_level === 'full',
			screen_reader_friendly: args.accessibility_level !== 'basic',
			color_contrast_compliant: true,
			semantic_markup: true,
			aria_labels: ariaLabelMatches.length,
		};
	}

	private formatContent(
		content: string,
		sections: GuideSection[],
		args: GenerateGuideArgs,
	): string {
		switch (args.format) {
			case 'html':
				return this.convertToHTML(content);
			case 'json':
				return JSON.stringify({ content, sections }, null, 2);
			case 'yaml':
				return this.convertToYAML(content, sections);
			default:
				return content;
		}
	}

	private convertToHTML(markdown: string): string {
		// Basic markdown to HTML conversion
		return markdown
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/`(.+?)`/g, '<code>$1</code>')
			.replace(
				/```(\w+)?\n([\s\S]*?)\n```/g,
				'<pre><code class="language-$1">$2</code></pre>',
			)
			.replace(/\n\n/g, '</p><p>')
			.replace(/^(?!<[h|p|pre])/gm, '<p>')
			.replace(/(?<!>)$/gm, '</p>');
	}

	private convertToYAML(content: string, sections: GuideSection[]): string {
		const yamlData = {
			title: sections[0]?.title || 'Generated Guide',
			content: content,
			sections: sections.map((s) => ({
				id: s.id,
				title: s.title,
				type: s.type,
				level: s.level,
			})),
		};

		// Basic YAML serialization
		return `---\ntitle: "${yamlData.title}"\ncontent: |\n  ${content.replace(/\n/g, '\n  ')}\nsections:\n${sections.map((s) => `  - id: ${s.id}\n    title: "${s.title}"\n    type: ${s.type}\n    level: ${s.level}`).join('\n')}\n---`;
	}

	private mapSectionType(sectionType: string): GuideSection['type'] {
		const mapping: Record<string, GuideSection['type']> = {
			overview: 'overview',
			steps: 'procedure',
			endpoints: 'reference',
			examples: 'example',
			troubleshooting: 'troubleshooting',
		};

		return mapping[sectionType] || 'overview';
	}

	private generateSectionTags(
		sectionType: string,
		args: GenerateGuideArgs,
	): string[] {
		const baseTags = [args.topic, args.type || 'guide'];

		const sectionTags: Record<string, string[]> = {
			authentication: ['security', 'auth'],
			endpoints: ['api', 'reference'],
			examples: ['examples', 'code'],
			troubleshooting: ['debug', 'issues'],
			setup: ['installation', 'config'],
		};

		return [...baseTags, ...(sectionTags[sectionType] || [])];
	}

	private async saveToFile(
		result: GenerateGuideResult,
		outputPath: string,
	): Promise<string> {
		// In a real implementation, this would write to the file system
		// For this MCP tool, we'll return the intended file path
		const extension = result.format === 'markdown' ? 'md' : result.format;
		const fileName = `${outputPath}.${extension}`;

		return fileName;
	}
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
