#!/usr/bin/env tsx

/**
 * Documentation Sync Script for Cortex-OS
 * Sept 2025 Standards: Functional-first, TypeScript, ESM, proper error handling
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, '..');
const WEBSITE_DIR = __dirname;
const DOCS_DIR = join(WEBSITE_DIR, 'docs');

// Type-safe configuration structure
interface DocsStructure {
  readonly [category: string]: Record<string, string>;
}

const DOCS_STRUCTURE: DocsStructure = {
  apps: {
    'cortex-os': 'Core Runtime',
    'cortex-cli': 'Command Line Interface', 
    'cortex-webui': 'Web Interface',
    'cortex-py': 'Python Integration',
    'cortex-marketplace': 'Marketplace',
    'cortex-code': 'Code Editor'
  },
  packages: {
    'mcp': 'Model Context Protocol',
    'mcp-core': 'MCP Core',
    'mcp-bridge': 'MCP Bridge',
    'agents': 'Autonomous Agents',
    'agent-toolkit': 'Agent Toolkit',
    'a2a': 'Agent-to-Agent Communication',
    'memories': 'Memory Management',
    'rag': 'Retrieval Augmented Generation',
    'orchestration': 'Workflow Orchestration',
    'security': 'Security Framework',
    'observability': 'Monitoring & Observability',
    'simlab': 'Simulation Laboratory',
    'evals': 'Evaluation Framework'
  }
} as const;

interface SyncResult {
  readonly success: boolean;
  readonly packageName: string;
  readonly fileCount: number;
  readonly error?: string;
}

// Functional utilities (≤40 lines each)
const ensureDir = async (dir: string): Promise<void> => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dir}: ${error}`);
  }
};

const isMarkdownFile = (filename: string): boolean => 
  filename.endsWith('.md');

const shouldSkipFile = (filename: string): boolean => {
  const skipPatterns = [
    /^tdd-plan.*\.md$/i,
    /^initiative-summary\.md$/i, 
    /^.*-summary\.md$/i,
    /^temp-.*\.md$/i
  ];
  return skipPatterns.some(pattern => pattern.test(filename));
};

// Improved MDX sanitization - comprehensive approach
const sanitizeMdxContent = (content: string): string => {
  return content
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    
    // Fix JavaScript/TypeScript code blocks that could be parsed as JSX
    .replace(/```(\w+)?\n([\s\S]*?)\n```/g, (_, lang, code) => {
      const sanitizedCode = code
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `\`\`\`${lang || ''}\n${sanitizedCode}\n\`\`\``;
    })
    
    // Fix inline code that contains < or >
    .replace(/`([^`]*[<>=][^`]*)`/g, (_, code) => {
      const sanitized = code
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/=/g, '&#61;');
      return `\`${sanitized}\``;
    })
    
    // Fix problematic operators in text
    .replace(/(\s)(<=)(\s)/g, '$1≤$3')
    .replace(/(\s)(>=)(\s)/g, '$1≥$3')
    .replace(/(\s)(=>)(\s)/g, '$1⇒$3')
    
    // Handle TypeScript/JavaScript type annotations
    .replace(/Record<([^>]+)>/g, '`Record<$1>`')
    .replace(/Array<([^>]+)>/g, '`Array<$1>`')
    .replace(/Promise<([^>]+)>/g, '`Promise<$1>`')
    
    // Fix table cell content with type unions
    .replace(/\|\s*([^|]*)\s*\\\|\s*([^|]*)\s*\\\|\s*([^|]*)\s*\|/g, '| `$1` \\| `$2` \\| `$3` |')
    .replace(/\|\s*([^|]*)\s*\\\|\s*([^|]*)\s*\|/g, '| `$1` \\| `$2` |')
    
    // Fix generic type parameters in table cells
    .replace(/\|\s*([^<|]*)<([^>|]*)>\s*\|/g, '| `$1<$2>` |')
    
    // Normalize unicode characters  
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    
    // Remove empty links/images
    .replace(/\[([^\]]*)\]\(\s*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\(\s*\)/g, '')
    
    // Fix JSX-like syntax that's not actually JSX
    .replace(/<([A-Z]\w*)\s+([^>]+)>/g, '&lt;$1 $2&gt;')
    .replace(/<([a-z]\w*)\s*=\s*[^>]*>/g, (match) => {
      return '`' + match.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '`';
    })
    
    // Clean whitespace
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]+$/gm, '');
};

const createFrontmatter = (filename: string, displayName: string): string => {
  const title = filename === 'README.md' ? displayName :
    filename.replace(/\.md$/, '').replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

  return `---\ntitle: ${title}\nsidebar_label: ${title}\n---\n\n`;
};

// Pure function for processing single file
const processMarkdownFile = async (
  sourcePath: string,
  targetPath: string,
  filename: string,
  displayName: string
): Promise<void> => {
  try {
    let content = await fs.readFile(sourcePath, 'utf8');
    content = sanitizeMdxContent(content);
    
    if (!content.startsWith('---')) {
      content = createFrontmatter(filename, displayName) + content;
    }
    
    await fs.writeFile(targetPath, content);
  } catch (error) {
    throw new Error(`Failed to process ${sourcePath}: ${error}`);
  }
};

// Main sync function - pure and composable  
const syncPackageDocs = async (
  category: string,
  packageName: string,
  displayName: string
): Promise<SyncResult> => {
  const sourceDocsDir = join(ROOT_DIR, category, packageName, 'docs');
  const targetDir = join(DOCS_DIR, category, packageName);

  try {
    await fs.access(sourceDocsDir);
  } catch {
    return {
      success: false,
      packageName,
      fileCount: 0,
      error: `No docs found for ${category}/${packageName}`
    };
  }

  console.log(`📁 Syncing ${category}/${packageName} -> ${targetDir}`);
  
  try {
    await ensureDir(targetDir);
    const entries = await fs.readdir(sourceDocsDir, { withFileTypes: true });
    let fileCount = 0;

    for (const entry of entries) {
      if (entry.isFile() && isMarkdownFile(entry.name)) {
        if (shouldSkipFile(entry.name)) {
          console.log(`📄 Skipping ${entry.name} (pattern match)`);
          continue;
        }

        const sourcePath = join(sourceDocsDir, entry.name);
        const targetPath = join(targetDir, entry.name);
        
        await processMarkdownFile(sourcePath, targetPath, entry.name, displayName);
        fileCount++;
      }
    }

    return { success: true, packageName, fileCount };
  } catch (error) {
    return {
      success: false,
      packageName,
      fileCount: 0,
      error: `Sync failed: ${error}`
    };
  }
};

// Sidebar generation - pure function
const generateSidebarConfig = async (): Promise<object> => {
  interface SidebarCategory {
    type: 'category';
    label: string;
    items: any[];
    collapsed?: boolean;
  }

  const sidebar = {
    tutorialSidebar: [
      'getting-started',
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
        label: 'Applications',
        collapsed: false,
        items: []
      } as SidebarCategory,
      {
        type: 'category', 
        label: 'Core Packages',
        collapsed: false,
        items: []
      } as SidebarCategory,
      {
        type: 'category',
        label: 'Agents',
        items: [
          'agents/overview',
          'agents/contracts-validation',
          'agents/memory-state',
        ],
      }
    ]
  };

  // Add applications dynamically
  for (const [packageName, displayName] of Object.entries(DOCS_STRUCTURE.apps)) {
    const docsPath = join(DOCS_DIR, 'apps', packageName);
    try {
      const files = await fs.readdir(docsPath);
      const mdFiles = files
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .map(f => `apps/${packageName}/${f.replace('.md', '')}`);
        
      if (mdFiles.length > 0) {
        const appsCategory = sidebar.tutorialSidebar.find(item => 
          typeof item === 'object' && item !== null && 'label' in item && item.label === 'Applications'
        ) as SidebarCategory;
        appsCategory.items.push({ type: 'category', label: displayName, items: mdFiles });
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  // Add packages dynamically  
  for (const [packageName, displayName] of Object.entries(DOCS_STRUCTURE.packages)) {
    const docsPath = join(DOCS_DIR, 'packages', packageName);
    try {
      const files = await fs.readdir(docsPath);
      const mdFiles = files
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .map(f => `packages/${packageName}/${f.replace('.md', '')}`);
        
      if (mdFiles.length > 0) {
        const packagesCategory = sidebar.tutorialSidebar.find(item => 
          typeof item === 'object' && item !== null && 'label' in item && item.label === 'Core Packages'
        ) as SidebarCategory;
        packagesCategory.items.push({ type: 'category', label: displayName, items: mdFiles });
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return sidebar;
};

// Main orchestration function
const syncAllDocs = async (): Promise<void> => {
  console.log('🚀 Starting Cortex-OS documentation sync...');

  // Ensure directories exist
  await ensureDir(join(DOCS_DIR, 'apps'));
  await ensureDir(join(DOCS_DIR, 'packages'));

  const results: SyncResult[] = [];

  // Sync all categories
  for (const [category, packages] of Object.entries(DOCS_STRUCTURE)) {
    for (const [packageName, displayName] of Object.entries(packages)) {
      const result = await syncPackageDocs(category, packageName, displayName);
      results.push(result);
      
      if (!result.success && !result.error?.includes('No docs found')) {
        console.warn(`⚠️  ${result.error}`);
      }
    }
  }

  // Generate and write sidebar
  const sidebarConfig = await generateSidebarConfig();
  const sidebarContent = `import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Auto-generated sidebar configuration for Cortex-OS documentation
 * Generated by sync-docs.ts - do not edit manually
 */
const sidebars: SidebarsConfig = ${JSON.stringify(sidebarConfig, null, 2)};

export default sidebars;
`;

  const sidebarPath = join(WEBSITE_DIR, 'sidebars.ts');
  await fs.writeFile(sidebarPath, sidebarContent);

  // Summary
  const successful = results.filter(r => r.success);
  const totalFiles = successful.reduce((sum, r) => sum + r.fileCount, 0);
  
  console.log(`✅ Synced ${successful.length} packages/apps (${totalFiles} files)`);
  console.log('📝 Updated sidebars.ts');
  console.log('🎉 Documentation sync complete!');
};

// ESM entry point
if (import.meta.url === `file://${__filename}`) {
  syncAllDocs().catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
}

// Named exports only (Sept 2025 standard)
export { syncAllDocs, DOCS_STRUCTURE, sanitizeMdxContent };