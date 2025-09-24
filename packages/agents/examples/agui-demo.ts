/**
 * AGUI Integration Demo
 *
 * Comprehensive example demonstrating AGUI integration with the agents package,
 * showcasing UI component creation, view rendering, and user interaction handling
 * within the brAInwav Cortex-OS ecosystem.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { CerebrumAgent } from '../src/CerebrumAgent';
import { createAGUIBusIntegration } from '../src/integrations/AGUIBusIntegration.js';
import { createAGUIMCPTools } from '../src/mcp/AGUIMCPTools.js';
import { createToolLayerAgent } from '../src/subagents/ToolLayerAgent.js';

/**
 * AGUI Integration Demo
 */
class AGUIIntegrationDemo {
	private cerebrumAgent: CerebrumAgent;
	private toolLayerAgent: ReturnType<typeof createToolLayerAgent>;
	private aguiMCPTools: ReturnType<typeof createAGUIMCPTools>;
	private aguiBusIntegration: ReturnType<typeof createAGUIBusIntegration>;

	constructor() {
		// Initialize Cerebrum Agent with AGUI support
		this.cerebrumAgent = new CerebrumAgent({
			name: 'agui-demo-cerebrum',
			enableAGUI: true,
			defaultUILayout: 'flex',
			maxUIComponents: 20,
			subAgents: [
				{
					name: 'tool-layer-agui',
					specialization: 'tool-layer',
					description: 'Tool layer with AGUI integration',
					capabilities: ['ui-creation', 'dashboard', 'interaction-handling'],
				},
				{
					name: 'intelligence-scheduler',
					specialization: 'intelligence-scheduler',
					description: 'Intelligence and scheduling agent',
					capabilities: ['task-analysis', 'planning'],
				},
			],
		});

		// Initialize Tool Layer Agent with AGUI
		this.toolLayerAgent = createToolLayerAgent({
			name: 'agui-tool-layer',
			enableAGUI: true,
			enableDashboard: true,
			defaultLayout: 'flex',
			maxUIComponents: 15,
			maxConcurrentTools: 5,
			toolTimeout: 30000,
			allowedTools: [
				'validator',
				'monitor',
				'dashboard',
				'tool-executor',
				'create_ui_component',
				'render_view',
				'handle_user_interaction',
				'update_component',
				'get_component_info',
				'list_components',
			],
		});

		// Initialize AGUI components
		this.aguiMCPTools = createAGUIMCPTools();
		this.aguiBusIntegration = createAGUIBusIntegration('agui-demo');

		this.setupEventHandlers();
	}

	/**
	 * Demo 1: Basic UI Component Creation
	 */
	async demoBasicUICreation(): Promise<void> {
		console.log('🎨 AGUI Demo 1: Basic UI Component Creation');
		console.log('='.repeat(50));

		try {
			// Create a button component
			const buttonResult = await this.aguiMCPTools.executeTool('create_ui_component', {
				type: 'button',
				properties: {
					id: 'demo-button-1',
					label: 'Click Me!',
					className: 'btn btn-primary',
				},
				styling: {
					style: {
						backgroundColor: '#007bff',
						color: 'white',
						padding: '10px 20px',
						borderRadius: '5px',
					},
				},
			});

			console.log('✅ Button created:', buttonResult);

			// Create a form input component
			const inputResult = await this.aguiMCPTools.executeTool('create_ui_component', {
				type: 'input',
				properties: {
					id: 'demo-input-1',
					placeholder: 'Enter your name...',
					required: true,
				},
			});

			console.log('✅ Input created:', inputResult);

			// Create a modal component
			const modalResult = await this.aguiMCPTools.executeTool('create_ui_component', {
				type: 'modal',
				properties: {
					id: 'demo-modal-1',
					label: 'Welcome Modal',
					className: 'modal fade',
				},
			});

			console.log('✅ Modal created:', modalResult);

			// List all components
			const listResult = await this.aguiMCPTools.executeTool('list_components', {});
			console.log('📋 All components:', listResult);
		} catch (error) {
			console.error('❌ Demo 1 failed:', error);
		}

		console.log('\\n');
	}

	/**
	 * Demo 2: Complex View Rendering
	 */
	async demoViewRendering(): Promise<void> {
		console.log('🖼️  AGUI Demo 2: Complex View Rendering');
		console.log('='.repeat(50));

		try {
			// Create components for the view
			const components = [];

			// Header component
			const headerResult = await this.aguiMCPTools.executeTool('create_ui_component', {
				type: 'custom',
				properties: {
					id: 'view-header',
					label: 'Dashboard Header',
					className: 'header',
				},
			});
			components.push((headerResult as any).componentId);

			// Chart component
			const chartResult = await this.aguiMCPTools.executeTool('create_ui_component', {
				type: 'chart',
				properties: {
					id: 'performance-chart',
					label: 'Performance Metrics',
					className: 'chart-container',
				},
			});
			components.push((chartResult as any).componentId);

			// Table component
			const tableResult = await this.aguiMCPTools.executeTool('create_ui_component', {
				type: 'table',
				properties: {
					id: 'data-table',
					label: 'Agent Status Table',
					className: 'table table-striped',
				},
			});
			components.push((tableResult as any).componentId);

			// Render the complete view
			const viewResult = await this.aguiMCPTools.executeTool('render_view', {
				viewId: 'dashboard-view',
				components,
				layout: 'grid',
				responsive: true,
				styling: {
					className: 'dashboard-grid',
					style: {
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: '20px',
						padding: '20px',
					},
				},
			});

			console.log('✅ Dashboard view rendered:', viewResult);

			// Demonstrate view rendering through Cerebrum Agent
			await this.cerebrumAgent.renderUIView({
				components,
				layout: 'flex',
				responsive: true,
			});

			console.log('✅ View rendered through Cerebrum Agent');
		} catch (error) {
			console.error('❌ Demo 2 failed:', error);
		}

		console.log('\\n');
	}

	/**
	 * Demo 3: User Interaction Handling
	 */
	async demoUserInteractions(): Promise<void> {
		console.log('🖱️  AGUI Demo 3: User Interaction Handling');
		console.log('='.repeat(50));

		try {
			// Create an interactive form
			const formResult = await this.aguiMCPTools.executeTool('create_ui_component', {
				type: 'form',
				properties: {
					id: 'interactive-form',
					label: 'User Feedback Form',
				},
			});

			console.log('✅ Interactive form created:', formResult);

			// Simulate user interactions
			const interactions = [
				{
					componentId: 'demo-button-1',
					eventType: 'click',
					coordinates: { x: 120, y: 45 },
				},
				{
					componentId: 'demo-input-1',
					eventType: 'input',
					value: 'John Doe',
				},
				{
					componentId: 'interactive-form',
					eventType: 'submit',
					value: {
						name: 'John Doe',
						email: 'john@example.com',
						feedback: 'Great AGUI integration!',
					},
				},
			];

			for (const interaction of interactions) {
				const result = await this.aguiMCPTools.executeTool('handle_user_interaction', interaction);
				console.log(`✅ Interaction processed:`, result);

				// Also handle through Cerebrum Agent
				await this.cerebrumAgent.handleUserInteraction({
					componentId: interaction.componentId,
					action: interaction.eventType,
					value: interaction.value,
					coordinates: interaction.coordinates,
				});
			}
		} catch (error) {
			console.error('❌ Demo 3 failed:', error);
		}

		console.log('\\n');
	}

	/**
	 * Demo 4: Dynamic Component Updates
	 */
	async demoDynamicUpdates(): Promise<void> {
		console.log('🔄 AGUI Demo 4: Dynamic Component Updates');
		console.log('='.repeat(50));

		try {
			// Get component info before update
			const beforeUpdate = await this.aguiMCPTools.executeTool('get_component_info', {
				componentId: 'demo-button-1',
			});
			console.log('📊 Component before update:', beforeUpdate);

			// Update component properties
			const updateResult = await this.aguiMCPTools.executeTool('update_component', {
				componentId: 'demo-button-1',
				updates: {
					properties: {
						label: 'Updated Button!',
						className: 'btn btn-success',
					},
					styling: {
						backgroundColor: '#28a745',
						fontSize: '16px',
					},
					disabled: false,
					visible: true,
				},
			});

			console.log('✅ Component updated:', updateResult);

			// Get component info after update
			const afterUpdate = await this.aguiMCPTools.executeTool('get_component_info', {
				componentId: 'demo-button-1',
			});
			console.log('📊 Component after update:', afterUpdate);

			// Update visibility
			await this.aguiMCPTools.executeTool('update_component', {
				componentId: 'demo-input-1',
				updates: {
					visible: false,
				},
			});

			console.log('✅ Input visibility updated to hidden');
		} catch (error) {
			console.error('❌ Demo 4 failed:', error);
		}

		console.log('\\n');
	}

	/**
	 * Demo 5: Tool Layer Agent Integration
	 */
	async demoToolLayerIntegration(): Promise<void> {
		console.log('🔧 AGUI Demo 5: Tool Layer Agent Integration');
		console.log('='.repeat(50));

		try {
			// Execute AGUI tools through Tool Layer Agent
			const result1 = await this.toolLayerAgent.execute(
				'Create a dashboard with charts and tables for monitoring agent performance',
			);

			console.log('✅ Tool Layer execution 1:', result1.result);

			const result2 = await this.toolLayerAgent.execute(
				'Handle user click interaction on the performance chart',
			);

			console.log('✅ Tool Layer execution 2:', result2.result);

			const result3 = await this.toolLayerAgent.execute(
				'Update the dashboard layout to use grid instead of flex',
			);

			console.log('✅ Tool Layer execution 3:', result3.result);
		} catch (error) {
			console.error('❌ Demo 5 failed:', error);
		}

		console.log('\\n');
	}

	/**
	 * Demo 6: Full Cerebrum Workflow
	 */
	async demoCerebrumWorkflow(): Promise<void> {
		console.log('🧠 AGUI Demo 6: Full Cerebrum Workflow');
		console.log('='.repeat(50));

		try {
			// Execute complex UI workflow through Cerebrum
			const workflowResult = await this.cerebrumAgent.execute(
				'Create a comprehensive admin dashboard with user management interface, ' +
					'performance metrics visualization, and interactive configuration panels',
				{
					context: {
						userRole: 'admin',
						dashboardType: 'full-featured',
						layoutPreference: 'grid',
					},
				},
			);

			console.log('✅ Cerebrum workflow completed:', workflowResult.result);

			// Health check
			const healthCheck = await this.cerebrumAgent.healthCheck();
			console.log('🏥 System health check:', healthCheck);
		} catch (error) {
			console.error('❌ Demo 6 failed:', error);
		}

		console.log('\\n');
	}

	/**
	 * Run all demos
	 */
	async runAllDemos(): Promise<void> {
		console.log('🚀 Starting AGUI Integration Demo Suite');
		console.log('='.repeat(60));
		console.log('');

		await this.demoBasicUICreation();
		await this.demoViewRendering();
		await this.demoUserInteractions();
		await this.demoDynamicUpdates();
		await this.demoToolLayerIntegration();
		await this.demoCerebrumWorkflow();

		console.log('🎉 All AGUI demos completed successfully!');

		// Final status
		const status = this.aguiMCPTools.getStatus();
		console.log('📈 Final AGUI MCP Tools Status:', status);
	}

	/**
	 * Setup event handlers for demo
	 */
	private setupEventHandlers(): void {
		// Cerebrum Agent events
		this.cerebrumAgent.on('agui:component:creating', (data) => {
			console.log('🎨 Component creating:', data);
		});

		this.cerebrumAgent.on('agui:component:rendered', (data) => {
			console.log('✅ Component rendered:', data);
		});

		this.cerebrumAgent.on('agui:view:rendering', (data) => {
			console.log('🖼️  View rendering:', data);
		});

		this.cerebrumAgent.on('agui:view:rendered', (data) => {
			console.log('✅ View rendered:', data);
		});

		this.cerebrumAgent.on('agui:user:interaction', (data) => {
			console.log('🖱️  User interaction:', data);
		});

		this.cerebrumAgent.on('agui:workflow:delegating', (data) => {
			console.log('🔄 Workflow delegating:', data);
		});

		// Tool Layer Agent events
		this.toolLayerAgent.on('agui:component:rendered', (data) => {
			console.log('🔧 Tool Layer - Component rendered:', data);
		});

		this.toolLayerAgent.on('agui:user:interaction', (data) => {
			console.log('🔧 Tool Layer - User interaction:', data);
		});

		// AGUI Bus Integration events
		this.aguiBusIntegration.on('event:published', (data) => {
			console.log('📡 Event published:', data);
		});

		this.aguiBusIntegration.on('bus:connected', (data) => {
			console.log('🔌 Bus connected:', data);
		});
	}

	/**
	 * Cleanup demo resources
	 */
	async cleanup(): Promise<void> {
		this.aguiMCPTools.clear();
		await this.aguiBusIntegration.shutdown();
		console.log('🧹 Demo cleanup completed');
	}
}

/**
 * Run the demo
 */
export async function runAGUIDemo(): Promise<void> {
	const demo = new AGUIIntegrationDemo();

	try {
		await demo.runAllDemos();
	} catch (error) {
		console.error('❌ Demo suite failed:', error);
	} finally {
		await demo.cleanup();
	}
}

export { AGUIIntegrationDemo };
