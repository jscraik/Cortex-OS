/**
 * @file packages/prp-runner/src/enforcement/initial-processor.ts
 * @description Process initial.md files into enforcement profiles for PRP validation
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
/**
 * Parse initial.md markdown content into structured data
 */
export function parseInitialMd(content) {
  const lines = content.split('\n');
  const result = {
    title: '',
    context: '',
    requirements: [],
    tests: [],
    acceptance_criteria: [],
  };
  let currentSection = '';
  let currentList = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3);
      } else {
        inCodeBlock = false;
        // Process collected code block
        if (codeBlockLang === 'yaml' || codeBlockLang === 'json') {
          try {
            const codeContent = currentList.join('\n');
            const parsed =
              codeBlockLang === 'yaml' ? parseYaml(codeContent) : JSON.parse(codeContent);
            // Merge parsed configuration
            if (parsed.budgets) result.budgets = { ...result.budgets, ...parsed.budgets };
            if (parsed.architecture)
              result.architecture = {
                ...result.architecture,
                ...parsed.architecture,
              };
            if (parsed.governance)
              result.governance = {
                ...result.governance,
                ...parsed.governance,
              };
          } catch (error) {
            console.warn(`Failed to parse ${codeBlockLang} block:`, error);
          }
        }
        currentList = [];
        codeBlockLang = '';
      }
      continue;
    }
    if (inCodeBlock) {
      currentList.push(lines[i]); // Preserve original line with indentation
      continue;
    }
    // Handle headers
    if (line.startsWith('#')) {
      // Finish previous section
      if (currentSection && currentList.length > 0) {
        finishSection(result, currentSection, currentList);
        currentList = [];
      }
      const headerLevel = line.match(/^#+/)?.[0].length || 1;
      const headerText = line.replace(/^#+\s*/, '').toLowerCase();
      if (headerLevel === 1 && !result.title) {
        result.title = line.replace(/^#+\s*/, '');
      }
      currentSection = headerText;
      continue;
    }
    // Handle list items
    if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
      const listItem = line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');
      currentList.push(listItem);
      continue;
    }
    // Handle regular text
    if (line.length > 0) {
      if (
        currentSection === '' ||
        currentSection === 'context' ||
        currentSection === 'description'
      ) {
        result.context += (result.context ? '\n' : '') + line;
      } else {
        currentList.push(line);
      }
    }
  }
  // Finish last section
  if (currentSection && currentList.length > 0) {
    finishSection(result, currentSection, currentList);
  }
  return result;
}
/**
 * Simple YAML parser for basic key-value structures
 */
function parseYaml(content) {
  const result = {};
  const lines = content.split('\n');
  let currentObj = result;
  const stack = [result];
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    if (trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();
      // Handle nested objects
      while (stack.length > Math.floor(indent / 2) + 1) {
        stack.pop();
      }
      currentObj = stack[stack.length - 1];
      if (value === '' || value === '{}' || value === '[]') {
        // Empty object or array
        currentObj[key.trim()] = value === '[]' ? [] : {};
        stack.push(currentObj[key.trim()]);
      } else if (!Number.isNaN(Number(value))) {
        // Numeric value
        currentObj[key.trim()] = Number(value);
      } else if (value === 'true' || value === 'false') {
        // Boolean value
        currentObj[key.trim()] = value === 'true';
      } else {
        // String value
        currentObj[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
  return result;
} /**
 * Assign collected content to appropriate section
 */
function finishSection(result, section, content) {
  const sectionLower = section.toLowerCase();
  if (sectionLower.includes('requirement')) {
    result.requirements.push(...content);
  } else if (sectionLower.includes('constraint')) {
    result.constraints = [...(result.constraints || []), ...content];
  } else if (sectionLower.includes('reference')) {
    result.references = [...(result.references || []), ...content];
  } else if (sectionLower.includes('test')) {
    result.tests.push(...content);
  } else if (sectionLower.includes('acceptance') || sectionLower.includes('criteria')) {
    result.acceptance_criteria.push(...content);
  }
}
/**
 * Convert InitialMdContent to EnforcementProfile
 */
export function compileEnforcementProfile(initialMd) {
  const defaults = {
    budgets: {
      coverageLines: 95,
      coverageBranches: 90,
      performanceLCP: 2500,
      performanceTBT: 300,
      a11yScore: 95,
    },
    architecture: {
      allowedPackageBoundaries: [],
      namingConventions: {},
      repoLayout: [],
      crossBoundaryImports: [],
    },
    governance: {
      licensePolicy: '(Apache-2.0 OR Commercial)',
      codeownersMapping: {},
      structureGuardExceptions: [],
      requiredChecks: ['test', 'lint', 'type-check'],
    },
  };
  // Override defaults with values from initial.md
  const profile = {
    budgets: {
      ...defaults.budgets,
      ...(initialMd.budgets?.coverage && {
        coverageLines: initialMd.budgets.coverage.lines ?? defaults.budgets.coverageLines,
        coverageBranches: initialMd.budgets.coverage.branches ?? defaults.budgets.coverageBranches,
      }),
      ...(initialMd.budgets?.performance && {
        performanceLCP: initialMd.budgets.performance.lcp ?? defaults.budgets.performanceLCP,
        performanceTBT: initialMd.budgets.performance.tbt ?? defaults.budgets.performanceTBT,
      }),
      ...(initialMd.budgets?.accessibility && {
        a11yScore: initialMd.budgets.accessibility.score ?? defaults.budgets.a11yScore,
      }),
    },
    architecture: {
      ...defaults.architecture,
      ...(initialMd.architecture?.boundaries && {
        allowedPackageBoundaries: initialMd.architecture.boundaries,
      }),
      ...(initialMd.architecture?.naming && {
        namingConventions: initialMd.architecture.naming,
      }),
      ...(initialMd.architecture?.layout && {
        repoLayout: initialMd.architecture.layout,
      }),
      ...(initialMd.architecture?.exceptions && {
        crossBoundaryImports: initialMd.architecture.exceptions,
      }),
    },
    governance: {
      ...defaults.governance,
      ...(initialMd.governance?.license && {
        licensePolicy: initialMd.governance.license,
      }),
      ...(initialMd.governance?.owners && {
        codeownersMapping: initialMd.governance.owners,
      }),
      ...(initialMd.governance?.checks && {
        requiredChecks: initialMd.governance.checks,
      }),
    },
  };
  return profile;
}
/**
 * Load and process initial.md file from filesystem
 */
export async function loadInitialMd(projectRoot, initialMdPath) {
  const searchPaths = [
    initialMdPath,
    join(projectRoot, 'initial.md'),
    join(projectRoot, '.prp', 'initial.md'),
    join(projectRoot, 'docs', 'initial.md'),
    join(projectRoot, 'INITIAL.md'),
  ].filter(Boolean);
  for (const path of searchPaths) {
    try {
      const fullPath = resolve(path);
      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = parseInitialMd(content);
      return compileEnforcementProfile(parsed);
    } catch {
      // Swallow read/parse errors for this candidate path and continue searching other locations.
    }
  }
  // No initial.md found, return defaults
  console.warn('No initial.md found, using default enforcement profile');
  return compileEnforcementProfile({
    title: 'Default Project',
    context: 'No initial.md configuration found',
    requirements: [],
    tests: [],
    acceptance_criteria: [],
  });
}
//# sourceMappingURL=initial-processor.js.map
