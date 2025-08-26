import { PythonAgentBridge } from '../src/bridges/python-agent-bridge';
import { A2AMessage } from '../src/bridges/a2a';

describe('PythonAgentBridge', () => {
  it('should send and receive A2A messages', async () => {
    const bridge = new PythonAgentBridge();
    await bridge.initialize();

    const task = {
      coordinationId: 'test-task',
      phaseId: 'test-phase',
      phaseName: 'test-phase',
      requirements: ['test-requirement'],
      agentType: 'langgraph' as const,
    };

    const result = await bridge.executeAgentTask(task);

    expect(result.success).toBe(true);
    expect(result.agent_id).toBe('langgraph-agent');

    await bridge.shutdown();
  }, 30000);
});
