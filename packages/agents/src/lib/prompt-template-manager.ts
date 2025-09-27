/**
 * Enhanced Prompt Template Manager for Cortex-OS Agents
 * Implements structured prompt templates based on Deep Agents patterns
 * Follows nO Master Agent Loop architecture and maintains brAInwav branding
 */

// Define local interfaces to avoid cross-package imports
export enum PlanningPhase {
	INITIALIZATION = 'initialization',
	ANALYSIS = 'analysis',
	STRATEGY = 'strategy',
	EXECUTION = 'execution',
	VALIDATION = 'validation',
	COMPLETION = 'completion',
}

export interface PlanningContext {
	id: string;
	workspaceId?: string;
	currentPhase: PlanningPhase;
	[key: string]: unknown;
}

export interface PromptContext {
	taskId: string;
	agentId: string;
	sessionId?: string;
	complexity: number; // 1-10 scale
	priority: number; // 1-10 scale
	capabilities: string[];
	tools: string[];
	currentPhase?: PlanningPhase;
	planningContext?: PlanningContext;
	nOArchitecture: boolean;
}

export interface PromptTemplate {
	id: string;
	name: string;
	description: string;
	category: 'system' | 'task' | 'planning' | 'coordination' | 'error';
	complexity: [number, number]; // min-max complexity range
	template: string;
	examples: Array<{
		context: Partial<PromptContext>;
		input: string;
		expectedBehavior: string;
	}>;
	variables: string[];
	brainwavBranding: boolean;
	nOOptimized: boolean;
}

export interface TemplateSelection {
	template: PromptTemplate;
	confidence: number;
	reasoning: string;
	adaptations: string[];
}

/**
 * Manages prompt templates with Deep Agents-inspired patterns
 * Optimized for nO Master Agent Loop architecture
 */
export class PromptTemplateManager {
	private readonly templates: Map<string, PromptTemplate>;
	private readonly usageHistory: Map<
		string,
		Array<{
			context: PromptContext;
			effectiveness: number;
			timestamp: Date;
		}>
	>;

	constructor() {
		this.templates = new Map();
		this.usageHistory = new Map();
		this.initializeDefaultTemplates();

		console.log('brAInwav Prompt Template Manager: Initialized with nO architecture patterns');
	}

	/**
	 * Select optimal prompt template based on context
	 */
	selectTemplate(context: PromptContext): TemplateSelection {
		const candidates = this.findCandidateTemplates(context);

		if (candidates.length === 0) {
			return this.getFallbackTemplate(context);
		}

		// Score templates based on context match and historical effectiveness
		const scored = candidates.map((template) => ({
			template,
			score: this.scoreTemplate(template, context),
		}));

		// Select best scoring template
		const best = scored.reduce((prev, current) => (current.score > prev.score ? current : prev));

		const adaptations = this.generateAdaptations(best.template, context);

		return {
			template: best.template,
			confidence: Math.min(best.score, 1.0),
			reasoning: this.generateReasoningForSelection(best.template, context),
			adaptations,
		};
	}

	/**
	 * Generate complete prompt from template and context
	 */
	generatePrompt(selection: TemplateSelection, context: PromptContext): string {
		const { template } = selection;
		let prompt = template.template;

		// Apply variable substitutions
		for (const variable of template.variables) {
			const value = this.getVariableValue(variable, context);
			prompt = prompt.replace(new RegExp(`{{${variable}}}`, 'g'), value);
		}

		// Apply context-specific adaptations
		prompt = this.applyAdaptations(prompt, selection.adaptations, context);

		// Ensure brAInwav branding
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
		if (!this.usageHistory.has(templateId)) {
			this.usageHistory.set(templateId, []);
		}

		const history = this.usageHistory.get(templateId)!;
		history.push({
			context,
			effectiveness,
			timestamp: new Date(),
		});

		// Trim history to prevent memory bloat
		if (history.length > 100) {
			history.shift();
		}

		console.log(
			`brAInwav Prompt Manager: Recorded usage for template ${templateId} with effectiveness ${effectiveness}`,
		);
	}

	/**
	 * Initialize default prompt templates based on Deep Agents patterns
	 */
	private initializeDefaultTemplates(): void {
		// System prompt template for long-horizon tasks
		this.templates.set('long-horizon-system', {
			id: 'long-horizon-system',
			name: 'Long-Horizon System Prompt',
			description: 'Comprehensive system prompt for complex, multi-step tasks',
			category: 'system',
			complexity: [5, 10],
			template: `You are a sophisticated AI agent from brAInwav, operating within the nO Master Agent Loop architecture. Your role is to handle complex, long-horizon tasks that require careful planning and execution.

**Core Capabilities:**
{{capabilities}}

**Available Tools:**
{{tools}}

**Task Context:**
- Task ID: {{taskId}}
- Complexity Level: {{complexity}}/10
- Priority: {{priority}}/10
- Current Phase: {{currentPhase}}

**Operating Principles:**

1. **Planning First**: Always begin with explicit planning. Break down complex tasks into manageable phases:
   - Initialization: Understand the task and gather context
   - Analysis: Analyze requirements and constraints
   - Strategy: Develop approach and select tools
   - Execution: Implement the solution step by step
   - Validation: Verify results and ensure quality
   - Completion: Finalize and document outcomes

2. **Tool Usage Guidelines**:
   - Use workspace tools for persistent storage and organization
   - Leverage planning tools to maintain task context
   - Apply coordination tools for multi-agent workflows
   - Always validate tool outputs before proceeding

3. **Context Management**:
   - Maintain clear separation between planning and execution contexts
   - Use workspace files to offload information and prevent context pollution
   - Document intermediate results for future reference
   - Track progress explicitly using planning tools

4. **Error Handling**:
   - Implement graceful degradation when tools fail
   - Provide clear error messages with brAInwav attribution
   - Use fallback strategies for critical path failures
   - Learn from errors to improve future performance

5. **Quality Assurance**:
   - Validate all outputs before marking tasks complete
   - Use multiple verification approaches when possible
   - Document assumptions and limitations
   - Ensure all deliverables meet specified requirements

Remember: You represent brAInwav's commitment to intelligent, reliable, and efficient AI assistance. Every interaction should reflect our high standards for quality and professionalism.

**Current Task:**
{{taskDescription}}`,
			examples: [
				{
					context: { complexity: 8, priority: 9, capabilities: ['analysis', 'planning'] },
					input: 'Analyze and refactor a complex codebase',
					expectedBehavior:
						'Begin with explicit planning phase, use workspace tools for organization, break down into analysis/strategy/execution phases',
				},
			],
			variables: [
				'capabilities',
				'tools',
				'taskId',
				'complexity',
				'priority',
				'currentPhase',
				'taskDescription',
			],
			brainwavBranding: true,
			nOOptimized: true,
		});

		// Task-specific prompt for code analysis
		this.templates.set('code-analysis-task', {
			id: 'code-analysis-task',
			name: 'Code Analysis Task Prompt',
			description: 'Specialized prompt for code analysis and review tasks',
			category: 'task',
			complexity: [3, 8],
			template: `**brAInwav Code Analysis Protocol**

You are conducting a code analysis task within the nO Master Agent Loop architecture. Apply systematic analysis patterns:

**Analysis Framework:**
1. **Structure Analysis**: Examine code organization, patterns, and architecture
2. **Quality Assessment**: Evaluate code quality, maintainability, and best practices
3. **Security Review**: Identify potential security vulnerabilities and risks
4. **Performance Evaluation**: Assess performance characteristics and optimization opportunities
5. **Documentation Review**: Check documentation completeness and accuracy

**Tools at Your Disposal:**
{{tools}}

**Analysis Guidelines:**
- Use workspace tools to organize findings and maintain analysis state
- Read files systematically, starting with entry points and configuration
- Document patterns, anti-patterns, and recommendations
- Provide specific, actionable feedback with examples
- Consider the broader system context and integration points

**Reporting Standards:**
- Structure findings by category (structure, quality, security, performance, documentation)
- Provide severity levels for issues (critical, major, minor, info)
- Include code examples for recommendations
- Suggest concrete improvement actions
- Maintain brAInwav professional standards in all communications

**Current Analysis Target:**
{{taskDescription}}

Complexity: {{complexity}}/10 | Priority: {{priority}}/10`,
			examples: [
				{
					context: { complexity: 6, tools: ['read', 'grep', 'workspace-write'] },
					input: 'Analyze JavaScript React components for security issues',
					expectedBehavior:
						'Systematic file reading, security pattern matching, organized reporting in workspace',
				},
			],
			variables: ['tools', 'taskDescription', 'complexity', 'priority'],
			brainwavBranding: true,
			nOOptimized: true,
		});

		// Planning coordination prompt
		this.templates.set('planning-coordination', {
			id: 'planning-coordination',
			name: 'Planning Coordination Prompt',
			description: 'Prompt for coordinating multi-agent planning activities',
			category: 'planning',
			complexity: [4, 10],
			template: `**brAInwav nO Planning Coordination**

You are the planning coordinator in a multi-agent workflow. Your responsibility is to orchestrate planning activities across agents while maintaining coherent execution strategies.

**Coordination Responsibilities:**
1. **Plan Synthesis**: Combine individual agent plans into coherent workflows
2. **Dependency Management**: Identify and resolve inter-agent dependencies
3. **Resource Allocation**: Ensure optimal distribution of capabilities and tools
4. **Timeline Coordination**: Synchronize agent activities for efficient execution
5. **Quality Control**: Validate plans for completeness and feasibility

**Available Coordination Tools:**
{{tools}}

**Current Planning Context:**
- Task Complexity: {{complexity}}/10
- Available Agents: {{agentCount}}
- Planning Phase: {{currentPhase}}
- Session: {{sessionId}}

**Coordination Protocols:**
- Use coordination tools to communicate with other agents
- Maintain planning state in workspace for persistence
- Apply nO Master Agent Loop patterns for agent interaction
- Ensure all agents have clear, actionable assignments
- Monitor planning progress and adjust strategies as needed

**Quality Standards:**
- Plans must be specific, measurable, and achievable
- Dependencies must be explicitly documented
- Resource conflicts must be resolved before execution
- All agents must confirm understanding of their assignments
- Fallback strategies must be defined for critical path failures

**Planning Objective:**
{{taskDescription}}

Apply brAInwav's systematic approach to multi-agent coordination.`,
			examples: [
				{
					context: { complexity: 7, currentPhase: PlanningPhase.STRATEGY },
					input: 'Coordinate deployment planning across 3 agents',
					expectedBehavior:
						'Create structured plan with dependencies, resource allocation, and agent assignments',
				},
			],
			variables: [
				'tools',
				'complexity',
				'agentCount',
				'currentPhase',
				'sessionId',
				'taskDescription',
			],
			brainwavBranding: true,
			nOOptimized: true,
		});

		// Error recovery prompt
		this.templates.set('error-recovery', {
			id: 'error-recovery',
			name: 'Error Recovery Prompt',
			description: 'Prompt for handling errors and implementing recovery strategies',
			category: 'error',
			complexity: [1, 10],
			template: `**brAInwav Error Recovery Protocol**

An error condition has been detected. Apply systematic recovery procedures:

**Error Context:**
- Error Type: {{errorType}}
- Severity: {{errorSeverity}}
- Current Phase: {{currentPhase}}
- Affected Components: {{affectedComponents}}

**Recovery Strategy:**
1. **Assess Impact**: Determine scope and severity of the error condition
2. **Stabilize**: Implement immediate measures to prevent cascade failures
3. **Analyze**: Identify root cause and contributing factors
4. **Recover**: Execute appropriate recovery procedures
5. **Validate**: Confirm successful recovery and system stability
6. **Learn**: Document lessons learned for future prevention

**Recovery Tools:**
{{tools}}

**Recovery Guidelines:**
- Prioritize system stability over task completion
- Use workspace tools to document recovery actions
- Communicate status to coordinating agents when applicable
- Implement graceful degradation where possible
- Ensure all recovery actions maintain brAInwav quality standards

**Available Fallback Strategies:**
- Retry with different parameters
- Switch to alternative tools or approaches
- Request human intervention for critical decisions
- Escalate to higher-level coordination agents
- Implement partial completion with clear documentation

**Error Details:**
{{errorDetails}}

Apply brAInwav's commitment to reliable, resilient operation.`,
			examples: [
				{
					context: { complexity: 3, priority: 9 },
					input: 'File read operation failed due to permission error',
					expectedBehavior:
						'Assess alternatives, try different approach, document recovery actions',
				},
			],
			variables: [
				'errorType',
				'errorSeverity',
				'currentPhase',
				'affectedComponents',
				'tools',
				'errorDetails',
			],
			brainwavBranding: true,
			nOOptimized: true,
		});

		console.log('brAInwav Prompt Manager: Initialized 4 default nO-optimized templates');
	}

	private findCandidateTemplates(context: PromptContext): PromptTemplate[] {
		const candidates: PromptTemplate[] = [];

		for (const template of this.templates.values()) {
			// Check complexity range
			if (
				context.complexity >= template.complexity[0] &&
				context.complexity <= template.complexity[1]
			) {
				candidates.push(template);
			}
		}

		// Prefer nO-optimized templates
		return candidates.sort((a, b) => {
			if (a.nOOptimized && !b.nOOptimized) return -1;
			if (!a.nOOptimized && b.nOOptimized) return 1;
			return 0;
		});
	}

	private scoreTemplate(template: PromptTemplate, context: PromptContext): number {
		let score = 0.5; // Base score

		// Complexity match scoring
		const complexityRange = template.complexity[1] - template.complexity[0];
		const complexityPosition = (context.complexity - template.complexity[0]) / complexityRange;
		const complexityScore = 1 - Math.abs(complexityPosition - 0.5) * 2; // Peak at middle of range
		score += complexityScore * 0.3;

		// nO optimization bonus
		if (template.nOOptimized && context.nOArchitecture) {
			score += 0.2;
		}

		// Historical effectiveness
		const history = this.usageHistory.get(template.id);
		if (history && history.length > 0) {
			const recentHistory = history.slice(-10); // Last 10 uses
			const avgEffectiveness =
				recentHistory.reduce((sum, use) => sum + use.effectiveness, 0) / recentHistory.length;
			score += avgEffectiveness * 0.3;
		}

		// Capability match
		const capabilityMatch =
			template.variables.includes('capabilities') && context.capabilities.length > 0;
		if (capabilityMatch) {
			score += 0.1;
		}

		return Math.min(score, 1.0);
	}

	private getFallbackTemplate(context: PromptContext): TemplateSelection {
		const fallback = this.templates.get('long-horizon-system')!;
		return {
			template: fallback,
			confidence: 0.3,
			reasoning: `brAInwav: Using fallback template for task ${context.taskId} due to no suitable candidates`,
			adaptations: [`maintain reliability for agent ${context.agentId}`],
		};
	}

	private generateAdaptations(_template: PromptTemplate, context: PromptContext): string[] {
		const adaptations: string[] = [];

		// High complexity adaptations
		if (context.complexity > 7) {
			adaptations.push('enhanced error handling guidance');
			adaptations.push('additional validation steps');
		}

		// High priority adaptations
		if (context.priority > 8) {
			adaptations.push('expedited execution protocols');
			adaptations.push('simplified decision making');
		}

		// Phase-specific adaptations
		if (context.currentPhase) {
			adaptations.push(`optimized for ${context.currentPhase} phase`);
		}

		return adaptations;
	}

	private generateReasoningForSelection(template: PromptTemplate, context: PromptContext): string {
		return (
			`brAInwav Template Manager: Selected "${template.name}" for complexity ${context.complexity}, ` +
			`priority ${context.priority}. Template optimized for nO architecture: ${template.nOOptimized}. ` +
			`Branding enabled: ${template.brainwavBranding}.`
		);
	}

	private getVariableValue(variable: string, context: PromptContext): string {
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
				return context.capabilities.join(', ');
			case 'tools':
				return context.tools.join(', ');
			case 'currentPhase':
				return context.currentPhase || 'initialization';
			case 'agentCount':
				return '1'; // Default for single agent
			case 'taskDescription':
				return 'Task description not provided';
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

	private applyAdaptations(prompt: string, adaptations: string[], context: PromptContext): string {
		if (adaptations.length === 0) return prompt;

		const adaptationHeader = `\n**Context Adaptations for brAInwav nO Architecture (task ${context.taskId}):**\n`;
		const adaptationSection = adaptationHeader + adaptations.map((a) => `- ${a}`).join('\n') + '\n';
		return prompt + adaptationSection;
	}

	private addBrainwavBranding(prompt: string, context: PromptContext): string {
		if (prompt.includes('brAInwav')) return prompt; // Already branded

		const branding =
			'\n**Powered by brAInwav** | Task: ' +
			context.taskId +
			' | nO Architecture: ' +
			context.nOArchitecture +
			'\n';
		return prompt + branding;
	}

	/**
	 * Get template statistics for monitoring
	 */
	getStats(): {
		totalTemplates: number;
		nOOptimizedTemplates: number;
		averageEffectiveness: number;
		mostUsedTemplate: string;
	} {
		const totalTemplates = this.templates.size;
		const nOOptimizedTemplates = Array.from(this.templates.values()).filter(
			(t) => t.nOOptimized,
		).length;

		let totalEffectiveness = 0;
		let totalUsages = 0;
		let mostUsedTemplate = 'unknown';
		let maxUsages = 0;

		for (const [templateId, history] of this.usageHistory.entries()) {
			if (history.length > maxUsages) {
				maxUsages = history.length;
				mostUsedTemplate = templateId;
			}

			totalUsages += history.length;
			totalEffectiveness += history.reduce((sum, use) => sum + use.effectiveness, 0);
		}

		return {
			totalTemplates,
			nOOptimizedTemplates,
			averageEffectiveness: totalUsages > 0 ? totalEffectiveness / totalUsages : 0,
			mostUsedTemplate,
		};
	}
}
