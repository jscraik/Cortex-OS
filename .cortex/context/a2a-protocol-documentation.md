# A2A Protocol Development Guide

## Overview

The A2A (Agent2Agent) protocol is a JSON-RPC based communication protocol designed for agent interactions. This guide provides comprehensive instructions for developing both server and client components that conform to the A2A protocol specification.

## Table of Contents

- [Protocol Basics](#protocol-basics)
- [Server Implementation](#server-implementation)
- [Client Implementation](#client-implementation)
- [Running the Coder Demo](#running-the-coder-demo)
- [Best Practices](#best-practices)

## Protocol Basics

### Message Structure

All A2A messages follow the JSON-RPC 2.0 format with the following base structure:

```typescript
interface JSONRPCMessage {
  jsonrpc?: '2.0';
  id?: number | string | null;
  method?: string;
  params?: unknown;
  error?: JSONRPCError;
}
```

### Protocol Flow

The following sequence diagram illustrates the main interaction flow of the A2A protocol:

![A2A typical flow](a2a-typical-flow)

### Core Methods

The protocol supports several core methods:

- `tasks/send`: Send a task message to an agent
- `tasks/get`: Retrieve task status
- `tasks/cancel`: Cancel a running task
- `tasks/pushNotification/set`: Configure push notifications for a task
- `tasks/pushNotification/get`: Get push notification configuration
- `tasks/resubscribe`: Resubscribe to task updates
- `tasks/sendSubscribe`: Send a task message and subscribe to updates

### Task States

Tasks can be in one of the following states:

- `unknown`: Initial state
- `working`: Task is being processed
- `completed`: Task finished successfully
- `canceled`: Task was cancelled
- `failed`: Task encountered an error

## Server Implementation

### Core Components

The server implementation consists of several key components:

- **Server** (`server.ts`): Main server implementation handling HTTP requests
- **Handler** (`handler.ts`): Request handler for processing A2A protocol messages
- **Error Handling** (`error.ts`): Error definitions and handling

### Basic Usage

```typescript
import { A2AServer, InMemoryTaskStore, TaskContext, TaskYieldUpdate } from './index'; // Assuming imports from the server package

// 1. Define your agent's logic as a TaskHandler
async function* myAgentLogic(context: TaskContext): AsyncGenerator<TaskYieldUpdate> {
  console.log(`Handling task: ${context.task.id}`);
  yield {
    state: 'working',
    message: { role: 'agent', parts: [{ text: 'Processing...' }] },
  };

  // Simulate work...
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (context.isCancelled()) {
    console.log('Task cancelled!');
    yield { state: 'canceled' };
    return;
  }

  // Yield an artifact
  yield {
    name: 'result.txt',
    mimeType: 'text/plain',
    parts: [{ text: `Task ${context.task.id} completed.` }],
  };

  // Yield final status
  yield {
    state: 'completed',
    message: { role: 'agent', parts: [{ text: 'Done!' }] },
  };
}

// 2. Create and start the server
const store = new InMemoryTaskStore(); // Or new FileStore()
const server = new A2AServer(myAgentLogic, { taskStore: store });

server.start(); // Starts listening on default port 41241

console.log('A2A Server started.');
```

## Client Implementation

The client implementation provides extensibility and allows providing a custom fetch implementation for different environments (e.g., Node.js).

### Basic Usage

```typescript
import { A2AClient, Task, TaskQueryParams, TaskSendParams } from './client';
import { v4 as uuidv4 } from 'uuid';

const client = new A2AClient('http://localhost:41241');

async function run() {
  try {
    // Send a simple task
    const taskId = uuidv4();
    const sendParams: TaskSendParams = {
      id: taskId,
      message: { role: 'user', parts: [{ text: 'Hello, agent!' }] },
    };

    const taskResult: Task | null = await client.sendTask(sendParams);
    console.log('Send Task Result:', taskResult);

    // Get task status
    const getParams: TaskQueryParams = { id: taskId };
    const getTaskResult: Task | null = await client.getTask(getParams);
    console.log('Get Task Result:', getTaskResult);
  } catch (error) {
    console.error('A2A Client Error:', error);
  }
}

run();
```

### Streaming Tasks

```typescript
import {
  A2AClient,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  TaskSendParams,
} from './client';
import { v4 as uuidv4 } from 'uuid';

const client = new A2AClient('http://localhost:41241');

async function streamTask() {
  const streamingTaskId = uuidv4();
  try {
    console.log(`Starting streaming task ${streamingTaskId}`);

    const streamParams: TaskSendParams = {
      id: streamingTaskId,
      message: { role: 'user', parts: [{ text: 'Stream me some updates!' }] },
    };

    const stream = client.sendTaskSubscribe(streamParams);

    for await (const event of stream) {
      if (event.type === 'status') {
        console.log('Status update:', event.data);
      } else if (event.type === 'artifact') {
        console.log('Artifact update:', event.data);
      }
    }
  } catch (error) {
    console.error(`Error during streaming task ${streamingTaskId}:`, error);
  }
}

streamTask();
```

## Running the Coder Demo

The Coder Demo is an example implementation of an A2A agent that can process code-related tasks.

### Setup

1. Clone the repository:

```bash
git clone https://github.com/sing1ee/a2a-agent-coder.git
# or
git clone git@github.com:sing1ee/a2a-agent-coder.git
```

2. Install dependencies:

```bash
bun install
```

3. Configure environment variables:

```bash
# Create .env file with required variables
export $(cat .env | xargs)
```

### Running the Demo

Start the coder agent and interact with it through the terminal interface. The demo provides an interactive environment where you can send coding tasks and receive responses.

## Error Handling

The A2A protocol defines several standard error codes for proper error handling:

- **Invalid Request**: Malformed JSON-RPC request
- **Method Not Found**: Requested method is not supported
- **Invalid Parameters**: Parameters are invalid for the method
- **Internal Error**: Server encountered an internal error
- **Task Not Found**: Requested task does not exist

## Best Practices

- **Error Handling**: Always implement proper error handling for all A2A protocol methods
- **Authentication**: Implement proper authentication mechanisms for secure communication
- **Task Management**: Maintain proper task state management and cleanup
- **Push Notifications**: Implement push notifications for real-time updates when supported
- **Logging**: Implement comprehensive logging for debugging and monitoring
- **Resource Management**: Properly manage server resources and implement timeouts
- **Validation**: Validate all inputs and outputs according to protocol specifications

## Additional Resources

- [A2A Protocol Specification](link-to-spec)
- [Example Implementations](link-to-examples)
- [API Reference](link-to-api-docs)
