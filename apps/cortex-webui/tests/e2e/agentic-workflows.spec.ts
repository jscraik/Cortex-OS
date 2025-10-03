import { expect, test } from '@playwright/test';

/**
 * brAInwav Cortex-OS Agentic Workflow E2E Tests
 *
 * Comprehensive testing of agentic workflows and multi-agent coordination:
 * - Workflow creation and configuration
 * - Multi-agent coordination and communication
 * - Workflow execution from UI
 * - Error handling and recovery mechanisms
 * - Agent performance monitoring
 * - Workflow scheduling and triggers
 * - Agent collaboration patterns
 * - Event-driven communication validation
 */
test.describe('brAInwav Cortex-OS Agentic Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@brainwav.ai');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit-button"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('Workflow Creation and Configuration', () => {
    test('should create new agentic workflow', async ({ page }) => {
      await page.click('[data-testid="workflows-nav"]');
      await expect(page).toHaveURL(/\/workflows/);

      // Verify brAInwav branding
      await expect(page.locator('text=brAInwav Workflow Designer')).toBeVisible();
      await expect(page.locator('text=Autonomous Software Behavior Reasoning')).toBeVisible();

      // Click create workflow button
      await page.click('[data-testid="create-workflow-button"]');
      await expect(page).toHaveURL(/\/workflows\/create/);

      // Fill workflow details
      await page.fill('[data-testid="workflow-name"]', 'Document Analysis Pipeline');
      await page.fill('[data-testid="workflow-description"]', 'Automated document analysis using brAInwav AI agents');

      // Select workflow type
      await page.selectOption('[data-testid="workflow-type"]', 'document-processing');

      // Configure agents
      await page.click('[data-testid="add-agent-button"]');
      await expect(page.locator('[data-testid="agent-selector"]')).toBeVisible();

      // Add Document Parser Agent
      await page.selectOption('[data-testid="agent-type"]', 'document-parser');
      await page.fill('[data-testid="agent-name"]', 'Document Parser');
      await page.fill('[data-testid="agent-config"]', JSON.stringify({
        extractText: true,
        extractImages: true,
        model: 'claude-3-sonnet'
      }));

      await page.click('[data-testid="save-agent-button"]');

      // Add Content Analyzer Agent
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'content-analyzer');
      await page.fill('[data-testid="agent-name"]', 'Content Analyzer');
      await page.fill('[data-testid="agent-config"]', JSON.stringify({
        analyzeSentiment: true,
        extractEntities: true,
        generateSummary: true,
        model: 'claude-3-haiku'
      }));

      await page.click('[data-testid="save-agent-button"]');

      // Add RAG Specialist Agent
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'rag-specialist');
      await page.fill('[data-testid="agent-name"]', 'RAG Specialist');
      await page.fill('[data-testid="agent-config"]', JSON.stringify({
        searchLocalMemory: true,
        generateCitations: true,
        contextWindow: 4000
      }));

      await page.click('[data-testid="save-agent-button"]');

      // Configure workflow triggers
      await page.click('[data-testid="configure-triggers"]');
      await expect(page.locator('[data-testid="trigger-modal"]')).toBeVisible();

      await page.check('[data-testid="trigger-document-upload"]');
      await page.check('[data-testid="trigger-schedule"]');
      await page.fill('[data-testid="schedule-cron"]', '0 9 * * 1-5'); // 9 AM weekdays

      await page.click('[data-testid="save-triggers-button"]');

      // Save workflow
      await page.click('[data-testid="save-workflow-button"]');

      // Should show success message
      await expect(page.locator('text=Workflow created successfully')).toBeVisible();
      await expect(page).toHaveURL(/\/workflows\/[\w-]+/);

      // Verify workflow details
      await expect(page.locator('text=Document Analysis Pipeline')).toBeVisible();
      await expect(page.locator('[data-testid="agent-list"]')).toHaveCount(3);
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('draft');
    });

    test('should configure agent communication patterns', async ({ page }) => {
      await page.goto('/workflows/create');

      // Create workflow with multiple agents
      await page.fill('[data-testid="workflow-name"]', 'Multi-Agent Collaboration');
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'coordinator');
      await page.fill('[data-testid="agent-name"]', 'Workflow Coordinator');
      await page.click('[data-testid="save-agent-button"]');

      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'worker');
      await page.fill('[data-testid="agent-name"]', 'Data Processor');
      await page.click('[data-testid="save-agent-button"]');

      // Configure communication
      await page.click('[data-testid="configure-communication"]');
      await expect(page.locator('[data-testid="communication-modal"]')).toBeVisible();

      // Set up event-driven communication
      await page.selectOption('[data-testid="communication-pattern"]', 'event-driven');
      await page.check('[data-testid="use-a2a-events"]');
      await page.fill('[data-testid="event-topics"]', 'workflow.started,agent.completed,workflow.failed');

      // Configure retry logic
      await page.fill('[data-testid="max-retries"]', '3');
      await page.fill('[data-testid="retry-delay"]', '5000');
      await page.check('[data-testid="exponential-backoff"]');

      // Save communication config
      await page.click('[data-testid="save-communication-button"]');

      // Should show communication diagram
      await expect(page.locator('[data-testid="communication-diagram"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-flow"]')).toBeVisible();
    });

    test('should validate workflow configuration', async ({ page }) => {
      await page.goto('/workflows/create');

      // Try to save without required fields
      await page.click('[data-testid="save-workflow-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="agents-error"]')).toBeVisible();
      await expect(page.locator('text=Workflow name is required')).toBeVisible();
      await expect(page.locator('text=At least one agent is required')).toBeVisible();

      // Add invalid agent configuration
      await page.fill('[data-testid="workflow-name"]', 'Invalid Workflow');
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'worker');
      await page.fill('[data-testid="agent-name"]', '');
      await page.fill('[data-testid="agent-config"]', 'invalid json');

      await page.click('[data-testid="save-agent-button"]');

      // Should show agent validation errors
      await expect(page.locator('[data-testid="agent-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-config-error"]')).toBeVisible();
    });
  });

  test.describe('Workflow Execution', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test workflow for execution testing
      await page.goto('/workflows/create');
      await page.fill('[data-testid="workflow-name"]', 'Test Execution Workflow');
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'worker');
      await page.fill('[data-testid="agent-name"]', 'Test Agent');
      await page.fill('[data-testid="agent-config"]', JSON.stringify({
        model: 'claude-3-sonnet',
        timeout: 30000
      }));
      await page.click('[data-testid="save-agent-button"]');
      await page.click('[data-testid="save-workflow-button"]');
      await expect(page).toHaveURL(/\/workflows\/[\w-]+/);
    });

    test('should execute workflow successfully', async ({ page }) => {
      // Start workflow execution
      await page.click('[data-testid="execute-workflow-button"]');
      await expect(page.locator('[data-testid="execution-modal"]')).toBeVisible();

      // Select execution mode
      await page.selectOption('[data-testid="execution-mode"]', 'immediate');
      await page.click('[data-testid="start-execution-button"]');

      // Should show execution status
      await expect(page.locator('[data-testid="execution-status"]')).toBeVisible();
      await expect(page.locator('text=Starting brAInwav workflow...')).toBeVisible();

      // Monitor agent execution
      await expect(page.locator('[data-testid="agent-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="test-agent-status"]')).toHaveText('running');

      // Should show execution logs
      await expect(page.locator('[data-testid="execution-logs"]')).toBeVisible();
      await expect(page.locator('text=Agent initialization complete')).toBeVisible();
      await expect(page.locator('text=Processing workflow tasks...')).toBeVisible();

      // Wait for completion
      await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 45000 });

      // Verify completion
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('completed');
      await expect(page.locator('text=Workflow executed successfully')).toBeVisible();

      // Check execution results
      await expect(page.locator('[data-testid="execution-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-results"]')).toBeVisible();
    });

    test('should monitor agent performance during execution', async ({ page }) => {
      await page.click('[data-testid="execute-workflow-button"]');
      await page.selectOption('[data-testid="execution-mode"]', 'immediate');
      await page.click('[data-testid="start-execution-button"]');

      // Should show performance metrics
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-performance"]')).toBeVisible();

      // Monitor key metrics
      await expect(page.locator('[data-testid="execution-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="cpu-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="token-usage"]')).toBeVisible();

      // Verify brAInwav branding in performance display
      await expect(page.locator('text=brAInwav Performance Monitor')).toBeVisible();
    });

    test('should handle workflow errors and recovery', async ({ page }) => {
      // Configure agent to fail
      await page.click('[data-testid="edit-workflow-button"]');
      await page.click('[data-testid="edit-agent"]:first-child');
      await page.fill('[data-testid="agent-config"]', JSON.stringify({
        model: 'invalid-model',
        simulateFailure: true
      }));
      await page.click('[data-testid="save-agent-button"]');
      await page.click('[data-testid="save-workflow-button"]');

      // Execute workflow
      await page.click('[data-testid="execute-workflow-button"]');
      await page.selectOption('[data-testid="execution-mode"]', 'immediate');
      await page.click('[data-testid="start-execution-button"]');

      // Should show error
      await expect(page.locator('[data-testid="execution-error"]')).toBeVisible();
      await expect(page.locator('text=Agent execution failed')).toBeVisible();

      // Should provide recovery options
      await expect(page.locator('[data-testid="retry-execution-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="skip-failed-agent-button"]')).toBeVisible();

      // Retry execution
      await page.click('[data-testid="retry-execution-button"]');

      // Should show retry progress
      await expect(page.locator('text=Retrying workflow execution...')).toBeVisible();
      await expect(page.locator('[data-testid="retry-attempt"]')).toBeVisible();
    });

    test('should support manual intervention during execution', async ({ page }) => {
      await page.click('[data-testid="execute-workflow-button"]');
      await page.selectOption('[data-testid="execution-mode"]', 'manual');
      await page.click('[data-testid="start-execution-button"]');

      // Should pause for human input
      await expect(page.locator('[data-testid="manual-intervention"]')).toBeVisible();
      await expect(page.locator('text=Waiting for human input')).toBeVisible();

      // Provide input
      await page.fill('[data-testid="manual-input"]', 'Proceed with document analysis');
      await page.click('[data-testid="continue-execution-button"]');

      // Should resume execution
      await expect(page.locator('text=Resuming workflow execution...')).toBeVisible();
    });
  });

  test.describe('Multi-Agent Coordination', () => {
    test('should coordinate multiple agents in complex workflow', async ({ page }) => {
      // Create complex workflow with multiple agents
      await page.goto('/workflows/create');
      await page.fill('[data-testid="workflow-name"]', 'Complex Multi-Agent Workflow');

      // Add Coordinator Agent
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'coordinator');
      await page.fill('[data-testid="agent-name"]', 'Workflow Coordinator');
      await page.fill('[data-testid="agent-config"]', JSON.stringify({
        orchestrateAgents: true,
        handleFailures: true,
        model: 'claude-3-opus'
      }));
      await page.click('[data-testid="save-agent-button"]');

      // Add Worker Agents
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="add-agent-button"]');
        await page.selectOption('[data-testid="agent-type"]', 'worker');
        await page.fill('[data-testid="agent-name"]', `Worker Agent ${i}`);
        await page.fill('[data-testid="agent-config"]', JSON.stringify({
          taskType: 'data-processing',
          parallelExecution: true,
          model: 'claude-3-sonnet'
        }));
        await page.click('[data-testid="save-agent-button"]');
      }

      // Add Result Aggregator Agent
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'aggregator');
      await page.fill('[data-testid="agent-name"]', 'Result Aggregator');
      await page.fill('[data-testid="agent-config"]', JSON.stringify({
        combineResults: true,
        generateSummary: true,
        model: 'claude-3-haiku'
      }));
      await page.click('[data-testid="save-agent-button"]');

      await page.click('[data-testid="save-workflow-button"]');

      // Execute complex workflow
      await page.click('[data-testid="execute-workflow-button"]');
      await page.selectOption('[data-testid="execution-mode"]', 'immediate');
      await page.click('[data-testid="start-execution-button"]');

      // Should show agent coordination
      await expect(page.locator('[data-testid="agent-coordination"]')).toBeVisible();
      await expect(page.locator('[data-testid="coordinator-status"]')).toHaveText('orchestrating');
      await expect(page.locator('[data-testid="worker-agents-status"]')).toHaveText('running');

      // Monitor parallel execution
      await expect(page.locator('[data-testid="parallel-execution"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-progress"]')).toHaveCount(3);

      // Wait for coordination completion
      await page.waitForSelector('[data-testid="coordination-complete"]', { timeout: 60000 });

      // Verify all agents completed
      await expect(page.locator('[data-testid="agent-status"]:has-text("completed")')).toHaveCount(5);
    });

    test('should handle agent communication via A2A events', async ({ page }) => {
      await page.goto('/workflows/create');
      await page.fill('[data-testid="workflow-name"]', 'A2A Event Communication');

      // Configure agents for event-based communication
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'event-emitter');
      await page.fill('[data-testid="agent-name"]', 'Event Publisher');
      await page.click('[data-testid="save-agent-button"]');

      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'event-listener');
      await page.fill('[data-testid="agent-name"]', 'Event Subscriber');
      await page.click('[data-testid="save-agent-button"]');

      // Configure A2A communication
      await page.click('[data-testid="configure-communication"]');
      await page.check('[data-testid="use-a2a-events"]');
      await page.fill('[data-testid="event-topics"]', 'brainwav.workflow.events');
      await page.check('[data-testid="enable-a2a-retries"]');

      await page.click('[data-testid="save-communication-button"]');
      await page.click('[data-testid="save-workflow-button"]');

      // Execute and monitor A2A communication
      await page.click('[data-testid="execute-workflow-button"]');
      await page.click('[data-testid="start-execution-button"]');

      // Should show A2A event monitoring
      await expect(page.locator('[data-testid="a2a-events"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-stream"]')).toBeVisible();

      // Verify event publishing
      await expect(page.locator('text=Publishing A2A event')).toBeVisible();
      await expect(page.locator('[data-testid="event-details"]')).toBeVisible();

      // Verify event subscription
      await expect(page.locator('text=Subscribing to A2A events')).toBeVisible();
      await expect(page.locator('[data-testid="subscription-details"]')).toBeVisible();
    });
  });

  test.describe('Workflow Scheduling and Triggers', () => {
    test('should execute scheduled workflow', async ({ page }) => {
      await page.goto('/workflows/create');
      await page.fill('[data-testid="workflow-name"]', 'Scheduled Test Workflow');
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'worker');
      await page.fill('[data-testid="agent-name"]', 'Scheduled Agent');
      await page.click('[data-testid="save-agent-button"]');

      // Configure schedule
      await page.click('[data-testid="configure-triggers"]');
      await page.check('[data-testid="trigger-schedule"]');
      await page.selectOption('[data-testid="schedule-frequency"]', 'every-minute'); // For testing
      await page.click('[data-testid="save-triggers-button"]');

      await page.click('[data-testid="save-workflow-button"]');

      // Activate scheduling
      await page.click('[data-testid="activate-scheduling-button"]');
      await expect(page.locator('[data-testid="scheduling-active"]')).toBeVisible();

      // Wait for scheduled execution (in real scenario, this would be longer)
      await page.waitForTimeout(65000); // Wait just over a minute

      // Should show scheduled execution
      await expect(page.locator('[data-testid="scheduled-execution"]')).toBeVisible();
      await expect(page.locator('text=Workflow executed on schedule')).toBeVisible();
    });

    test('should handle event-based triggers', async ({ page }) => {
      await page.goto('/workflows/create');
      await page.fill('[data-testid="workflow-name"]', 'Event-Triggered Workflow');
      await page.click('[data-testid="add-agent-button"]');
      await page.selectOption('[data-testid="agent-type"]', 'responder');
      await page.fill('[data-testid="agent-name"]', 'Event Responder');
      await page.click('[data-testid="save-agent-button"]');

      // Configure event triggers
      await page.click('[data-testid="configure-triggers"]');
      await page.check('[data-testid="trigger-events"]');
      await page.check('[data-testid="trigger-document-upload"]');
      await page.check('[data-testid="trigger-user-registration"]');
      await page.check('[data-testid="trigger-system-alert"]');
      await page.click('[data-testid="save-triggers-button"]');

      await page.click('[data-testid="save-workflow-button"]');

      // Trigger event manually for testing
      await page.goto('/documents');
      await page.click('[data-testid="upload-document-button"]');
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'trigger-test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Test content to trigger workflow')
      });
      await page.fill('[data-testid="document-title"]', 'Trigger Test Document');
      await page.click('[data-testid="upload-submit-button"]');

      // Should trigger workflow
      await page.goto('/workflows');
      await expect(page.locator('[data-testid="workflow-triggered"]')).toBeVisible();
      await expect(page.locator('text=Triggered by document upload')).toBeVisible();
    });
  });

  test.describe('Workflow Analytics and Reporting', () => {
    test('should provide comprehensive workflow analytics', async ({ page }) => {
      await page.goto('/workflows');

      // Navigate to analytics
      await page.click('[data-testid="analytics-tab"]');
      await expect(page).toHaveURL(/\/workflows\/analytics/);

      // Verify analytics dashboard
      await expect(page.locator('text=brAInwav Workflow Analytics')).toBeVisible();
      await expect(page.locator('[data-testid="execution-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();

      // Check key metrics
      await expect(page.locator('[data-testid="total-workflows"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-execution-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-utilization"]')).toBeVisible();

      // Verify agent performance details
      await expect(page.locator('[data-testid="agent-performance-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-efficiency-metrics"]')).toBeVisible();
    });

    test('should generate workflow execution reports', async ({ page }) => {
      await page.goto('/workflows/analytics');

      // Generate report
      await page.click('[data-testid="generate-report-button"]');
      await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();

      // Configure report
      await page.selectOption('[data-testid="report-type"]', 'execution-summary');
      await page.fill('[data-testid="report-period"]', 'last-7-days');
      await page.check('[data-testid="include-employee-metrics"]');
      await page.check('[data-testid="include-agent-details"]');

      await page.click('[data-testid="generate-button"]');

      // Should show report generation progress
      await expect(page.locator('[data-testid="report-generation"]')).toBeVisible();
      await expect(page.locator('text=Generating brAInwav workflow report...')).toBeVisible();

      // Wait for completion
      await page.waitForSelector('[data-testid="report-ready"]', { timeout: 30000);

      // Verify report
      await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
      await expect(page.locator('text=brAInwav Cortex-OS Workflow Execution Report')).toBeVisible();

      // Download report
      await page.click('[data-testid="download-report-button"]');
      await expect(page.locator('[data-testid="download-started"]')).toBeVisible();
    });
  });
});