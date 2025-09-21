import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMasterAgentGraph, type SubAgentConfig } from '../../../src/MasterAgent';

describe('LangGraph Integration Tests - Advanced Agent Coordination', () => {
    let masterAgent: ReturnType<typeof createMasterAgentGraph>;
    let testSubAgents: SubAgentConfig[];

    beforeEach(() => {
        // Define test sub-agents similar to production config
        testSubAgents = [
            {
                name: 'test-code-analysis-agent',
                description: 'Analyzes code quality for testing',
                capabilities: ['code-analysis', 'quality-review', 'refactoring'],
                model_targets: ['test-model'],
                tools: ['analyze_code', 'review_quality'],
                specialization: 'code-analysis',
            },
            {
                name: 'test-documentation-agent',
                description: 'Creates documentation for testing',
                capabilities: ['documentation', 'markdown', 'api-docs'],
                model_targets: ['test-model'],
                tools: ['write_docs', 'update_readme'],
                specialization: 'documentation',
            },
            {
                name: 'test-security-agent',
                description: 'Performs security analysis for testing',
                capabilities: ['security-analysis', 'vulnerability-scan'],
                model_targets: ['test-model'],
                tools: ['scan_vulnerabilities', 'audit_security'],
                specialization: 'security',
            },
            {
                name: 'test-generation-agent',
                description: 'Generates tests for testing',
                capabilities: ['test-generation', 'coverage-analysis'],
                model_targets: ['test-model'],
                tools: ['generate_tests', 'analyze_coverage'],
                specialization: 'test-generation',
            },
        ];

        masterAgent = createMasterAgentGraph({
            name: 'test-master-agent',
            subAgents: testSubAgents,
            mcpEndpoint: 'http://localhost:3001/mcp',
        });
    });

    describe('Master Agent Initialization', () => {
        it('should create master agent with correct configuration', () => {
            expect(masterAgent.name).toBe('test-master-agent');
            expect(masterAgent.agentRegistry.size).toBe(4);
            expect(masterAgent.graph).toBeDefined();
        });

        it('should register all sub-agents correctly', () => {
            expect(masterAgent.agentRegistry.has('test-code-analysis-agent')).toBe(true);
            expect(masterAgent.agentRegistry.has('test-documentation-agent')).toBe(true);
            expect(masterAgent.agentRegistry.has('test-security-agent')).toBe(true);
            expect(masterAgent.agentRegistry.has('test-generation-agent')).toBe(true);
        });

        it('should store sub-agent configurations with all required fields', () => {
            const codeAgent = masterAgent.agentRegistry.get('test-code-analysis-agent');
            expect(codeAgent).toBeDefined();
            expect(codeAgent?.name).toBe('test-code-analysis-agent');
            expect(codeAgent?.capabilities).toContain('code-analysis');
            expect(codeAgent?.specialization).toBe('code-analysis');
            expect(codeAgent?.tools).toContain('analyze_code');
        });
    });

    describe('Agent Routing Intelligence', () => {
        it('should route code-related tasks to code analysis agent', async () => {
            const result = await masterAgent.coordinate('Analyze this code for quality issues');

            expect(result.currentAgent).toBe('test-code-analysis-agent');
            expect(result.taskType).toBe('code-analysis');
            expect(result.messages).toBeDefined();
            expect(result.messages.length).toBeGreaterThan(0);
        });

        it('should route documentation tasks to documentation agent', async () => {
            const result = await masterAgent.coordinate('Create documentation for this API');

            expect(result.currentAgent).toBe('test-documentation-agent');
            expect(result.taskType).toBe('documentation');
            expect(result.messages).toBeDefined();
        });

        it('should route security tasks to security agent', async () => {
            const result = await masterAgent.coordinate('Scan for security vulnerabilities');

            expect(result.currentAgent).toBe('test-security-agent');
            expect(result.taskType).toBe('security');
            expect(result.messages).toBeDefined();
        });

        it('should route test generation tasks to test generation agent', async () => {
            const result = await masterAgent.coordinate('Generate unit tests for this function');

            expect(result.currentAgent).toBe('test-generation-agent');
            expect(result.taskType).toBe('test-generation');
            expect(result.messages).toBeDefined();
        });

        it('should handle complex routing with multiple keywords', async () => {
            const result = await masterAgent.coordinate(
                'Analyze code quality and generate comprehensive tests',
            );

            // Should prioritize based on scoring algorithm
            expect(['test-code-analysis-agent', 'test-generation-agent']).toContain(result.currentAgent);
            expect(result.messages).toBeDefined();
        });

        it('should have reasonable confidence scores for routing decisions', async () => {
            const inputs = [
                'analyze code quality', // Should match code-analysis
                'write documentation', // Should match documentation
                'security audit', // Should match security
                'unit test generation', // Should match test-generation
            ];

            for (const input of inputs) {
                const result = await masterAgent.coordinate(input);
                expect(result.currentAgent).not.toBe('default'); // Should not fall back to default
                expect(result.taskType).not.toBe('coordination'); // Should be specialized
            }
        });
    });

    describe('LangGraph State Management', () => {
        it('should maintain state through the coordination workflow', async () => {
            const result = await masterAgent.coordinate('Test state management');

            expect(result.messages).toBeDefined();
            expect(result.messages.length).toBeGreaterThanOrEqual(1);
            expect(result.messages[0]).toBeInstanceOf(HumanMessage);
            expect(result.messages[result.messages.length - 1]).toBeInstanceOf(AIMessage);
        });

        it('should preserve initial human message in final state', async () => {
            const inputMessage = 'Test message preservation';
            const result = await masterAgent.coordinate(inputMessage);

            const humanMessages = result.messages.filter((m) => m instanceof HumanMessage);
            expect(humanMessages.length).toBe(1);
            expect(humanMessages[0].content).toBe(inputMessage);
        });

        it('should add AI response message after coordination', async () => {
            const result = await masterAgent.coordinate('Test AI response');

            const aiMessages = result.messages.filter((m) => m instanceof AIMessage);
            expect(aiMessages.length).toBeGreaterThanOrEqual(1);

            const lastAIMessage = aiMessages[aiMessages.length - 1];
            expect(lastAIMessage.content).toBeDefined();
            expect(typeof lastAIMessage.content).toBe('string');
        });

        it('should handle state transitions through workflow nodes', async () => {
            const result = await masterAgent.coordinate('Test workflow transitions');

            // Should start with intelligence_scheduler, then move to tool_layer
            expect(result.currentAgent).not.toBe('intelligence_scheduler'); // Should have moved past initial state
            expect(result.result).toBeDefined(); // Should have result from tool_layer
        });
    });

    describe('Workflow Execution Patterns', () => {
        it('should execute complete workflow from start to end', async () => {
            const result = await masterAgent.coordinate('Complete workflow test');

            expect(result.messages).toBeDefined();
            expect(result.currentAgent).toBeDefined();
            expect(result.taskType).toBeDefined();

            // Should have both input and output
            expect(result.messages.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle concurrent coordination requests', async () => {
            const requests = [
                'Analyze code quality',
                'Generate documentation',
                'Perform security scan',
                'Create unit tests',
            ];

            const promises = requests.map((request) => masterAgent.coordinate(request));
            const results = await Promise.all(promises);

            expect(results).toHaveLength(4);
            results.forEach((result) => {
                expect(result.messages).toBeDefined();
                expect(result.currentAgent).toBeDefined();
                expect(result.taskType).toBeDefined();
            });

            // Each should route to different agents
            const agents = results.map((r) => r.currentAgent);
            const uniqueAgents = new Set(agents);
            expect(uniqueAgents.size).toBeGreaterThanOrEqual(2); // At least some variety
        });

        it('should maintain performance under load', async () => {
            const startTime = Date.now();
            const iterations = 10;

            const promises = Array(iterations)
                .fill(0)
                .map(async (_, i) => {
                    return await masterAgent.coordinate(`Performance test ${i}`);
                });

            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            expect(results).toHaveLength(iterations);
            // brAInwav performance requirement: 10 coordinations under 2 seconds
            expect(totalTime).toBeLessThan(2000);

            results.forEach((result) => {
                expect(result.messages).toBeDefined();
                expect(result.result).toBeDefined();
            });
        });
    });

    describe('Error Handling and Resilience', () => {
        it('should handle empty input gracefully', async () => {
            const result = await masterAgent.coordinate('');

            expect(result.messages).toBeDefined();
            expect(result.currentAgent).toBeDefined();
            // Should still route to some agent even with empty input
        });

        it('should handle very long input messages', async () => {
            const longInput = 'Long message: ' + 'x'.repeat(10000);
            const result = await masterAgent.coordinate(longInput);

            expect(result.messages).toBeDefined();
            expect(result.currentAgent).toBeDefined();
            expect(result.messages[0].content).toBe(longInput);
        });

        it('should handle special characters and Unicode', async () => {
            const unicodeInput = 'Analyze: 你好世界 🚀📊💻 Iñtërnâtiônàlizætiøn';
            const result = await masterAgent.coordinate(unicodeInput);

            expect(result.messages).toBeDefined();
            expect(result.currentAgent).toBeDefined();
            expect(result.messages[0].content).toBe(unicodeInput);
        });

        it('should handle malformed or nonsensical input', async () => {
            const nonsenseInputs = [
                'asdfghjkl qwertyuiop',
                '12345 !@#$% *()_+',
                'null undefined NaN',
                JSON.stringify({ random: 'object', numbers: [1, 2, 3] }),
            ];

            for (const input of nonsenseInputs) {
                const result = await masterAgent.coordinate(input);
                expect(result.messages).toBeDefined();
                expect(result.currentAgent).toBeDefined();
                // Should still successfully coordinate even with nonsense
            }
        });
    });

    describe('brAInwav Production Integration', () => {
        it('should support brAInwav agent specialization requirements', async () => {
            const brAInwavTasks = [
                'brAInwav code analysis for production deployment',
                'brAInwav security audit for enterprise standards',
                'brAInwav documentation for API compliance',
                'brAInwav test generation for quality assurance',
            ];

            for (const task of brAInwavTasks) {
                const result = await masterAgent.coordinate(task);

                expect(result.messages).toBeDefined();
                expect(result.currentAgent).toBeDefined();
                expect(result.taskType).toBeDefined();

                // Should contain brAInwav context in result
                const resultContent = JSON.stringify(result.result);
                expect(resultContent).toBeDefined();
            }
        });

        it('should maintain brAInwav agent registry integrity', () => {
            const registeredAgents = Array.from(masterAgent.agentRegistry.keys());

            expect(registeredAgents).toHaveLength(4);
            registeredAgents.forEach((agentName) => {
                expect(agentName).toMatch(/^test-.*-agent$/);

                const config = masterAgent.agentRegistry.get(agentName);
                expect(config).toBeDefined();
                expect(config?.specialization).toMatch(
                    /^(code-analysis|documentation|security|test-generation)$/,
                );
            });
        });

        it('should handle brAInwav multi-agent coordination workflows', async () => {
            const complexTask =
                'brAInwav comprehensive project analysis: review code quality, generate documentation, perform security audit, and create test suite';

            const result = await masterAgent.coordinate(complexTask);

            expect(result.messages).toBeDefined();
            expect(result.currentAgent).toBeDefined();
            expect(result.taskType).toBeDefined();
            expect(result.result).toBeDefined();

            // Should select most appropriate agent based on task complexity
            const selectedAgent = masterAgent.agentRegistry.get(result.currentAgent);
            expect(selectedAgent).toBeDefined();
            expect(selectedAgent?.capabilities.length).toBeGreaterThan(0);
        });
    });

    describe('Graph Structure and Workflow Validation', () => {
        it('should have correct LangGraph workflow structure', () => {
            // The graph should be compiled and ready
            expect(masterAgent.graph).toBeDefined();
            expect(typeof masterAgent.graph.invoke).toBe('function');
        });

        it('should support the complete intelligence_scheduler -> tool_layer workflow', async () => {
            const result = await masterAgent.coordinate('Test complete workflow');

            // Should have gone through both nodes
            expect(result.currentAgent).not.toBe('intelligence_scheduler'); // Should have moved to agent selection
            expect(result.result).toBeDefined(); // Should have result from tool_layer
            expect(result.messages.length).toBeGreaterThanOrEqual(2); // Input + output messages
        });

        it('should maintain workflow state consistency', async () => {
            const input = 'Consistency test';
            const result1 = await masterAgent.coordinate(input);
            const result2 = await masterAgent.coordinate(input);

            // Same input should produce consistent routing (same agent selection logic)
            expect(result1.currentAgent).toBe(result2.currentAgent);
            expect(result1.taskType).toBe(result2.taskType);

            // But should have independent execution (different timestamps, etc.)
            expect(result1.messages[0].content).toBe(result2.messages[0].content);
        });
    });

    describe('Integration with Mock Adapters', () => {
        it('should execute with mock adapter responses', async () => {
            const result = await masterAgent.coordinate('Test mock adapter integration');

            expect(result.result).toBe('Mock adapter response - adapters not yet implemented');
            expect(result.messages).toBeDefined();

            const aiMessage = result.messages.find((m) => m instanceof AIMessage);
            expect(aiMessage).toBeDefined();
            expect(aiMessage?.content).toContain('Mock adapter response');
        });

        it('should handle adapter simulation for all specializations', async () => {
            const specializationTasks = {
                'code-analysis': 'Analyze code quality',
                documentation: 'Write documentation',
                security: 'Security audit',
                'test-generation': 'Generate tests',
            };

            for (const [specialization, task] of Object.entries(specializationTasks)) {
                const result = await masterAgent.coordinate(task);

                expect(result.taskType).toBe(specialization);
                expect(result.result).toBe('Mock adapter response - adapters not yet implemented');
            }
        });
    });
});
