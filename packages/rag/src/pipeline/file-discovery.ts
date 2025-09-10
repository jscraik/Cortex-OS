import path from 'node:path';
import fg from 'fast-glob';
import micromatch from 'micromatch';
import { z } from 'zod';

const baseSchema = z.object({
	include: z.array(z.string()).default(['**/*']),
	exclude: z.array(z.string()).default([]),
	includePriority: z.boolean().default(false),
});

export const filterPathsSchema = baseSchema.extend({
	paths: z.array(z.string()),
	cwd: z.string().optional(),
});

export type FilterPathsOptions = z.infer<typeof filterPathsSchema>;

export function filterPaths(options: FilterPathsOptions): string[] {
	const { paths, include, exclude, includePriority, cwd } =
		filterPathsSchema.parse(options);
	return paths.filter((p) => {
		const rel = cwd ? path.relative(cwd, p) : p;
		const isIncluded = micromatch.isMatch(rel, include);
		const isExcluded = micromatch.isMatch(rel, exclude);
		if (includePriority) {
			if (isIncluded) return true;
			return !isExcluded;
		}
		return isIncluded && !isExcluded;
	});
}

export const discoverFilesSchema = baseSchema.extend({
	root: z.string(),
});

export type DiscoverFilesOptions = z.infer<typeof discoverFilesSchema>;

export async function discoverFiles(
	options: DiscoverFilesOptions,
): Promise<string[]> {
	const { root, include, exclude, includePriority } =
		discoverFilesSchema.parse(options);
	const entries = await fg(['**/*'], { cwd: root, dot: true, onlyFiles: true });
	const abs = entries.map((p: string) => path.resolve(root, p));
	return filterPaths({
		paths: abs,
		include,
		exclude,
		includePriority,
		cwd: root,
	});
}
