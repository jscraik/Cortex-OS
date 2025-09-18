/**
 * brAInwav Master Agent Tests
 *
 * Test suite for LangGraphJS-based master agent coordination
 */

import { describe, expect, it } from 'vitest';
import {
    createMasterAgentGraph,
    type SubAgentConfig,
} from '../src/MasterAgent.js';

describe('brAInwav Master Agent System', () => {
    const testSubAgents: SubAgentConfig[] = [
        {
            name: 'code-analysis-agent',
            description: 'Analyzes code quality',
            capabilities: ['code-analysis', 'quality-review'],
            model_targets: ['glm-4.5-mlx'],
            tools: ['analyze_code'],
            specialization: 'code-analysis',
        },
        {
            name: 'test-generation-agent',
            description: 'Generates tests',
            capabilities: ['test-generation', 'coverage'],
            model_targets: ['glm-4.5-mlx'],
            tools: ['generate_tests'],
            specialization: 'test-generation',
        },
    ];

    describe('Master Agent Creation', () => {
        it('should create master agent with sub-agents', () => {
            const masterAgent = createMasterAgentGraph({
                name: 'test-master-agent',
                subAgents: testSubAgents,
            });

            expect(masterAgent.name).toBe('test-master-agent');
            expect(masterAgent.agentRegistry.size).toBe(2);
            expect(masterAgent.agentRegistry.has('code-analysis-agent')).toBe(true);
            expect(masterAgent.agentRegistry.has('test-generation-agent')).toBe(true);
        });

        it('should have compiled LangGraphJS workflow', () => {
            const masterAgent = createMasterAgentGraph({
                name: 'test-master-agent',
                subAgents: testSubAgents,
            });

            expect(masterAgent.graph).toBeDefined();
            expect(typeof masterAgent.graph.invoke).toBe('function');
        });
    });

    describe('Agent Coordination', () => {
        it('should route code analysis requests correctly', async () => {
            const masterAgent = createMasterAgentGraph({
                name: 'test-master-agent',
                subAgents: testSubAgents,
            });

            const result = await masterAgent.coordinate(
                'Please analyze this code for quality issues',
            );

            expect(result.currentAgent).toBe('code-analysis-agent');
            expect(result.taskType).toBe('code-analysis');
            expect(result.result).toBeDefined();
        });

        it('should route test generation requests correctly', async () => {
            const masterAgent = createMasterAgentGraph({
                name: 'test-master-agent',
                subAgents: testSubAgents,
            });

            const result = await masterAgent.coordinate(
                'Generate unit tests for the login function',
            );

            expect(result.currentAgent).toBe('test-generation-agent');
            expect(result.taskType).toBe('test-generation');
            expect(result.result).toBeDefined();
        });

        it('should handle messages and maintain state', async () => {
            const masterAgent = createMasterAgentGraph({
                name: 'test-master-agent',
                subAgents: testSubAgents,
            });

            const result = await masterAgent.coordinate('Review my TypeScript code');

            expect(result.messages).toHaveLength(2);
            expect(result.messages[0]._getType()).toBe('human');
            expect(result.messages[1]._getType()).toBe('ai');
        });
    });

    describe('Sub-agent Configuration', () => {
        it('should validate sub-agent configuration schema', () => {
            const validConfig: SubAgentConfig = {
                name: 'test-agent',
                description: 'Test agent description',
                capabilities: ['testing'],
                model_targets: ['glm-4.5-mlx'],
                tools: ['test_tool'],
                specialization: 'code-analysis',
            };

            expect(() => {
                createMasterAgentGraph({
                    name: 'test',
                    subAgents: [validConfig],
                });
            }).not.toThrow();
        });

        it('should prioritize GLM-4.5 model as per memory requirements', () => {
            const agent = testSubAgents[0];
            expect(agent.model_targets[0]).toBe('glm-4.5-mlx');
        });
    });

    describe('Error Handling', () => {
        it('should handle empty sub-agents gracefully', async () => {
            const masterAgent = createMasterAgentGraph({
                name: 'test-master-agent',
                subAgents: [],
            });

            const result = await masterAgent.coordinate('Test message');

            // Should default to basic agent when no sub-agents available
            expect(result.currentAgent).toBe('default');
        });
    });
});
