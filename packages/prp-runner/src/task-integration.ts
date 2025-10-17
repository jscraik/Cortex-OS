import { readFile } from 'node:fs/promises';
import type { Blueprint } from './runner.js';
import {
        CURRENT_SCHEMA_VERSION,
        RunManifestSchema,
        type RunManifest,
        type TaskPriority,
} from './run-manifest/schema.js';

export type TaskPriorityString = TaskPriority;

interface TaskPlanPaths {
        implementation_plan_md?: string;
        implementationPlanMd?: string;
        tdd_plan_md?: string;
        tddPlanMd?: string;
        checklist_md?: string;
        checklistMd?: string;
        summary_md?: string;
        summaryMd?: string;
        spec_md?: string;
        specMd?: string;
}

interface TaskPlannerSection {
        plan_paths?: TaskPlanPaths;
        planPaths?: TaskPlanPaths;
}

interface TaskTestingObject {
        coverage_target?: string;
        coverageTarget?: string;
        types?: string[];
        determinism?: string;
        strategy?: string;
        notes?: string;
}

interface TaskSpecSection {
        goal?: string;
        entry_points?: string[];
        entryPoints?: string[];
        stack?: string[];
        constraints?: string[];
        testing?: TaskTestingObject | string[] | string;
        non_goals?: string[];
        nonGoals?: string[];
        priority?: TaskPriorityString;
}

interface TaskBaton {
        version?: string;
        schema_version?: string;
        schemaVersion?: string;
        task_slug?: string;
        taskSlug?: string;
        task_id?: string;
        taskId?: string;
        task_dir?: string;
        taskDir?: string;
        baton_path?: string;
        batonPath?: string;
        goal?: string;
        entry_points?: string[];
        entryPoints?: string[];
        stack?: string[];
        constraints?: string[];
        testing?: TaskTestingObject | string[] | string;
        non_goals?: string[];
        nonGoals?: string[];
        priority?: TaskPriorityString;
        planner?: TaskPlannerSection;
        spec?: TaskSpecSection;
}

export interface TaskManifestMetadata {
        taskId: string;
        priority?: TaskPriorityString;
        specPath?: string;
        batonPath?: string;
        taskDir?: string;
        planPaths?: Record<string, string>;
}

export interface TaskBlueprintIntegration {
        blueprint: Blueprint;
        metadata: TaskManifestMetadata;
}

export async function loadTaskBaton(path: string): Promise<TaskBaton> {
        const data = await readFile(path, 'utf8');
        return JSON.parse(data) as TaskBaton;
}

function toTitleCase(slug: string): string {
        return slug
                .split(/[-_\s]+/u)
                .filter(Boolean)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
}

function arrayify(value: unknown): string[] {
        if (!value) return [];
        if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
        if (typeof value === 'string') return value.split(/\n+/u).map((item) => item.trim()).filter(Boolean);
        return [];
}

function collectTesting(testing: TaskSpecSection['testing']): string[] {
        if (!testing) return [];
        if (Array.isArray(testing) || typeof testing === 'string') {
                return arrayify(testing);
        }
        const segments: string[] = [];
        if (testing.coverage_target || testing.coverageTarget) {
                segments.push(`Coverage target: ${testing.coverage_target ?? testing.coverageTarget}`);
        }
        if (testing.types?.length) {
                segments.push(`Testing types: ${testing.types.join(', ')}`);
        }
        if (testing.determinism) {
                segments.push(`Determinism: ${testing.determinism}`);
        }
        if (testing.strategy) {
                segments.push(`Strategy: ${testing.strategy}`);
        }
        if (testing.notes) {
                segments.push(`Notes: ${testing.notes}`);
        }
        return segments;
}

function mergePlanPaths(planPaths?: TaskPlanPaths): Record<string, string> | undefined {
        if (!planPaths) return undefined;
        const entries = Object.entries(planPaths)
                .filter(([, value]) => typeof value === 'string' && value.length > 0)
                .map(([key, value]) => [key, value as string]);
        if (entries.length === 0) return undefined;
        return Object.fromEntries(entries);
}

function buildRequirements(spec: TaskSpecSection, fallback: TaskBaton): string[] {
        const requirements = [
                ...arrayify(spec.constraints ?? fallback.constraints),
                ...collectTesting(spec.testing ?? fallback.testing),
        ];
        if (requirements.length > 0) return requirements;
        return [`Deliver outcomes for task: ${fallback.task_slug ?? fallback.taskSlug ?? fallback.taskId ?? 'task'}`];
}

function cleanMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
        return Object.fromEntries(
                Object.entries(metadata).filter(([, value]) =>
                        Array.isArray(value)
                                ? value.length > 0
                                : value !== undefined && value !== null && value !== ''
                ),
        );
}

function deriveSpecSection(taskSpec: TaskBaton): TaskSpecSection {
        if (taskSpec.spec) return taskSpec.spec;
        return {
                goal: taskSpec.goal,
                entry_points: taskSpec.entry_points,
                stack: taskSpec.stack,
                constraints: taskSpec.constraints,
                testing: taskSpec.testing,
                non_goals: taskSpec.non_goals,
                priority: taskSpec.priority,
        };
}

function normalizeTaskId(taskSpec: TaskBaton): string {
        return (
                taskSpec.task_slug ??
                taskSpec.taskSlug ??
                taskSpec.task_id ??
                taskSpec.taskId ??
                'task'
        );
}

function resolveSpecPath(planPaths?: Record<string, string>): string | undefined {
        if (!planPaths) return undefined;
        return (
                planPaths.spec_md ??
                planPaths.specMd ??
                planPaths.implementation_plan_md ??
                planPaths.implementationPlanMd
        );
}

export function buildPrpBlueprint(taskSpec: TaskBaton): TaskBlueprintIntegration {
        const normalizedId = normalizeTaskId(taskSpec);
        const specSection = deriveSpecSection(taskSpec);
        const goal = specSection.goal ?? taskSpec.goal ?? toTitleCase(normalizedId);
        const title = toTitleCase(normalizedId);
        const requirements = buildRequirements(specSection, taskSpec);
        const planPaths = taskSpec.planner?.plan_paths ?? taskSpec.planner?.planPaths;
        const mergedPlanPaths = mergePlanPaths(planPaths);
        const metadata = cleanMetadata({
                source: 'task-manager',
                schemaVersion:
                        taskSpec.schema_version ?? taskSpec.schemaVersion ?? taskSpec.version ?? CURRENT_SCHEMA_VERSION,
                batonPath: taskSpec.baton_path ?? taskSpec.batonPath,
                taskDir: taskSpec.task_dir ?? taskSpec.taskDir,
                entryPoints: specSection.entry_points ?? taskSpec.entry_points,
                stack: specSection.stack ?? taskSpec.stack,
                nonGoals: specSection.non_goals ?? specSection.nonGoals ?? taskSpec.non_goals ?? taskSpec.nonGoals,
                planPaths: mergedPlanPaths,
        });
        const manifestMetadata: TaskManifestMetadata = {
                taskId: normalizedId,
                priority: specSection.priority ?? taskSpec.priority,
                specPath: resolveSpecPath(mergedPlanPaths),
                batonPath: metadata.batonPath as string | undefined,
                taskDir: metadata.taskDir as string | undefined,
                planPaths: mergedPlanPaths,
        };
        return {
                blueprint: {
                        title,
                        description: goal,
                        requirements,
                        metadata,
                },
                metadata: manifestMetadata,
        };
}

function buildTaskMetadataForBlueprint(metadata: Record<string, unknown>, manifestMeta: TaskManifestMetadata) {
        const taskDetails = cleanMetadata({
                id: manifestMeta.taskId,
                priority: manifestMeta.priority,
                specPath: manifestMeta.specPath,
                batonPath: manifestMeta.batonPath,
                taskDir: manifestMeta.taskDir,
                planPaths: manifestMeta.planPaths,
        });
        return {
                ...metadata,
                task: taskDetails,
        };
}

export function augmentManifest(manifest: RunManifest, taskMeta: TaskManifestMetadata): RunManifest {
        const blueprintMetadata = buildTaskMetadataForBlueprint(manifest.blueprint.metadata ?? {}, taskMeta);
        const augmented: RunManifest = {
                ...manifest,
                taskId: taskMeta.taskId,
                priority: taskMeta.priority ?? manifest.priority,
                specPath: taskMeta.specPath ?? manifest.specPath,
                blueprint: {
                        ...manifest.blueprint,
                        metadata: blueprintMetadata,
                },
        };
        return RunManifestSchema.parse(augmented);
}
