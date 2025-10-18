import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import matter from 'gray-matter';
import YAML from 'yaml';
import semver from 'semver';
import { SkillMetadataSchema, type SkillMetadata, stripBrandPrefix } from './index.js';
import { SkillsRegistryError, wrapError } from './brand.js';

export interface LoadSkillsOptions {
  root?: string;
}

export interface LoadedSkill {
  metadata: SkillMetadata;
  body: string;
  filePath: string;
  relativePath: string;
}

const isMarkdown = (filePath: string): boolean => filePath.toLowerCase().endsWith('.md');

const listMarkdownFiles = async (rootDir: string, current = rootDir): Promise<string[]> => {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryPath = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(rootDir, entryPath)));
      continue;
    }

    if (entry.isFile() && isMarkdown(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
};

const parseFrontMatter = (content: string) =>
  matter(content, {
    delimiters: '---',
    language: 'yaml',
    engines: {
      yaml: (input: string) => YAML.parse(input) ?? {}
    }
  });

export const loadSkills = async ({ root = 'skills' }: LoadSkillsOptions = {}): Promise<LoadedSkill[]> => {
  const rootDir = resolve(root);
  const stats = await stat(rootDir).catch((error) => {
    throw wrapError(error, `unable to read skills directory at ${rootDir}`);
  });

  if (!stats.isDirectory()) {
    throw new SkillsRegistryError(`expected directory at ${rootDir}`);
  }

  const files = (await listMarkdownFiles(rootDir)).sort();
  const loaded: LoadedSkill[] = [];

  for (const filePath of files) {
    const fileContent = await readFile(filePath, 'utf8');
    const parsed = parseFrontMatter(fileContent);
    const relativePath = relative(rootDir, filePath) || filePath;

    try {
      const metadata = SkillMetadataSchema.parse(parsed.data);
      loaded.push({
        metadata,
        body: parsed.content.trim(),
        filePath,
        relativePath
      });
    } catch (error) {
      const message = error instanceof Error ? stripBrandPrefix(error.message) : 'invalid metadata';
      throw new SkillsRegistryError(`${relativePath}: ${message}`);
    }
  }

  return loaded.sort((a, b) => {
    const nameCompare = a.metadata.name.localeCompare(b.metadata.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return semver.rcompare(a.metadata.version, b.metadata.version);
  });
};
