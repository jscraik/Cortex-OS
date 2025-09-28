import {
        PlanningPhase,
        type PlanningContext,
        type PromptContext,
        type PromptTemplate,
        type TemplateSelection,
        type TemplateFilter,
        type TemplateUsageRecord,
        type TemplatePerformanceSnapshot,
} from '../prompts';
import { PROMPT_TEMPLATE_CATALOG } from '../prompts';

export interface PromptTemplateManagerOptions {
        templates?: PromptTemplate[];
        historyLimit?: number;
}

const ISOLATION_ORDER: Record<string, number> = { none: 0, light: 1, strict: 2 };

/**
 * Manages prompt templates with Deep Agents-inspired patterns
 * Optimized for nO Master Agent Loop architecture
 */
export class PromptTemplateManager {
        private readonly templates = new Map<string, PromptTemplate>();
        private readonly usageHistory = new Map<string, TemplateUsageRecord[]>();
        private readonly historyLimit: number;

        constructor(options?: PromptTemplateManagerOptions) {
                this.historyLimit = options?.historyLimit ?? 200;
                this.initializeDefaultTemplates(options?.templates ?? []);
                console.log('brAInwav Prompt Template Manager: Initialized with structured template library');
        }

        registerTemplate(template: PromptTemplate): void {
                this.templates.set(template.id, template);
        }

        registerTemplates(templates: PromptTemplate[]): void {
                for (const template of templates) {
                        this.registerTemplate(template);
                }
        }

        listTemplates(filter: TemplateFilter = {}): PromptTemplate[] {
                const templates = Array.from(this.templates.values()).filter((template) =>
                        this.matchesFilter(template, filter),
                );
                return templates.sort((a, b) => a.name.localeCompare(b.name));
        }

        getTemplateById(id: string): PromptTemplate | undefined {
                return this.templates.get(id);
        }

        /**
         * Select optimal prompt template based on context
         */
        selectTemplate(context: PromptContext): TemplateSelection {
                const candidates = this.findCandidateTemplates(context);
                if (candidates.length === 0) {
                        return this.getFallbackTemplate(context);
                }

                const scored = candidates
                        .map((template) => ({ template, score: this.scoreTemplate(template, context) }))
                        .sort((a, b) => b.score - a.score);

                const best = scored[0];
                const adaptations = this.generateAdaptations(best.template, context);

                return {
                        template: best.template,
                        confidence: Math.min(Math.max(best.score, 0.1), 1),
                        reasoning: this.generateReasoningForSelection(best.template, context, best.score),
                        adaptations,
                };
        }

        /**
         * Generate complete prompt from template and context
         */
        generatePrompt(selection: TemplateSelection, context: PromptContext): string {
                const { template } = selection;
                let prompt = template.template;

                for (const variable of template.variables) {
                        const value = this.getVariableValue(variable, context);
                        prompt = prompt.replace(new RegExp(`{{${variable}}}`, 'g'), value);
                }

                prompt = this.applyAdaptations(prompt, selection.adaptations, context);

                if (template.brainwavBranding) {
                        prompt = this.addBrainwavBranding(prompt, context);
                }

                console.log(`brAInwav Prompt Manager: Generated nO-optimized prompt for ${context.taskId}`);
                return prompt;
        }

        /**
         * Record template usage for learning
         */
        recordUsage(templateId: string, context: PromptContext, effectiveness: number): void {
                const record: TemplateUsageRecord = {
                        context: this.cloneContext(context),
                        effectiveness: this.clampEffectiveness(effectiveness),
                        timestamp: new Date(),
                };

                if (!this.usageHistory.has(templateId)) {
                        this.usageHistory.set(templateId, []);
                }

                const history = this.usageHistory.get(templateId)!;
                history.push(record);

                if (history.length > this.historyLimit) {
                        history.splice(0, history.length - this.historyLimit);
                }

                console.log(
                        `brAInwav Prompt Manager: Recorded usage for template ${templateId} with effectiveness ${record.effectiveness}`,
                );
        }

        getPerformanceSnapshot(): TemplatePerformanceSnapshot[] {
                return Array.from(this.templates.values())
                        .map((template) => this.summarizePerformance(template))
                        .sort((a, b) => b.totalUses - a.totalUses || a.name.localeCompare(b.name));
        }

        getStats(): {
                totalTemplates: number;
                nOOptimizedTemplates: number;
                averageEffectiveness: number;
                mostUsedTemplate: string;
        } {
                const snapshot = this.getPerformanceSnapshot();
                const totalTemplates = this.templates.size;
                const nOOptimizedTemplates = snapshot.filter((entry) => {
                        const template = this.templates.get(entry.templateId);
                        return template?.nOOptimized ?? false;
                }).length;
                const totalUses = snapshot.reduce((sum, entry) => sum + entry.totalUses, 0);
                const totalEffectiveness = snapshot.reduce(
                        (sum, entry) => sum + entry.averageEffectiveness * entry.totalUses,
                        0,
                );
                const mostUsed = snapshot.reduce<{ id: string; uses: number }>(
                        (acc, entry) => (entry.totalUses > acc.uses ? { id: entry.templateId, uses: entry.totalUses } : acc),
                        { id: 'unknown', uses: -1 },
                );

                return {
                        totalTemplates,
                        nOOptimizedTemplates,
                        averageEffectiveness: totalUses > 0 ? totalEffectiveness / totalUses : 0,
                        mostUsedTemplate: mostUsed.id,
                };
        }

        private initializeDefaultTemplates(additionalTemplates: PromptTemplate[]): void {
                const combined = [...PROMPT_TEMPLATE_CATALOG, ...additionalTemplates];
                this.registerTemplates(combined);
                console.log(
                        `brAInwav Prompt Manager: Initialized ${combined.length} catalog templates; active total ${this.templates.size}`,
                );
        }

        private matchesFilter(template: PromptTemplate, filter: TemplateFilter): boolean {
                if (filter.category && template.category !== filter.category) {
                        return false;
                }
                if (filter.supportsMultiAgent && !template.supportsMultiAgent) {
                        return false;
                }
                if (filter.phase) {
                        if (!template.phases?.includes(filter.phase)) {
                                return false;
                        }
                }
                if (filter.tags?.length) {
                        if (!template.tags) {
                                return false;
                        }
                        const hasAllTags = filter.tags.every((tag) => template.tags!.includes(tag));
                        if (!hasAllTags) {
                                return false;
                        }
                }
                return true;
        }

        private findCandidateTemplates(context: PromptContext): PromptTemplate[] {
                return Array.from(this.templates.values())
                        .filter((template) => this.isComplexityCompatible(template, context))
                        .filter((template) => this.isIsolationCompatible(template, context));
        }

        private isComplexityCompatible(template: PromptTemplate, context: PromptContext): boolean {
                const [min, max] = template.complexity;
                const tolerance = 1;
                return context.complexity >= min - tolerance && context.complexity <= max + tolerance;
        }

        private isIsolationCompatible(template: PromptTemplate, context: PromptContext): boolean {
                if (!context.contextIsolation || !template.contextIsolation) {
                        return true;
                }
                return this.getIsolationLevel(template.contextIsolation) >= this.getIsolationLevel(context.contextIsolation);
        }

        private scoreTemplate(template: PromptTemplate, context: PromptContext): number {
                let score = 0.35;
                score += this.scoreComplexityMatch(template, context);
                score += this.scorePhaseAlignment(template, context);
                score += this.scoreMultiAgentCompatibility(template, context);
                score += this.scoreTagAlignment(template, context);
                score += this.scoreIsolationAlignment(template, context);
                score += this.scoreComplianceAwareness(template, context);
                score += this.scorePriorityAlignment(template, context);
                score += this.scoreHistoricalEffectiveness(template.id, context);
                if (template.nOOptimized && context.nOArchitecture) {
                        score += 0.1;
                }
                return Math.max(0.1, Math.min(score, 1));
        }

        private scoreComplexityMatch(template: PromptTemplate, context: PromptContext): number {
                const [min, max] = template.complexity;
                if (context.complexity < min - 1 || context.complexity > max + 1) {
                        return -0.2;
                }
                if (max === min) {
                        return context.complexity === min ? 0.25 : -0.1;
                }
                const normalized = (context.complexity - min) / (max - min);
                const distance = Math.abs(normalized - 0.5);
                return 0.25 - distance * 0.25;
        }

        private scorePhaseAlignment(template: PromptTemplate, context: PromptContext): number {
                if (!context.currentPhase) {
                        return 0.05;
                }
                if (!template.phases?.length) {
                        return 0.02;
                }
                return template.phases.includes(context.currentPhase) ? 0.15 : -0.03;
        }

        private scoreMultiAgentCompatibility(template: PromptTemplate, context: PromptContext): number {
                const agentCount = context.agentCount ?? 1;
                if (agentCount <= 1) {
                        return template.supportsMultiAgent ? 0.02 : 0.03;
                }
                return template.supportsMultiAgent ? 0.1 : -0.05;
        }

        private scoreTagAlignment(template: PromptTemplate, context: PromptContext): number {
                if (!context.contextTags?.length || !template.tags?.length) {
                        return 0;
                }
                const overlap = context.contextTags.filter((tag) => template.tags!.includes(tag)).length;
                if (overlap === 0) {
                        return -0.05;
                }
                return Math.min(overlap / template.tags.length, 1) * 0.15;
        }

        private scoreIsolationAlignment(template: PromptTemplate, context: PromptContext): number {
                if (!context.contextIsolation || !template.contextIsolation) {
                        return 0.05;
                }
                const templateLevel = this.getIsolationLevel(template.contextIsolation);
                const contextLevel = this.getIsolationLevel(context.contextIsolation);
                return templateLevel >= contextLevel ? 0.1 : -0.05;
        }

        private scoreComplianceAwareness(template: PromptTemplate, context: PromptContext): number {
                const risk = this.getComplianceRiskScore(context);
                if (risk < 0.4) {
                        return 0;
                }
                if (template.tags?.includes('compliance') || template.category === 'reflection') {
                        return risk >= 0.7 ? 0.12 : 0.08;
                }
                return template.category === 'system' || template.category === 'error' ? 0.04 : -0.05;
        }

        private scorePriorityAlignment(template: PromptTemplate, context: PromptContext): number {
                if (context.priority >= 8) {
                        if (template.tags?.includes('rapid') || template.category === 'task') {
                                return 0.08;
                        }
                        return -0.02;
                }
                if (context.priority <= 3 && template.category === 'system') {
                        return 0.03;
                }
                return 0;
        }

        private scoreHistoricalEffectiveness(templateId: string, context: PromptContext): number {
                const history = this.usageHistory.get(templateId);
                if (!history?.length) {
                        return 0;
                }
                const relevant = history.filter((record) => this.isContextSimilar(record.context, context));
                const sample = relevant.length > 0 ? relevant : history.slice(-10);
                const total = sample.reduce((sum, record) => sum + record.effectiveness, 0);
                return (total / sample.length) * 0.3;
        }

        private isContextSimilar(a: PromptContext, b: PromptContext): boolean {
                const samePhase = !a.currentPhase || !b.currentPhase || a.currentPhase === b.currentPhase;
                const sameAgents = (a.agentCount ?? 1) === (b.agentCount ?? 1);
                const tagsOverlap =
                        !a.contextTags?.length || !b.contextTags?.length
                                ? true
                                : a.contextTags.some((tag) => b.contextTags?.includes(tag));
                return samePhase && sameAgents && tagsOverlap;
        }

        private getFallbackTemplate(context: PromptContext): TemplateSelection {
                const fallback = this.templates.get('long-horizon-system');
                if (!fallback) {
                        throw new Error('brAInwav Prompt Manager: Long-horizon system template missing');
                }
                return {
                        template: fallback,
                        confidence: 0.3,
                        reasoning: `brAInwav: Using fallback template for task ${context.taskId} due to no suitable candidates`,
                        adaptations: [`maintain reliability for agent ${context.agentId}`],
                };
        }

        private generateAdaptations(template: PromptTemplate, context: PromptContext): string[] {
                const adaptations: string[] = [];
                if (context.complexity > 7) {
                        adaptations.push('enhanced error handling guidance');
                        adaptations.push('additional validation steps');
                }
                if (context.priority > 8) {
                        adaptations.push('expedited execution protocols');
                        adaptations.push('document checkpoints succinctly');
                }
                if (context.currentPhase) {
                        adaptations.push(`optimized for ${context.currentPhase} phase`);
                }
                const agentCount = context.agentCount ?? 1;
                if (agentCount > 1) {
                        const message = template.supportsMultiAgent
                                ? `multi-agent orchestration for ${agentCount} agents`
                                : `coordinate ${agentCount} agents despite single-agent template; document delegation explicitly`;
                        adaptations.push(message);
                }
                if (context.contextIsolation === 'strict') {
                        adaptations.push('maintain strict context isolation boundaries');
                }
                const risk = this.getComplianceRiskScore(context);
                if (risk >= 0.4) {
                        const presentation = this.buildCompliancePresentation(context);
                        const label = risk >= 0.7 ? 'high' : 'elevated';
                        adaptations.push(`compliance risk ${label}; ${presentation.guidance}`);
                }
                return adaptations;
        }

        private generateReasoningForSelection(
                template: PromptTemplate,
                context: PromptContext,
                score: number,
        ): string {
                const metadata: string[] = [`category ${template.category}`];
                if (template.phases?.length) {
                        metadata.push(`phases ${template.phases.join(', ')}`);
                }
                if (template.supportsMultiAgent) {
                        metadata.push('multi-agent ready');
                }
                if (template.tags?.length) {
                        metadata.push(`tags ${template.tags.join(', ')}`);
                }
                const compliance = (this.getComplianceRiskScore(context) * 100).toFixed(0);
                return (
                        `brAInwav Template Manager: Selected "${template.name}" (score ${score.toFixed(2)}) ` +
                        `for task ${context.taskId}. Metadata: ${metadata.join(' | ')}. ` +
                        `Compliance risk considered at ${compliance} percentile.`
                );
        }

        private getVariableValue(variable: string, context: PromptContext): string {
                const complianceValue = this.resolveComplianceVariable(variable, context);
                if (complianceValue !== null) {
                        return complianceValue;
                }
                switch (variable) {
                        case 'taskId':
                                return context.taskId;
                        case 'agentId':
                                return context.agentId;
                        case 'sessionId':
                                return context.sessionId || 'unknown';
                        case 'complexity':
                                return context.complexity.toString();
                        case 'priority':
                                return context.priority.toString();
                        case 'capabilities':
                                return this.formatList(context.capabilities, 'capabilities');
                        case 'tools':
                                return this.formatList(context.tools, 'tools');
                        case 'currentPhase':
                                return context.currentPhase ?? 'initialization';
                        case 'agentCount':
                                return (context.agentCount ?? 1).toString();
                        case 'taskDescription':
                                return context.taskDescription ?? 'Task description not provided';
                        case 'contextIsolation':
                                return context.contextIsolation ?? 'unspecified';
                        case 'errorType':
                                return 'unknown_error';
                        case 'errorSeverity':
                                return 'moderate';
                        case 'affectedComponents':
                                return 'unknown';
                        case 'errorDetails':
                                return 'Error details not available';
                        default:
                                return `{{${variable}}}`;
                }
        }

        private resolveComplianceVariable(variable: string, context: PromptContext): string | null {
                if (!variable.startsWith('compliance')) {
                        return null;
                }
                const presentation = this.buildCompliancePresentation(context);
                switch (variable) {
                        case 'complianceStandards':
                                return presentation.standards;
                        case 'complianceRisk':
                                return presentation.risk;
                        case 'complianceViolations':
                                return presentation.violations;
                        case 'complianceGuidance':
                                return presentation.guidance;
                        default:
                                return null;
                }
        }

        private buildCompliancePresentation(context: PromptContext): {
                standards: string;
                risk: string;
                violations: string;
                guidance: string;
        } {
                const source = this.getComplianceSource(context);
                if (!source) {
                        return {
                                standards: 'brAInwav baseline (auto)',
                                risk: 'Nominal (0.00)',
                                violations: 'No active violations logged',
                                guidance: this.deriveComplianceGuidance(0, 0),
                        };
                }
                const standards = source.standards?.length
                        ? source.standards.join(', ')
                        : 'brAInwav baseline (auto)';
                const boundedScore = this.getComplianceRiskScore(context);
                const riskLabel = boundedScore >= 0.7 ? 'High' : boundedScore >= 0.4 ? 'Elevated' : 'Nominal';
                const violationsList = (source.outstandingViolations ?? [])
                        .slice(0, 3)
                        .map((violation) => {
                                const severity = violation.severity ?? 'info';
                                const description = violation.description ?? 'review pending';
                                return `${severity.toUpperCase()}: ${description}`;
                        })
                        .join('; ');
                return {
                        standards,
                        risk: `${riskLabel} (${boundedScore.toFixed(2)})`,
                        violations: violationsList || 'No active violations logged',
                        guidance: this.deriveComplianceGuidance(
                                boundedScore,
                                source.outstandingViolations?.length ?? 0,
                        ),
                };
        }

        private deriveComplianceGuidance(score: number, violationCount: number): string {
                if (score >= 0.7 || violationCount > 0) {
                        return 'Run security.run_semgrep_scan and security.validate_compliance immediately; document outcomes in the brAInwav compliance tracker.';
                }
                if (score >= 0.4) {
                        return 'Queue security.analyze_vulnerabilities and security.check_dependencies, then review remediation owners.';
                }
                return 'Maintain the routine brAInwav security.check_dependencies cadence and archive reports for audit readiness.';
        }

        private applyAdaptations(prompt: string, adaptations: string[], context: PromptContext): string {
                if (adaptations.length === 0) {
                        return prompt;
                }
                const adaptationHeader = `\n**Context Adaptations for brAInwav nO Architecture (task ${context.taskId}):**\n`;
                const adaptationSection = adaptationHeader + adaptations.map((a) => `- ${a}`).join('\n') + '\n';
                return prompt + adaptationSection;
        }

        private addBrainwavBranding(prompt: string, context: PromptContext): string {
                if (prompt.includes('brAInwav')) {
                        return prompt;
                }
                const branding =
                        '\n**Powered by brAInwav** | Task: ' +
                        context.taskId +
                        ' | nO Architecture: ' +
                        context.nOArchitecture +
                        '\n';
                return prompt + branding;
        }

        private summarizePerformance(template: PromptTemplate): TemplatePerformanceSnapshot {
                const history = this.usageHistory.get(template.id) ?? [];
                const totalUses = history.length;
                const totalEffectiveness = history.reduce((sum, record) => sum + record.effectiveness, 0);
                return {
                        templateId: template.id,
                        name: template.name,
                        category: template.category,
                        totalUses,
                        averageEffectiveness: totalUses > 0 ? totalEffectiveness / totalUses : 0,
                        lastUsedAt: totalUses > 0 ? history[totalUses - 1].timestamp : null,
                        phasePerformance: this.aggregatePhasePerformance(history),
                        multiAgentUsageRate: this.calculateMultiAgentUsageRate(history),
                        supportsMultiAgent: Boolean(template.supportsMultiAgent),
                };
        }

        private aggregatePhasePerformance(
                history: TemplateUsageRecord[],
        ): TemplatePerformanceSnapshot['phasePerformance'] {
                const summary: TemplatePerformanceSnapshot['phasePerformance'] = {};
                for (const record of history) {
                        if (!record.context.currentPhase) {
                                continue;
                        }
                        const existing = summary[record.context.currentPhase] ?? { total: 0, averageEffectiveness: 0 };
                        const total = existing.total + 1;
                        const cumulative = existing.averageEffectiveness * existing.total + record.effectiveness;
                        summary[record.context.currentPhase] = {
                                total,
                                averageEffectiveness: cumulative / total,
                        };
                }
                return summary;
        }

        private calculateMultiAgentUsageRate(history: TemplateUsageRecord[]): number {
                if (history.length === 0) {
                        return 0;
                }
                const multiAgentUses = history.filter((record) => (record.context.agentCount ?? 1) > 1).length;
                return multiAgentUses / history.length;
        }

        private clampEffectiveness(effectiveness: number): number {
                if (Number.isNaN(effectiveness)) {
                        return 0;
                }
                return Math.min(Math.max(effectiveness, 0), 1);
        }

        private cloneContext(context: PromptContext): PromptContext {
                return {
                        ...context,
                        capabilities: [...context.capabilities],
                        tools: [...context.tools],
                        contextTags: context.contextTags ? [...context.contextTags] : undefined,
                        planningContext: context.planningContext
                                ? { ...context.planningContext, compliance: this.cloneCompliance(context.planningContext.compliance) }
                                : undefined,
                        compliance: this.cloneCompliance(context.compliance),
                };
        }

        private cloneCompliance(
                compliance?: PlanningContext['compliance'],
        ): PlanningContext['compliance'] | undefined {
                if (!compliance) {
                        return undefined;
                }
                return {
                        standards: compliance.standards ? [...compliance.standards] : undefined,
                        lastCheckedAt: compliance.lastCheckedAt ?? undefined,
                        riskScore: compliance.riskScore,
                        outstandingViolations: compliance.outstandingViolations
                                ? compliance.outstandingViolations.map((violation) => ({ ...violation }))
                                : undefined,
                };
        }

        private formatList(values: string[], label: string): string {
                if (values.length === 0) {
                        return `No ${label} configured`;
                }
                return values.map((value) => `- ${value}`).join('\n');
        }

        private getIsolationLevel(level: string): number {
                return ISOLATION_ORDER[level] ?? 0;
        }

        private getComplianceSource(context: PromptContext): PlanningContext['compliance'] | null {
                return context.compliance ?? context.planningContext?.compliance ?? null;
        }

        private getComplianceRiskScore(context: PromptContext): number {
                const source = this.getComplianceSource(context);
                if (!source || typeof source.riskScore !== 'number') {
                        return 0;
                }
                return Math.min(Math.max(source.riskScore, 0), 1);
        }
}

export { PlanningPhase };
