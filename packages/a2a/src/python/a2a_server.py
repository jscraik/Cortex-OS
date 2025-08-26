#!/usr/bin/env python3
"""
Mock Python A2A Server for testing
Provides a simple JSON-RPC interface for agent task execution
"""

import json
import sys
import time
from typing import Dict, Any

class MockA2AServer:
    """Mock A2A server for testing bridge communication"""
    
    def __init__(self):
        self.agent_types = {
            'langgraph': 'langgraph-agent',
            'crewai': 'crewai-agent', 
            'autogen': 'autogen-agent'
        }
    
    def process_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Process incoming message and return response"""
        message_type = message.get('type')
        message_id = message.get('message_id', 'unknown')
        
        if message_type == 'execute_task':
            return self.execute_task(message.get('task', {}), message_id)
        
        return {
            'message_id': message_id,
            'error': f'Unknown message type: {message_type}',
            'timestamp': int(time.time() * 1000)
        }
    
    def execute_task(self, task: Dict[str, Any], message_id: str) -> Dict[str, Any]:
        """Execute an agent task"""
        agent_type = task.get('agentType', 'unknown')
        coordination_id = task.get('coordinationId', 'unknown')
        phase_id = task.get('phaseId', 'unknown')
        
        if agent_type not in self.agent_types:
            return {
                'message_id': message_id,
                'error': f'Unknown agent type: {agent_type}',
                'timestamp': int(time.time() * 1000)
            }
        
        # Simulate successful task execution
        return {
            'message_id': message_id,
            'result': {
                'success': True,
                'agent_id': self.agent_types[agent_type],
                'result': {
                    'coordination_id': coordination_id,
                    'phase_id': phase_id,
                    'status': 'completed',
                    'output': f'Task executed by {agent_type} agent'
                },
                'metadata': {
                    'coordination_id': coordination_id,
                    'phase_id': phase_id,
                    'agent_type': agent_type,
                    'execution_time': 150  # milliseconds
                }
            },
            'timestamp': int(time.time() * 1000)
        }
    
    def run(self):
        """Main server loop"""
        try:
            while True:
                line = sys.stdin.readline()
                if not line:
                    break
                
                line = line.strip()
                if not line:
                    continue
                
                try:
                    message = json.loads(line)
                    response = self.process_message(message)
                    print(json.dumps(response), flush=True)
                except json.JSONDecodeError:
                    print(json.dumps({
                        'error': 'Invalid JSON',
                        'timestamp': int(time.time() * 1000)
                    }), flush=True)
                except Exception as e:
                    print(json.dumps({
                        'error': str(e),
                        'timestamp': int(time.time() * 1000)
                    }), flush=True)
                    
        except KeyboardInterrupt:
            pass
        except Exception as e:
            print(json.dumps({
                'error': f'Server error: {str(e)}',
                'timestamp': int(time.time() * 1000)
            }), file=sys.stderr, flush=True)

if __name__ == '__main__':
    server = MockA2AServer()
    server.run()