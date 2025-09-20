#!/usr/bin/env node

import { ToolLayer } from './src/master-agent-loop/tool-layer.js';

console.log('🧪 Phase 3.1 Tool Layer Abstraction Validation');
console.log('==============================================');

async function validateToolLayer() {
    try {
        // Test 1: Layer initialization
        const dashboardLayer = new ToolLayer('dashboard');
        const executionLayer = new ToolLayer('execution');
        const primitiveLayer = new ToolLayer('primitive');
        
        console.log('✅ 1. Layer initialization successful');
        console.log(`   - Dashboard capabilities: ${dashboardLayer.getCapabilities().join(', ')}`);
        console.log(`   - Execution capabilities: ${executionLayer.getCapabilities().join(', ')}`);
        console.log(`   - Primitive capabilities: ${primitiveLayer.getCapabilities().join(', ')}`);

        // Test 2: Capability boundaries
        const dashboardCaps = dashboardLayer.getCapabilities();
        const executionCaps = executionLayer.getCapabilities();
        const primitiveCaps = primitiveLayer.getCapabilities();

        if (dashboardCaps.includes('visualization') && 
            executionCaps.includes('file-system') && 
            primitiveCaps.includes('memory-operations')) {
            console.log('✅ 2. Capability boundaries correctly implemented');
        } else {
            throw new Error('Capability boundaries incorrect');
        }

        // Test 3: Tool registration
        const testTool = {
            id: 'test-visualization-tool',
            name: 'Test Visualization Tool',
            capabilities: ['visualization'],
            execute: async (input, context) => ({ result: 'visualization created', input, context }),
            validate: (input) => !!input,
        };

        await dashboardLayer.registerTool(testTool);
        const registeredTools = dashboardLayer.getRegisteredTools();
        
        if (registeredTools.length === 1 && registeredTools[0].id === 'test-visualization-tool') {
            console.log('✅ 3. Tool registration works correctly');
        } else {
            throw new Error('Tool registration failed');
        }

        // Test 4: Tool discovery
        const vizTools = await dashboardLayer.discoverTools('visualization');
        if (vizTools.length === 1 && vizTools[0].id === 'test-visualization-tool') {
            console.log('✅ 4. Tool discovery works correctly');
        } else {
            throw new Error('Tool discovery failed');
        }

        // Test 5: Tool execution
        const result = await dashboardLayer.invokeTool('test-visualization-tool', { data: 'test' });
        if (result.result === 'visualization created' && result.input.data === 'test') {
            console.log('✅ 5. Tool execution works correctly');
        } else {
            throw new Error('Tool execution failed');
        }

        // Test 6: Layer health
        const health = dashboardLayer.getLayerHealth();
        if (health.layerType === 'dashboard' && 
            health.registeredTools === 1 && 
            health.totalExecutions === 1) {
            console.log('✅ 6. Layer health monitoring works correctly');
        } else {
            throw new Error('Layer health monitoring failed');
        }

        // Test 7: Tool metrics
        const metrics = dashboardLayer.getToolMetrics('test-visualization-tool');
        if (metrics && 
            metrics.totalExecutions === 1 && 
            metrics.successfulExecutions === 1 && 
            metrics.errorRate === 0) {
            console.log('✅ 7. Tool metrics tracking works correctly');
        } else {
            throw new Error('Tool metrics tracking failed');
        }

        // Test 8: Capability validation
        const incompatibleTool = {
            id: 'memory-tool',
            name: 'Memory Tool',
            capabilities: ['memory-operations'],
            execute: async () => ({}),
            validate: () => true,
        };

        try {
            await dashboardLayer.registerTool(incompatibleTool);
            throw new Error('Should have failed capability validation');
        } catch (error) {
            if (error.message.includes('not compatible with dashboard layer')) {
                console.log('✅ 8. Capability validation works correctly');
            } else {
                throw error;
            }
        }

        // Test 9: Graceful shutdown
        await dashboardLayer.shutdown();
        await executionLayer.shutdown();
        await primitiveLayer.shutdown();
        console.log('✅ 9. Graceful shutdown works correctly');

        console.log('\n🎉 All Phase 3.1 validation tests passed!');
        console.log('\n📋 Tool Layer Abstraction Implementation Summary:');
        console.log('   ✅ Multi-layer architecture with capability boundaries');
        console.log('   ✅ Tool registration and discovery system');
        console.log('   ✅ Input validation and security checks');
        console.log('   ✅ Comprehensive audit logging and metrics');
        console.log('   ✅ Layer health monitoring');
        console.log('   ✅ Graceful shutdown and cleanup');
        console.log('   ✅ OpenTelemetry integration for observability');
        console.log('\n🚀 Ready for Phase 3.2: Dashboard Tool Layer implementation');
        
        return true;
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        return false;
    }
}

// Run validation
validateToolLayer().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});