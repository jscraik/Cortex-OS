/**
 * Frontend Scaffolding Rules and Templates
 * Provides standardized templates and patterns for frontend development
 */

export interface ScaffoldTemplate {
	name: string;
	description: string;
	framework: string[];
	files: ScaffoldFile[];
	dependencies?: string[];
}

export interface ScaffoldFile {
	path: string;
	content: string;
	conditions?: string[];
}

// React Component Templates
export const REACT_COMPONENT_TEMPLATES: ScaffoldTemplate[] = [
	{
		name: 'functional-component',
		description: 'Basic functional React component with TypeScript',
		framework: ['react', 'next'],
		files: [
			{
				path: 'src/components/{{ComponentName}}/{{ComponentName}}.tsx',
				content: `import React from 'react';
import styles from './{{ComponentName}}.module.css';

export interface {{ComponentName}}Props {
  className?: string;
  children?: React.ReactNode;
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({
  className = '',
  children
}) => {
  return (
    <div className={\`\${styles.{{componentName}}} \${className}\`}>
      {children}
    </div>
  );
};

export default {{ComponentName}};
`,
			},
			{
				path: 'src/components/{{ComponentName}}/{{ComponentName}}.module.css',
				content: `.{{componentName}} {
  /* Component styles */
}
`,
			},
			{
				path: 'src/components/{{ComponentName}}/index.ts',
				content: `export { {{ComponentName}}, type {{ComponentName}}Props } from './{{ComponentName}}';
`,
			},
		],
	},
	{
		name: 'hook-component',
		description: 'React component with custom hook',
		framework: ['react', 'next'],
		files: [
			{
				path: 'src/components/{{ComponentName}}/{{ComponentName}}.tsx',
				content: `import React from 'react';
import { use{{ComponentName}} } from './use{{ComponentName}}';
import styles from './{{ComponentName}}.module.css';

export interface {{ComponentName}}Props {
  className?: string;
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({
  className = ''
}) => {
  const { /* hook values */ } = use{{ComponentName}}();

  return (
    <div className={\`\${styles.{{componentName}}} \${className}\`}>
      {/* Component content */}
    </div>
  );
};

export default {{ComponentName}};
`,
			},
			{
				path: 'src/components/{{ComponentName}}/use{{ComponentName}}.ts',
				content: `import { useState, useEffect } from 'react';

export interface Use{{ComponentName}}Return {
  // Define hook return type
}

export const use{{ComponentName}} = (): Use{{ComponentName}}Return => {
  // Hook implementation

  return {
    // Return hook values
  };
};
`,
			},
			{
				path: 'src/components/{{ComponentName}}/{{ComponentName}}.module.css',
				content: `.{{componentName}} {
  /* Component styles */
}
`,
			},
		],
	},
];

// Vue Component Templates
export const VUE_COMPONENT_TEMPLATES: ScaffoldTemplate[] = [
	{
		name: 'vue-component',
		description: 'Vue 3 component with Composition API and TypeScript',
		framework: ['vue', 'nuxt'],
		files: [
			{
				path: 'src/components/{{ComponentName}}.vue',
				content: `<template>
  <div class="{{component-name}}">
    <!-- Component template -->
  </div>
</template>

<script setup lang="ts">
interface Props {
  // Define props
}

const props = withDefaults(defineProps<Props>(), {
  // Default values
});

// Component logic
</script>

<style scoped>
.{{component-name}} {
  /* Component styles */
}
</style>
`,
			},
		],
	},
];

// Page Templates
export const PAGE_TEMPLATES: ScaffoldTemplate[] = [
	{
		name: 'next-page',
		description: 'Next.js page with TypeScript and SEO',
		framework: ['next'],
		files: [
			{
				path: 'src/pages/{{pageName}}.tsx',
				content: `import React from 'react';
import Head from 'next/head';
import type { NextPage, GetStaticProps } from 'next';

interface {{PageName}}Props {
  // Define props
}

const {{PageName}}: NextPage<{{PageName}}Props> = (props) => {
  return (
    <>
      <Head>
        <title>{{pageTitle}}</title>
        <meta name="description" content="{{pageDescription}}" />
      </Head>

      <main>
        {/* Page content */}
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps<{{PageName}}Props> = async () => {
  return {
    props: {
      // Static props
    }
  };
};

export default {{PageName}};
`,
			},
		],
	},
];

// Hook Templates
export const HOOK_TEMPLATES: ScaffoldTemplate[] = [
	{
		name: 'data-hook',
		description: 'Custom hook for data fetching',
		framework: ['react', 'next'],
		files: [
			{
				path: 'src/hooks/use{{HookName}}.ts',
				content: `import { useState, useEffect } from 'react';

export interface Use{{HookName}}Options {
  // Options type
}

export interface Use{{HookName}}Return {
  data: any | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const use{{HookName}} = (
  options: Use{{HookName}}Options = {}
): Use{{HookName}}Return => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch logic here

      setData(/* fetched data */);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [/* dependencies */]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
`,
			},
		],
	},
];

// Utility Templates
export const UTIL_TEMPLATES: ScaffoldTemplate[] = [
	{
		name: 'api-client',
		description: 'API client utility with TypeScript',
		framework: ['react', 'next', 'vue'],
		files: [
			{
				path: 'src/utils/{{utilName}}.ts',
				content: `export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export class {{UtilName}} {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = defaultHeaders;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return {
      data,
      status: response.status,
    };
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
`,
			},
		],
	},
];

// Template replacement utility
export function processTemplate(
	template: string,
	variables: Record<string, string>,
): string {
	let processed = template;

	for (const [key, value] of Object.entries(variables)) {
		// Replace {{key}} with value
		const regex = new RegExp(`{{${key}}}`, 'g');
		processed = processed.replace(regex, value);
	}

	return processed;
}

// Case conversion utilities for template variables
export function toPascalCase(str: string): string {
	return str.replace(/(?:^|[-_])(\w)/g, (_, char) => char.toUpperCase());
}

export function toCamelCase(str: string): string {
	const pascal = toPascalCase(str);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toKebabCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '-$1')
		.toLowerCase()
		.replace(/^-/, '');
}

export function generateTemplateVariables(
	componentName: string,
): Record<string, string> {
	return {
		ComponentName: toPascalCase(componentName),
		componentName: toCamelCase(componentName),
		'component-name': toKebabCase(componentName),
		COMPONENT_NAME: componentName.toUpperCase().replace(/[-_]/g, '_'),
	};
}

// Get templates by framework
export function getTemplatesByFramework(framework: string): ScaffoldTemplate[] {
	const allTemplates = [
		...REACT_COMPONENT_TEMPLATES,
		...VUE_COMPONENT_TEMPLATES,
		...PAGE_TEMPLATES,
		...HOOK_TEMPLATES,
		...UTIL_TEMPLATES,
	];

	return allTemplates.filter(
		(template) =>
			template.framework.includes(framework) ||
			template.framework.includes('all'),
	);
}
