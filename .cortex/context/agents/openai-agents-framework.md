# Agents

Learn how to build agents with the OpenAI API.

Agents represent **systems that intelligently accomplish tasks**, ranging from executing simple workflows to pursuing complex, open-ended objectives.

OpenAI provides a **rich set of composable primitives that enable you to build agents**. This guide walks through those primitives, and how they come together to form a robust agentic platform.

## Overview

Building agents involves assembling components across several domains—such as **models, tools, knowledge and memory, audio and speech, guardrails, and orchestration**—and OpenAI provides composable primitives for each.

| Domain               | Description                                                                                    | OpenAI Primitives                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Models               | Core intelligence capable of reasoning, making decisions, and processing different modalities. | o1, o3-mini, GPT-4.5, GPT-4o, GPT-4o-mini                                                        |
| Tools                | Interface to the world, interact with environment, function calling, built-in tools, etc.      | Function calling, Web search, File search, Computer use                                          |
| Knowledge and memory | Augment agents with external and persistent knowledge.                                         | Vector stores, File search, Embeddings                                                           |
| Audio and speech     | Create agents that can understand audio and respond back in natural language.                  | Audio generation, realtime, Audio agents                                                         |
| Guardrails           | Prevent irrelevant, harmful, or undesirable behavior.                                          | Moderation, Instruction hierarchy (Python), Instruction hierarchy (TypeScript)                   |
| Orchestration        | Develop, deploy, monitor, and improve agents.                                                  | Python Agents SDK, TypeScript Agents SDK, Tracing, Evaluations, Fine-tuning                      |
| Voice agents         | Create agents that can understand audio and respond back in natural language.                  | Realtime API, Voice support in the Python Agents SDK, Voice support in the TypeScript Agents SDK |

## Models

| Model          | Agentic Strengths                                          |
| -------------- | ---------------------------------------------------------- |
| o3 and o4-mini | Best for long-term planning, hard tasks, and reasoning.    |
| GPT-4.1        | Best for agentic execution.                                |
| GPT-4.1-mini   | Good balance of agentic capability and latency.            |
| GPT-4.1-nano   | Best for low-latency.                                      |
| GPT-5          | Best model for coding and agentic tasks across industries. |

Large language models (LLMs) are at the core of many agentic systems, responsible for making decisions and interacting with the world. OpenAI’s models support a wide range of capabilities:

- **High intelligence:** Capable of [reasoning](/docs/guides/reasoning) and planning to tackle the most difficult tasks.
- **Tools:** [Call your functions](/docs/guides/function-calling) and leverage OpenAI's [built-in tools](/docs/guides/tools).
- **Multimodal capabilities:** Natively understand text, images, audio, code, and documents.
- **Low-latency:** Support for [real-time audio](/docs/guides/realtime) conversations and smaller, faster models.

For detailed model comparisons, visit the [models](/docs/models) page.

## Tools

Tools enable agents to interact with the world. OpenAI supports [**function calling**](/docs/guides/function-calling) to connect with your code, and [**built-in tools**](/docs/guides/tools) for common tasks like web searches and data retrieval.

| Tool             | Description                                    |
| ---------------- | ---------------------------------------------- |
| Function calling | Interact with developer-defined code.          |
| Web search       | Fetch up-to-date information from the web.     |
| File search      | Perform semantic search across your documents. |
| Computer use     | Understand and control a computer or browser.  |
| Local shell      | Execute commands on a local machine.           |

## Knowledge and memory

Knowledge and memory help agents store, retrieve, and utilize information beyond their initial training data. **Vector stores** enable agents to search your documents semantically and retrieve relevant information at runtime. Meanwhile, **embeddings** represent data efficiently for quick retrieval, powering dynamic knowledge solutions and long-term agent memory. You can integrate your data using OpenAI’s [vector stores](/docs/guides/retrieval#vector-stores) and [Embeddings API](/docs/guides/embeddings).

## Guardrails

Guardrails ensure your agents behave safely, consistently, and within your intended boundaries—critical for production deployments. Use OpenAI’s free [Moderation API](/docs/guides/moderation) to automatically filter unsafe content. Further control your agent’s behavior by leveraging the instruction hierarchy, which prioritizes developer-defined prompts and mitigates unwanted agent behaviors.

## Orchestration

Building agents is a process. OpenAI provides tools to effectively build, deploy, monitor, evaluate, and improve agentic systems.

![Agent Traces UI in OpenAI Dashboard](https://cdn.openai.com/API/docs/images/orchestration.png)

| Phase                | Description                                                                                     | OpenAI Primitives                        |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Build and deploy     | Rapidly build agents, enforce guardrails, and handle conversational flows using the Agents SDK. | Agents SDK Python, Agents SDK TypeScript |
| Monitor              | Observe agent behavior in real-time, debug issues, and gain insights through tracing.           | Tracing                                  |
| Evaluate and improve | Measure agent performance, identify areas for improvement, and refine your agents.              | EvaluationsFine-tuning                   |

## Get started

Python

```bash
pip install openai-agents
```

View the documentation

Check out our documentation for more information on how to get started with the Agents SDK for Python.

View the Python repository

The OpenAI Agents SDK for Python is open source. Check out our repository for implementation details and a collection of examples.

TypeScript/JavaScript

```bash
npm install @openai/agents
```

View the documentation

Check out our documentation for more information on how to get started with the Agents SDK for TypeScript.

Check out the code

The OpenAI Agents SDK for TypeScript is open source. Check out our repository for implementation details and a collection of examples.

---

OpenAI Agents SDK
The OpenAI Agents SDK enables you to build agentic AI apps in a lightweight, easy-to-use package with very few abstractions. It's a production-ready upgrade of our previous experimentation for agents, Swarm. The Agents SDK has a very small set of primitives:

Agents, which are LLMs equipped with instructions and tools
Handoffs, which allow agents to delegate to other agents for specific tasks
Guardrails, which enable validation of agent inputs and outputs
Sessions, which automatically maintains conversation history across agent runs
In combination with Python, these primitives are powerful enough to express complex relationships between tools and agents, and allow you to build real-world applications without a steep learning curve. In addition, the SDK comes with built-in tracing that lets you visualize and debug your agentic flows, as well as evaluate them and even fine-tune models for your application.

Why use the Agents SDK
The SDK has two driving design principles:

Enough features to be worth using, but few enough primitives to make it quick to learn.
Works great out of the box, but you can customize exactly what happens.
Here are the main features of the SDK:

Agent loop: Built-in agent loop that handles calling tools, sending results to the LLM, and looping until the LLM is done.
Python-first: Use built-in language features to orchestrate and chain agents, rather than needing to learn new abstractions.
Handoffs: A powerful feature to coordinate and delegate between multiple agents.
Guardrails: Run input validations and checks in parallel to your agents, breaking early if the checks fail.
Sessions: Automatic conversation history management across agent runs, eliminating manual state handling.
Function tools: Turn any Python function into a tool, with automatic schema generation and Pydantic powered validation.
Tracing: Built-in tracing that lets you visualize, debug and monitor your workflows, as well as use the OpenAI suite of evaluation, fine-tuning and distillation tools.
Installation

pip install openai-agents
Hello world example

from agents import Agent, Runner

agent = Agent(name="Assistant", instructions="You are a helpful assistant")

result = Runner.run_sync(agent, "Write a haiku about recursion in programming.")
print(result.final_output)

Code within the code,
Functions calling themselves,
Infinite loop's dance.

(If running this, ensure you set the OPENAI_API_KEY environment variable)

export OPENAI_API_KEY=sk-...

---

OpenAI Agents SDK TypeScript
Quickstart
Build your first agent in minutes.

Let’s build
Text Agent
Voice Agent
import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'Assistant',
instructions: 'You are a helpful assistant.',
});

const result = await run(
agent,
'Write a haiku about recursion in programming.',
);

console.log(result.finalOutput);

Overview
The OpenAI Agents SDK for TypeScript enables you to build agentic AI apps in a lightweight, easy-to-use package with very few abstractions. It’s a production-ready upgrade of our previous experimentation for agents, Swarm, that’s also available in Python. The Agents SDK has a very small set of primitives:

Agents, which are LLMs equipped with instructions and tools
Handoffs, which allow agents to delegate to other agents for specific tasks
Guardrails, which enable the inputs to agents to be validated
In combination with TypeScript, these primitives are powerful enough to express complex relationships between tools and agents, and allow you to build real-world applications without a steep learning curve. In addition, the SDK comes with built-in tracing that lets you visualize and debug your agentic flows, as well as evaluate them and even fine-tune models for your application.

Why use the Agents SDK
The SDK has two driving design principles:

Enough features to be worth using, but few enough primitives to make it quick to learn.
Works great out of the box, but you can customize exactly what happens.
Here are the main features of the SDK:

Agent loop: Built-in agent loop that handles calling tools, sending results to the LLM, and looping until the LLM is done.
TypeScript-first: Use built-in language features to orchestrate and chain agents, rather than needing to learn new abstractions.
Handoffs: A powerful feature to coordinate and delegate between multiple agents.
Guardrails: Run input validations and checks in parallel to your agents, breaking early if the checks fail.
Function tools: Turn any TypeScript function into a tool, with automatic schema generation and Zod-powered validation.
Tracing: Built-in tracing that lets you visualize, debug and monitor your workflows, as well as use the OpenAI suite of evaluation, fine-tuning and distillation tools.
Realtime Agents: Build powerful voice agents including automatic interruption detection, context management, guardrails, and more.
Installation
Terminal window
npm install @openai/agents zod@3

Hello world example
Hello World
import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'Assistant',
instructions: 'You are a helpful assistant',
});

const result = await run(
agent,
'Write a haiku about recursion in programming.',
);
console.log(result.finalOutput);

// Code within the code,
// Functions calling themselves,
// Infinite loop's dance.

(If running this, ensure you set the OPENAI_API_KEY environment variable)

Terminal window
export OPENAI_API_KEY=sk-...

---

Quickstart
Project Setup
Create a project and initialize npm. You’ll only need to do this once.

Terminal window
mkdir my_project
cd my_project
npm init -y

Install the Agents SDK.

Terminal window
npm install @openai/agents zod@3

Set an OpenAI API key. If you don’t have one, follow these instructions to create an OpenAI API key.

Terminal window
export OPENAI_API_KEY=sk-...

Alternatively you can call setDefaultOpenAIKey('<api key>') to set the key programmatically and use setTracingExportApiKey('<api key>') for tracing. See the config guide for more details.

Alternatively you can call setDefaultOpenAIKey('your-api-key') to set the key programmatically and use setTracingExportApiKey('your-api-key') for tracing. See the config guide for more details.
Agents are defined with instructions and a name.

import { Agent } from '@openai/agents';

const agent = new Agent({
name: 'History Tutor',
instructions:
'You provide assistance with historical queries. Explain important events and context clearly.',
});

Run your first agent
You can use the run method to run your agent. You trigger a run by passing both the agent you want to start on and the input you want to pass in.

This will return a result that contains the final output and any actions that were performed during that run.

import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'History Tutor',
instructions:
'You provide assistance with historical queries. Explain important events and context clearly.',
});

const result = await run(agent, 'When did sharks first appear?');

console.log(result.finalOutput);

Give your agent tools
You can give an agent tools to use to look up information or perform actions.

import { Agent, tool } from '@openai/agents';

const historyFunFact = tool({
// The name of the tool will be used by the agent to tell what tool to use.
name: 'history_fun_fact',
// The description is used to describe **when** to use the tool by telling it **what** it does.
description: 'Give a fun fact about a historical event',
// This tool takes no parameters, so we provide an empty Zod Object.
parameters: z.object({}),
execute: async () => {
// The output will be returned back to the Agent to use
return 'Sharks are older than trees.';
},
});

const agent = new Agent({
name: 'History Tutor',
instructions:
'You provide assistance with historical queries. Explain important events and context clearly.',
// Adding the tool to the agent
tools: [historyFunFact],
});

Add a few more agents
Additional agents can be defined similarly to break down problems into smaller parts and have your agent be more focused on the task at hand. It also allows you to use different models for different problems by defining the model on the agent.

const historyTutorAgent = new Agent({
name: 'History Tutor',
instructions:
'You provide assistance with historical queries. Explain important events and context clearly.',
});

const mathTutorAgent = new Agent({
name: 'Math Tutor',
instructions:
'You provide help with math problems. Explain your reasoning at each step and include examples',
});

Define your handoffs
In order to orchestrate between multiple agents, you can define handoffs for an agent. This will enable the agent to pass the conversation on to the next agent. This will happen automatically during the course of a run.

// Using the Agent.create method to ensures type safety for the final output
const triageAgent = Agent.create({
name: 'Triage Agent',
instructions:
"You determine which agent to use based on the user's homework question",
handoffs: [historyTutorAgent, mathTutorAgent],
});

After your run you can see which agent generated the final response by looking at the finalAgent property on the result.

Run the agent orchestration
The Runner is in handling the execution of the invidiual agents, any potential handoffs and tool executions.

The Runner is handling the execution of the individual agents, any potential handoffs and tool executions.

async function main() {
const result = await run(triageAgent, 'What is the capital of France?');
console.log(result.finalOutput);
}

main().catch((err) => console.error(err));

Putting it all together
Let’s put it all together into one full example. Place this into your index.js file and run it.

Quickstart
import { Agent, run } from '@openai/agents';

const historyTutorAgent = new Agent({
name: 'History Tutor',
instructions:
'You provide assistance with historical queries. Explain important events and context clearly.',
});

const mathTutorAgent = new Agent({
name: 'Math Tutor',
instructions:
'You provide help with math problems. Explain your reasoning at each step and include examples',
});

const triageAgent = new Agent({
name: 'Triage Agent',
instructions:
"You determine which agent to use based on the user's homework question",
handoffs: [historyTutorAgent, mathTutorAgent],
});

async function main() {
const result = await run(triageAgent, 'What is the capital of France?');
console.log(result.finalOutput);
}

main().catch((err) => console.error(err));

View your traces
The Agents SDK will automatically generate traces for you. This allows you to review how your agents are operating, what tools they called or which agent they handed off to.

To review what happened during your agent run, navigate to the Trace viewer in the OpenAI Dashboard.

Next steps
Learn how to build more complex agentic flows:

Learn about configuring Agents.
Learn about running agents.
Learn about tools, guardrails, and models.

---

Agents
Agents are the main building‑block of the OpenAI Agents SDK. An Agent is a Large Language Model (LLM) that has been configured with:

Instructions – the system prompt that tells the model who it is and how it should respond.
Model – which OpenAI model to call, plus any optional model tuning parameters.
Tools – a list of functions or APIs the LLM can invoke to accomplish a task.
Basic Agent definition
import { Agent } from '@openai/agents';

const agent = new Agent({
name: 'Haiku Agent',
instructions: 'Always respond in haiku form.',
model: 'o4-mini', // optional – falls back to the default model
});

The rest of this page walks through every Agent feature in more detail.

Basic configuration
The Agent constructor takes a single configuration object. The most commonly‑used properties are shown below.

Property Required Description
name yes A short human‑readable identifier.
instructions yes System prompt (string or function – see Dynamic instructions).
model no Model name or a custom Model implementation.
modelSettings no Tuning parameters (temperature, top_p, etc.).
tools no Array of Tool instances the model can call.
Agent with tools
import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

const getWeather = tool({
name: 'get_weather',
description: 'Return the weather for a given city.',
parameters: z.object({ city: z.string() }),
async execute({ city }) {
return `The weather in ${city} is sunny.`;
},
});

const agent = new Agent({
name: 'Weather bot',
instructions: 'You are a helpful weather bot.',
model: 'o4-mini',
tools: [getWeather],
});

Context
Agents are generic on their context type – i.e. Agent<TContext, TOutput>. The context is a dependency‑injection object that you create and pass to Runner.run(). It is forwarded to every tool, guardrail, handoff, etc. and is useful for storing state or providing shared services (database connections, user metadata, feature flags, …).

Agent with context
import { Agent } from '@openai/agents';

interface Purchase {
id: string;
uid: string;
deliveryStatus: string;
}
interface UserContext {
uid: string;
isProUser: boolean;

// this function can be used within tools
fetchPurchases(): Promise<Purchase[]>;
}

const agent = new Agent<UserContext>({
name: 'Personal shopper',
const agent = new Agent({
});

// Later
import { run } from '@openai/agents';

const result = await run(agent, 'Find me a new pair of running shoes', {
context: { uid: 'abc', isProUser: true, fetchPurchases: async () => [] },
});

Output types
By default, an Agent returns plain text (string). If you want the model to return a structured object you can specify the outputType property. The SDK accepts:

A Zod schema (z.object({...})).
Any JSON‑schema‑compatible object.
Structured output with Zod
import { Agent } from '@openai/agents';
import { z } from 'zod';

const CalendarEvent = z.object({
name: z.string(),
date: z.string(),
participants: z.array(z.string()),
});

const extractor = new Agent({
name: 'Calendar extractor',
instructions: 'Extract calendar events from the supplied text.',
outputType: CalendarEvent,
});

When outputType is provided, the SDK automatically uses structured outputs instead of plain text.

Handoffs
An Agent can delegate to other Agents via the handoffs property. A common pattern is to use a triage agent that routes the conversation to a more specialised sub‑agent.

An Agent can delegate to other Agents via the handoffs property. A common pattern is to use a triage agent that routes the conversation to a more specialized sub‑agent.
import { Agent } from '@openai/agents';

const bookingAgent = new Agent({
name: 'Booking Agent',
instructions: 'Help users with booking requests.',
});

const refundAgent = new Agent({
name: 'Refund Agent',
instructions: 'Process refund requests politely and efficiently.',
});

// Use Agent.create method to ensure the finalOutput type considers handoffs
const triageAgent = Agent.create({
name: 'Triage Agent',
instructions: [
'Help the user with their questions.',
'If the user asks about booking, hand off to the booking agent.',
'If the user asks about refunds, hand off to the refund agent.',
].join('\n'),
handoffs: [bookingAgent, refundAgent],
});

You can read more about this pattern in the handoffs guide.

Dynamic instructions
instructions can be a function instead of a string. The function receives the current RunContext and the Agent instance and can return a string or a Promise<string>.

instructions can be a function instead of a string. The function receives the current RunContext and the Agent instance and can return a string or a Promise of string.
import { Agent, RunContext } from '@openai/agents';

interface UserContext {
name: string;
}

function buildInstructions(runContext: RunContext<UserContext>) {
return `The user's name is ${runContext.context.name}.  Be extra friendly!`;
function buildInstructions(runContext: RunContext) {

const agent = new Agent<UserContext>({
name: 'Personalized helper',
instructions: buildInstructions,
});

Both synchronous and async functions are supported.

Lifecycle hooks
For advanced use‑cases you can observe the Agent lifecycle by listening on events

Agent with lifecycle hooks
import { Agent } from '@openai/agents';

const agent = new Agent({
name: 'Verbose agent',
instructions: 'Explain things thoroughly.',
});

agent.on('agent_start', (ctx, agent) => {
console.log(`[${agent.name}] started`);
});
agent.on('agent_end', (ctx, output) => {
console.log(`[agent] produced:`, output);
});

Guardrails
Guardrails allow you to validate or transform user input and agent output. They are configured via the inputGuardrails and outputGuardrails arrays. See the guardrails guide for details.

Cloning / copying agents
Need a slightly modified version of an existing agent? Use the clone() method, which returns an entirely new Agent instance.

Cloning Agents
import { Agent } from '@openai/agents';

const pirateAgent = new Agent({
name: 'Pirate',
instructions: 'Respond like a pirate – lots of “Arrr!”',
model: 'o4-mini',
});

const robotAgent = pirateAgent.clone({
name: 'Robot',
instructions: 'Respond like a robot – be precise and factual.',
});

Forcing tool use
Supplying tools doesn’t guarantee the LLM will call one. You can force tool use with modelSettings.tool_choice:

'auto' (default) – the LLM decides whether to use a tool.
'required' – the LLM must call a tool (it can choose which one).
'none' – the LLM must not call a tool.
A specific tool name, e.g. 'calculator' – the LLM must call that particular tool.
Forcing tool use
import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

const calculatorTool = tool({
name: 'Calculator',
description: 'Use this tool to answer questions about math problems.',
parameters: z.object({ question: z.string() }),
execute: async (input) => {
throw new Error('TODO: implement this');
},
});

const agent = new Agent({
name: 'Strict tool user',
instructions: 'Always answer using the calculator tool.',
tools: [calculatorTool],
modelSettings: { toolChoice: 'auto' },
});

Preventing infinite loops
After a tool call the SDK automatically resets tool_choice back to 'auto'. This prevents the model from entering an infinite loop where it repeatedly tries to call the tool. You can override this behavior via the resetToolChoice flag or by configuring toolUseBehavior:

'run_llm_again' (default) – run the LLM again with the tool result.
'stop_on_first_tool' – treat the first tool result as the final answer.
{ stopAtToolNames: ['my_tool'] } – stop when any of the listed tools is called.
(context, toolResults) => ... – custom function returning whether the run should finish.
const agent = new Agent({
...,
toolUseBehavior: 'stop_on_first_tool',
});

Next steps
Learn how to run agents.
Dive into tools, guardrails, and models.
Explore the full TypeDoc reference under @openai/agents in the sidebar.

---

Running agents
Agents do nothing by themselves – you run them with the Runner class or the run() utility.

Simple run
import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'Assistant',
instructions: 'You are a helpful assistant',
});

const result = await run(
agent,
'Write a haiku about recursion in programming.',
);
console.log(result.finalOutput);

// Code within the code,
// Functions calling themselves,
// Infinite loop's dance.

When you don’t need a custom runner, you can also use the run() utility, which runs a singleton default Runner instance.

Alternatively, you can create your own runner instance:

Simple run
import { Agent, Runner } from '@openai/agents';

const agent = new Agent({
name: 'Assistant',
instructions: 'You are a helpful assistant',
});

// You can pass custom configuration to the runner
const runner = new Runner();

const result = await runner.run(
agent,
'Write a haiku about recursion in programming.',
);
console.log(result.finalOutput);

// Code within the code,
// Functions calling themselves,
// Infinite loop's dance.

After running your agent, you will receive a result object that contains the final output and the full history of the run.

The agent loop
When you use the run method in Runner, you pass in a starting agent and input. The input can either be a string (which is considered a user message), or a list of input items, which are the items in the OpenAI Responses API.

The runner then runs a loop:

Call the current agent’s model with the current input.
Inspect the LLM response.
Final output → return.
Handoff → switch to the new agent, keep the accumulated conversation history, go to 1.
Tool calls → execute tools, append their results to the conversation, go to 1.
Throw MaxTurnsExceededError once maxTurns is reached.
Note

The rule for whether the LLM output is considered as a “final output” is that it produces text output with the desired type, and there are no tool calls.

Runner lifecycle
Create a Runner when your app starts and reuse it across requests. The instance stores global configuration such as model provider and tracing options. Only create another Runner if you need a completely different setup. For simple scripts you can also call run() which uses a default runner internally.

Run arguments
The input to the run() method is an initial agent to start the run on, input for the run and a set of options.

The input can either be a string (which is considered a user message), or a list of input items, or a RunState object in case you are building a human-in-the-loop agent.

The additional options are:

Option Default Description
stream false If true the call returns a StreamedRunResult and emits events as they arrive from the model.
context – Context object forwarded to every tool / guardrail / handoff. Learn more in the context guide.
maxTurns 10 Safety limit – throws MaxTurnsExceededError when reached.
signal – AbortSignal for cancellation.
Streaming
Streaming allows you to additionally receive streaming events as the LLM runs. Once the stream is started, the StreamedRunResult will contain the complete information about the run, including all the new outputs produces. You can iterate over the streaming events using a for await loop. Read more in the streaming guide.

Run config
If you are creating your own Runner instance, you can pass in a RunConfig object to configure the runner.

Field Type Purpose
model string | Model Force a specific model for all agents in the run.
modelProvider ModelProvider Resolves model names – defaults to the OpenAI provider.
modelSettings ModelSettings Global tuning parameters that override per‑agent settings.
handoffInputFilter HandoffInputFilter Mutates input items when performing handoffs (if the handoff itself doesn’t already define one).
inputGuardrails InputGuardrail[] Guardrails applied to the initial user input.
outputGuardrails OutputGuardrail[] Guardrails applied to the final output.
tracingDisabled boolean Disable OpenAI Tracing completely.
traceIncludeSensitiveData boolean Exclude LLM/tool inputs & outputs from traces while still emitting spans.
workflowName string Appears in the Traces dashboard – helps group related runs.
traceId / groupId string Manually specify the trace or group ID instead of letting the SDK generate one.
traceMetadata Record<string, any> Arbitrary metadata to attach to every span.
Conversations / chat threads
Each call to runner.run() (or run() utility) represents one turn in your application-level conversation. You choose how much of the RunResult you show the end‑user – sometimes only finalOutput, other times every generated item.

Example of carrying over the conversation history
import { Agent, AgentInputItem, run } from '@openai/agents';

let thread: AgentInputItem[] = [];

const agent = new Agent({
name: 'Assistant',
});

async function userSays(text: string) {
const result = await run(
agent,
thread.concat({ role: 'user', content: text }),
);

thread = result.history; // Carry over history + newly generated items
return result.finalOutput;
}

await userSays('What city is the Golden Gate Bridge in?');
// -> "San Francisco"

await userSays('What state is it in?');
// -> "California"

See the chat example for an interactive version.

Exceptions
The SDK throws a small set of errors you can catch:

MaxTurnsExceededError – maxTurns reached.
ModelBehaviorError – model produced invalid output (e.g. malformed JSON, unknown tool).
InputGuardrailTripwireTriggered / OutputGuardrailTripwireTriggered – guardrail violations.
GuardrailExecutionError – guardrails failed to complete.
ToolCallError – any of function tool calls failed.
UserError – any error thrown based on configuration or user input.
All extend the base AgentsError class, which could provide the state property to access the current run state.

Here is an example code that handles GuardrailExecutionError:

Guardrail execution error
import {
Agent,
run,
GuardrailExecutionError,
InputGuardrail,
InputGuardrailTripwireTriggered,
} from '@openai/agents';
import { z } from 'zod';

const guardrailAgent = new Agent({
name: 'Guardrail check',
instructions: 'Check if the user is asking you to do their math homework.',
outputType: z.object({
isMathHomework: z.boolean(),
reasoning: z.string(),
}),
});

const unstableGuardrail: InputGuardrail = {
name: 'Math Homework Guardrail (unstable)',
execute: async () => {
throw new Error('Something is wrong!');
},
};

const fallbackGuardrail: InputGuardrail = {
name: 'Math Homework Guardrail (fallback)',
execute: async ({ input, context }) => {
const result = await run(guardrailAgent, input, { context });
return {
outputInfo: result.finalOutput,
tripwireTriggered: result.finalOutput?.isMathHomework ?? false,
};
},
};

const agent = new Agent({
name: 'Customer support agent',
instructions:
'You are a customer support agent. You help customers with their questions.',
inputGuardrails: [unstableGuardrail],
});

async function main() {
try {
const input = 'Hello, can you help me solve for x: 2x + 3 = 11?';
const result = await run(agent, input);
console.log(result.finalOutput);
} catch (e) {
if (e instanceof GuardrailExecutionError) {
console.error(`Guardrail execution failed: ${e}`);
// If you want to retry the execution with different settings,
// you can reuse the runner's latest state this way:
if (e.state) {
try {
agent.inputGuardrails = [fallbackGuardrail]; // fallback
const result = await run(agent, e.state);
console.log(result.finalOutput);
} catch (ee) {
if (ee instanceof InputGuardrailTripwireTriggered) {
console.log('Math homework guardrail tripped');
}
}
}
} else {
throw e;
}
}
}

main().catch(console.error);

When you run the above example, you will see the following output:

Guardrail execution failed: Error: Input guardrail failed to complete: Error: Something is wrong!
Math homework guardrail tripped

Next steps
Learn how to configure models.
Provide your agents with tools.
Add guardrails or tracing for production readiness.

---

Results
When you run your agent, you will either receive a:

RunResult if you call run without stream: true
StreamedRunResult if you call run with stream: true. For details on streaming, also check the streaming guide.
Final output
The finalOutput property contains the final output of the last agent that ran. This result is either:

string — default for any agent that has no outputType defined
unknown — if the agent has a JSON schema defined as output type. In this case the JSON was parsed but you still have to verify its type manually.
z.infer<outputType> — if the agent has a Zod schema defined as output type. The output will automatically be parsed against this schema.
undefined — if the agent did not produce an output (for example stopped before it could produce an output)
z.infer of outputType — if the agent has a Zod schema defined as output type. The output will automatically be parsed against this schema.

This will enable the SDK to infer the output types across all possible handoffs and provide a union type for the finalOutput property.

For example:

Handoff final output types
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

const refundAgent = new Agent({
name: 'Refund Agent',
instructions:
'You are a refund agent. You are responsible for refunding customers.',
outputType: z.object({
refundApproved: z.boolean(),
}),
});

const orderAgent = new Agent({
name: 'Order Agent',
instructions:
'You are an order agent. You are responsible for processing orders.',
outputType: z.object({
orderId: z.string(),
}),
});

const triageAgent = Agent.create({
name: 'Triage Agent',
instructions:
'You are a triage agent. You are responsible for triaging customer issues.',
handoffs: [refundAgent, orderAgent],
'You are a triage agent. You are responsible for sorting customer issues.',

const result = await run(triageAgent, 'I need to a refund for my order');

const output = result.finalOutput;
// ^? { refundApproved: boolean } | { orderId: string } | string | undefined

Inputs for the next turn
There are two ways you can access the inputs for your next turn:

result.history — contains a copy of both your input and the output of the agents.
result.output — contains the output of the full agent run.
history is a convenient way to maintain a full history in a chat-like use case:

History loop
import { AgentInputItem, Agent, user, run } from '@openai/agents';

const agent = new Agent({
name: 'Assistant',
instructions:
'You are a helpful assistant knowledgeable about recent AGI research.',
});

let history: AgentInputItem[] = [
// initial message
user('Are we there yet?'),
];

for (let i = 0; i < 10; i++) {
// run 10 times
const result = await run(agent, history);

// update the history to the new output
history = result.history;

history.push(user('How about now?'));
}

Last agent
The lastAgent property contains the last agent that ran. Depending on your application, this is often useful for the next time the user inputs something. For example, if you have a frontline triage agent that hands off to a language-specific agent, you can store the last agent, and reuse it the next time the user messages the agent.

In streaming mode it can also be useful to access the currentAgent property that’s mapping to the current agent that is running.

New items
The newItems property contains the new items generated during the run. The items are RunItems. A run item wraps the raw item generated by the LLM. These can be used to access additionally to the output of the LLM which agent these events were associated with.

RunMessageOutputItem indicates a message from the LLM. The raw item is the message generated.
RunHandoffCallItem indicates that the LLM called the handoff tool. The raw item is the tool call item from the LLM.
RunHandoffOutputItem indicates that a handoff occurred. The raw item is the tool response to the handoff tool call. You can also access the source/target agents from the item.
RunToolCallItem indicates that the LLM invoked a tool.
RunToolCallOutputItem indicates that a tool was called. The raw item is the tool response. You can also access the tool output from the item.
RunReasoningItem indicates a reasoning item from the LLM. The raw item is the reasoning generated.
RunToolApprovalItem indicates that the LLM requested approval for a tool call. The raw item is the tool call item from the LLM.
State
The state property contains the state of the run. Most of what is attached to the result is derived from the state but the state is serializable/deserializable and can also be used as input for a subsequent call to run in case you need to recover from an error or deal with an interruption.

Interruptions
If you are using needsApproval in your agent, your run might trigger some interruptions that you need to handle before continuing. In that case interruptions will be an array of ToolApprovalItems that caused the interruption. Check out the human-in-the-loop guide for more information on how to work with interruptions.

Other information
Raw responses
The rawResponses property contains the raw LLM responses generated by the model during the agent run.

Last response ID
The lastResponseId property contains the ID of the last response generated by the model during the agent run.

Guardrail results
The inputGuardrailResults and outputGuardrailResults properties contain the results of the guardrails, if any. Guardrail results can sometimes contain useful information you want to log or store, so we make these available to you.

Original input
The input property contains the original input you provided to the run method. In most cases you won’t need this, but it’s available in case you do.

---

Tools
Tools let an Agent take actions – fetch data, call external APIs, execute code, or even use a computer. The JavaScript/TypeScript SDK supports four categories:

Hosted tools – run alongside the model on OpenAI servers. (web search, file search, computer use, code interpreter, image generation)
Function tools – wrap any local function with a JSON schema so the LLM can call it.
Agents as tools – expose an entire Agent as a callable tool.
Local MCP servers – attach a Model Context Protocol server running on your machine.

1. Hosted tools
   When you use the OpenAIResponsesModel you can add the following built‑in tools:
1. Hosted tools
   When you use the OpenAIResponsesModel you can add the following built‑in tools:

Tool Type string Purpose
Web search 'web_search' Internet search.
File / retrieval search 'file_search' Query vector stores hosted on OpenAI.
Computer use 'computer' Automate GUI interactions.
Code Interpreter 'code_interpreter' Run code in a sandboxed environment.
Image generation 'image_generation' Generate images based on text.
Hosted tools
import { Agent, webSearchTool, fileSearchTool } from '@openai/agents';

const agent = new Agent({
name: 'Travel assistant',
tools: [webSearchTool(), fileSearchTool('VS_ID')],
});

The exact parameter sets match the OpenAI Responses API – refer to the official documentation for advanced options like rankingOptions or semantic filters.

1. Function tools
   Function tool with Zod parameters
   import { tool } from '@openai/agents';
   import { z } from 'zod';

const getWeatherTool = tool({
name: 'get_weather',
description: 'Get the weather for a given city',
parameters: z.object({ city: z.string() }),
async execute({ city }) {
return `The weather in ${city} is sunny.`;
},
});

Options reference
Field Required Description
name No Defaults to the function name (e.g., get_weather).
description Yes Clear, human-readable description shown to the LLM.
parameters Yes Either a Zod schema or a raw JSON schema object. Zod parameters automatically enable strict mode.
strict No When true (default), the SDK returns a model error if the arguments don’t validate. Set to false for fuzzy matching.
execute Yes (args, context) => string | Promise<string>– your business logic. The optional second parameter is theRunContext.
errorFunction No Custom handler (context, error) => string for transforming internal errors into a user-visible string.
execute Yes (args, context) => string | Promise of string – your business logic. The optional second parameter is the RunContext.
If you need the model to guess invalid or partial input you can disable strict mode when using raw JSON schema:

Non-strict JSON schema tools
import { tool } from '@openai/agents';

interface LooseToolInput {
text: string;
}

const looseTool = tool({
description: 'Echo input; be forgiving about typos',
strict: false,
parameters: {
type: 'object',
properties: { text: { type: 'string' } },
required: ['text'],
additionalProperties: true,
},
execute: async (input) => {
// because strict is false we need to do our own verification
if (typeof input !== 'object' || input === null || !('text' in input)) {
return 'Invalid input. Please try again';
}
return (input as LooseToolInput).text;
},
});

3. Agents as tools
   Sometimes you want an Agent to assist another Agent without fully handing off the conversation. Use agent.asTool():
1. Agents as tools
   Agents as tools
   import { Agent } from '@openai/agents';

const summarizer = new Agent({
name: 'Summarizer',
instructions: 'Generate a concise summary of the supplied text.',
});

const summarizerTool = summarizer.asTool({
toolName: 'summarize_text',
toolDescription: 'Generate a concise summary of the supplied text.',
});

const mainAgent = new Agent({
name: 'Research assistant',
tools: [summarizerTool],
});

Under the hood the SDK:

Creates a function tool with a single input parameter.
Runs the sub‑agent with that input when the tool is called.
Returns either the last message or the output extracted by customOutputExtractor. 4. Local MCP servers
You can expose tools via a local Model Context Protocol server and attach them to an agent. Use MCPServerStdio to spawn and connect to the server:

Local MCP server
import { Agent, MCPServerStdio } from '@openai/agents';

const server = new MCPServerStdio({
fullCommand: 'npx -y @modelcontextprotocol/server-filesystem ./sample_files',
});

await server.connect();

const agent = new Agent({
name: 'Assistant',
mcpServers: [server],
});

See filesystem-example.ts for a complete example.

Tool use behavior
Refer to the Agents guide for controlling when and how a model must use tools (tool_choice, toolUseBehavior, etc.).

Best practices
Short, explicit descriptions – describe what the tool does and when to use it.
Validate inputs – use Zod schemas for strict JSON validation where possible.
Avoid side‑effects in error handlers – errorFunction should return a helpful string, not throw.
One responsibility per tool – small, composable tools lead to better model reasoning.
Next steps
Learn about forcing tool use.
Add guardrails to validate tool inputs or outputs.
Dive into the TypeDoc reference for tool() and the various hosted tool types.

---

Orchestrating multiple agents
Orchestration refers to the flow of agents in your app. Which agents run, in what order, and how do they decide what happens next? There are two main ways to orchestrate agents:

Allowing the LLM to make decisions: this uses the intelligence of an LLM to plan, reason, and decide on what steps to take based on that.
Orchestrating via code: determining the flow of agents via your code.
You can mix and match these patterns. Each has their own tradeoffs, described below.

Orchestrating via LLM
An agent is an LLM equipped with instructions, tools and handoffs. This means that given an open-ended task, the LLM can autonomously plan how it will tackle the task, using tools to take actions and acquire data, and using handoffs to delegate tasks to sub-agents. For example, a research agent could be equipped with tools like:

Web search to find information online
File search and retrieval to search through proprietary data and connections
Computer use to take actions on a computer
Code execution to do data analysis
Handoffs to specialized agents that are great at planning, report writing and more.
This pattern is great when the task is open-ended and you want to rely on the intelligence of an LLM. The most important tactics here are:

Invest in good prompts. Make it clear what tools are available, how to use them, and what parameters it must operate within.
Monitor your app and iterate on it. See where things go wrong, and iterate on your prompts.
Allow the agent to introspect and improve. For example, run it in a loop, and let it critique itself; or, provide error messages and let it improve.
Have specialized agents that excel in one task, rather than having a general purpose agent that is expected to be good at anything.
Invest in evals. This lets you train your agents to improve and get better at tasks.
Orchestrating via code
Invest in evaluations. This lets you train your agents to improve and get better at tasks.

Using structured outputs to generate well formed data that you can inspect with your code. For example, you might ask an agent to classify the task into a few categories, and then pick the next agent based on the category.
Chaining multiple agents by transforming the output of one into the input of the next. You can decompose a task like writing a blog post into a series of steps - do research, write an outline, write the blog post, critique it, and then improve it.
Running the agent that performs the task in a while loop with an agent that evaluates and provides feedback, until the evaluator says the output passes certain criteria.
Running multiple agents in parallel, e.g. via JavaScript primitives like Promise.all. This is useful for speed when you have multiple tasks that don’t depend on each other.
We have a number of examples in examples/agent-patterns.

---

Handoffs
Handoffs let an agent delegate part of a conversation to another agent. This is useful when different agents specialise in specific areas. In a customer support app for example, you might have agents that handle bookings, refunds or FAQs.

Handoffs let an agent delegate part of a conversation to another agent. This is useful when different agents specialize in specific areas. In a customer support app for example, you might have agents that handle bookings, refunds or FAQs.

Creating a handoff
Every agent accepts a handoffs option. It can contain other Agent instances or Handoff objects returned by the handoff() helper.

Basic usage
Basic handoffs
import { Agent, handoff } from '@openai/agents';

const billingAgent = new Agent({ name: 'Billing agent' });
const refundAgent = new Agent({ name: 'Refund agent' });

// Use Agent.create method to ensure the finalOutput type considers handoffs
const triageAgent = Agent.create({
name: 'Triage agent',
handoffs: [billingAgent, handoff(refundAgent)],
});

Customising handoffs via handoff()
The handoff() function lets you tweak the generated tool.
Customizing handoffs via handoff()
agent – the agent to hand off to.
toolNameOverride – override the default transfer*to*<agent_name> tool name.
toolDescriptionOverride – override the default tool description.
onHandoff – callback when the handoff occurs. Receives a RunContext and optionally parsed input.
inputType – expected input schema for the handoff.
inputFilter – filter the history passed to the next agent.
Customized handoffs
import { Agent, handoff, RunContext } from '@openai/agents';

function onHandoff(ctx: RunContext) {
console.log('Handoff called');
}

const agent = new Agent({ name: 'My agent' });

const handoffObj = handoff(agent, {
onHandoff,
toolNameOverride: 'custom_handoff_tool',
toolDescriptionOverride: 'Custom description',
});

Handoff inputs
Sometimes you want the LLM to provide data when invoking a handoff. Define an input schema and use it in handoff().

Handoff inputs
import { z } from 'zod';
import { Agent, handoff, RunContext } from '@openai/agents';

const EscalationData = z.object({ reason: z.string() });
type EscalationData = z.infer<typeof EscalationData>;

type EscalationData = z.infer of typeof EscalationData;
ctx: RunContext<EscalationData>,
input: EscalationData | undefined,
ctx: RunContext,
console.log(`Escalation agent called with reason: ${input?.reason}`);
}

const agent = new Agent<EscalationData>({ name: 'Escalation agent' });

const agent = new Agent({ name: 'Escalation agent' });
onHandoff,
inputType: EscalationData,
});

Input filters
By default a handoff receives the entire conversation history. To modify what gets passed to the next agent, provide an inputFilter. Common helpers live in @openai/agents-core/extensions.

Input filters
import { Agent, handoff } from '@openai/agents';
import { removeAllTools } from '@openai/agents-core/extensions';

const agent = new Agent({ name: 'FAQ agent' });

const handoffObj = handoff(agent, {
inputFilter: removeAllTools,
});

Recommended prompts
LLMs respond more reliably when your prompts mention handoffs. The SDK exposes a recommended prefix via RECOMMENDED_PROMPT_PREFIX.

Recommended prompts
import { Agent } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';

const billingAgent = new Agent({
name: 'Billing agent',
instructions: `${RECOMMENDED_PROMPT_PREFIX}
Fill in the rest of your prompt here.`,
});

---

Context management
Context is an overloaded term. There are two main classes of context you might care about:

Local context that your code can access during a run: dependencies or data needed by tools, callbacks like onHandoff, and lifecycle hooks.
Agent/LLM context that the language model can see when generating a response.
Local context
Local context is represented by the RunContext<T> type. You create any object to hold your state or dependencies and pass it to Runner.run(). All tool calls and hooks receive a RunContext wrapper so they can read from or modify that object.

Local context is represented by the RunContext type. You create any object to hold your state or dependencies and pass it to Runner.run(). All tool calls and hooks receive a RunContext wrapper so they can read from or modify that object.
import { Agent, run, RunContext, tool } from '@openai/agents';
import { z } from 'zod';

interface UserInfo {
name: string;
uid: number;
}

const fetchUserAge = tool({
name: 'fetch_user_age',
description: 'Return the age of the current user',
parameters: z.object({}),
execute: async (
\_args,
runContext?: RunContext<UserInfo>,
): Promise<string> => {
runContext?: RunContext,
): Promise => {
});

async function main() {
const userInfo: UserInfo = { name: 'John', uid: 123 };

const agent = new Agent<UserInfo>({
name: 'Assistant',
const agent = new Agent({
});

const result = await run(agent, 'What is the age of the user?', {
context: userInfo,
});

console.log(result.finalOutput);
// The user John is 47 years old.
}

if (require.main === module) {
main().catch(console.error);
}

Every agent, tool and hook participating in a single run must use the same type of context.

Use local context for things like:

Data about the run (user name, IDs, etc.)
Dependencies such as loggers or data fetchers
Helper functions
Note

The context object is not sent to the LLM. It is purely local and you can read from or write to it freely.

Agent/LLM context
When the LLM is called, the only data it can see comes from the conversation history. To make additional information available you have a few options:

Add it to the Agent instructions – also known as a system or developer message. This can be a static string or a function that receives the context and returns a string.
Include it in the input when calling Runner.run(). This is similar to the instructions technique but lets you place the message lower in the chain of command.
Expose it via function tools so the LLM can fetch data on demand.
Use retrieval or web search tools to ground responses in relevant data from files, databases, or the web.

---

Guardrails
Guardrails run in parallel to your agents, allowing you to perform checks and validations on user input or agent output. For example, you may run a lightweight model as a guardrail before invoking an expensive model. If the guardrail detects malicious usage, it can trigger an error and stop the costly model from running.

There are two kinds of guardrails:

Input guardrails run on the initial user input.
Output guardrails run on the final agent output.
Input guardrails
Input guardrails run in three steps:

The guardrail receives the same input passed to the agent.
The guardrail function executes and returns a GuardrailFunctionOutput wrapped inside an InputGuardrailResult.
If tripwireTriggered is true, an InputGuardrailTripwireTriggered error is thrown.
Note Input guardrails are intended for user input, so they only run if the agent is the first agent in the workflow. Guardrails are configured on the agent itself because different agents often require different guardrails.

Output guardrails
Output guardrails follow the same pattern:

The guardrail receives the same input passed to the agent.
The guardrail function executes and returns a GuardrailFunctionOutput wrapped inside an OutputGuardrailResult.
If tripwireTriggered is true, an OutputGuardrailTripwireTriggered error is thrown.
Note Output guardrails only run if the agent is the last agent in the workflow. For realtime voice interactions see the voice agents guide.

Tripwires
When a guardrail fails, it signals this via a tripwire. As soon as a tripwire is triggered, the runner throws the corresponding error and halts execution.

Implementing a guardrail
A guardrail is simply a function that returns a GuardrailFunctionOutput. Below is a minimal example that checks whether the user is asking for math homework help by running another agent under the hood.

Input guardrail example
import {
Agent,
run,
InputGuardrailTripwireTriggered,
InputGuardrail,
} from '@openai/agents';
import { z } from 'zod';

const guardrailAgent = new Agent({
name: 'Guardrail check',
instructions: 'Check if the user is asking you to do their math homework.',
outputType: z.object({
isMathHomework: z.boolean(),
reasoning: z.string(),
}),
});

const mathGuardrail: InputGuardrail = {
name: 'Math Homework Guardrail',
execute: async ({ input, context }) => {
const result = await run(guardrailAgent, input, { context });
return {
outputInfo: result.finalOutput,
tripwireTriggered: result.finalOutput?.isMathHomework ?? false,
};
},
};

const agent = new Agent({
name: 'Customer support agent',
instructions:
'You are a customer support agent. You help customers with their questions.',
inputGuardrails: [mathGuardrail],
});

async function main() {
try {
await run(agent, 'Hello, can you help me solve for x: 2x + 3 = 11?');
console.log("Guardrail didn't trip - this is unexpected");
} catch (e) {
if (e instanceof InputGuardrailTripwireTriggered) {
console.log('Math homework guardrail tripped');
}
}
}

main().catch(console.error);

Output guardrails work the same way.

Output guardrail example
import {
Agent,
run,
OutputGuardrailTripwireTriggered,
OutputGuardrail,
} from '@openai/agents';
import { z } from 'zod';

// The output by the main agent
const MessageOutput = z.object({ response: z.string() });
type MessageOutput = z.infer<typeof MessageOutput>;

type MessageOutput = z.infer of typeof MessageOutput;
const MathOutput = z.object({ reasoning: z.string(), isMath: z.boolean() });

// The guardrail agent
const guardrailAgent = new Agent({
name: 'Guardrail check',
instructions: 'Check if the output includes any math.',
outputType: MathOutput,
});

// An output guardrail using an agent internally
const mathGuardrail: OutputGuardrail<typeof MessageOutput> = {
name: 'Math Guardrail',
const mathGuardrail: OutputGuardrail = {
const result = await run(guardrailAgent, agentOutput.response, {
context,
});
return {
outputInfo: result.finalOutput,
tripwireTriggered: result.finalOutput?.isMath ?? false,
};
},
};

const agent = new Agent({
name: 'Support agent',
instructions:
'You are a user support agent. You help users with their questions.',
outputGuardrails: [mathGuardrail],
outputType: MessageOutput,
});

async function main() {
try {
const input = 'Hello, can you help me solve for x: 2x + 3 = 11?';
await run(agent, input);
console.log("Guardrail didn't trip - this is unexpected");
} catch (e) {
if (e instanceof OutputGuardrailTripwireTriggered) {
console.log('Math output guardrail tripped');
}
}
}

main().catch(console.error);

guardrailAgent is used inside the guardrail functions.
The guardrail function receives the agent input or output and returns the result.
Extra information can be included in the guardrail result.
agent defines the actual workflow where guardrails are applied.

---

Streaming
The Agents SDK can deliver output from the model and other execution steps incrementally. Streaming keeps your UI responsive and avoids waiting for the entire final result before updating the user.

Enabling streaming
Pass a { stream: true } option to Runner.run() to obtain a streaming object rather than a full result:

Enabling streaming
import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'Storyteller',
instructions:
'You are a storyteller. You will be given a topic and you will tell a story about it.',
});

const result = await run(agent, 'Tell me a story about a cat.', {
stream: true,
});

When streaming is enabled the returned stream implements the AsyncIterable interface. Each yielded event is an object describing what happened within the run. The stream yields one of three event types, each describing a different part of the agent’s execution. Most applications only want the model’s text though, so the stream provides helpers.

Get the text output
Call stream.toTextStream() to obtain a stream of the emitted text. When compatibleWithNodeStreams is true the return value is a regular Node.js Readable. We can pipe it directly into process.stdout or another destination.

Logging out the text as it arrives
import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'Storyteller',
instructions:
'You are a storyteller. You will be given a topic and you will tell a story about it.',
});

const result = await run(agent, 'Tell me a story about a cat.', {
stream: true,
});

result
.toTextStream({
compatibleWithNodeStreams: true,
})
.pipe(process.stdout);

The promise stream.completed resolves once the run and all pending callbacks are completed. Always await it if you want to ensure there is no more output.

Listen to all events
You can use a for await loop to inspect each event as it arrives. Useful information includes low level model events, any agent switches and SDK specific run information:

Listening to all events
import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'Storyteller',
instructions:
'You are a storyteller. You will be given a topic and you will tell a story about it.',
});

const result = await run(agent, 'Tell me a story about a cat.', {
stream: true,
});

for await (const event of result) {
// these are the raw events from the model
if (event.type === 'raw_model_stream_event') {
console.log(`${event.type} %o`, event.data);
}
// agent updated events
if (event.type === 'agent_updated_stream_event') {
console.log(`${event.type} %s`, event.agent.name);
}
// Agent SDK specific events
if (event.type === 'run_item_stream_event') {
console.log(`${event.type} %o`, event.item);
}
}

See the streamed example for a fully worked script that prints both the plain text stream and the raw event stream.

Event types
The stream yields three different event types:

raw_model_stream_event
type RunRawModelStreamEvent = {
type: 'raw_model_stream_event';
data: ResponseStreamEvent;
};

Example:

{
"type": "raw_model_stream_event",
"data": {
"type": "output_text_delta",
"delta": "Hello"
}
}

run_item_stream_event
type RunItemStreamEvent = {
type: 'run_item_stream_event';
name: RunItemStreamEventName;
item: RunItem;
};

Example handoff payload:

{
"type": "run_item_stream_event",
"name": "handoff_occurred",
"item": {
"type": "handoff_call",
"id": "h1",
"status": "completed",
"name": "transfer_to_refund_agent"
}
}

agent_updated_stream_event
type RunAgentUpdatedStreamEvent = {
type: 'agent_updated_stream_event';
agent: Agent<any, any>;
};

Example:

{
"type": "agent_updated_stream_event",
"agent": {
"name": "Refund Agent"
}
}

Human in the loop while streaming
Streaming is compatible with handoffs that pause execution (for example when a tool requires approval). The interruption field on the stream object exposes the interruptions, and you can continue execution by calling state.approve() or state.reject() for each of them. Executing again with { stream: true } resumes streaming output.

Handling human approval while streaming
import { Agent, run } from '@openai/agents';

const agent = new Agent({
name: 'Storyteller',
instructions:
'You are a storyteller. You will be given a topic and you will tell a story about it.',
});

let stream = await run(
agent,
'What is the weather in San Francisco and Oakland?',
{ stream: true },
);
stream.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);
await stream.completed;

while (stream.interruptions?.length) {
console.log(
'Human-in-the-loop: approval required for the following tool calls:',
);
const state = stream.state;
for (const interruption of stream.interruptions) {
const approved = confirm(
`Agent ${interruption.agent.name} would like to use the tool ${interruption.rawItem.name} with "${interruption.rawItem.arguments}". Do you approve?`,
);
if (approved) {
state.approve(interruption);
} else {
state.reject(interruption);
}
}

// Resume execution with streaming output
stream = await run(agent, state, { stream: true });
const textStream = stream.toTextStream({ compatibleWithNodeStreams: true });
textStream.pipe(process.stdout);
await stream.completed;
}

A fuller example that interacts with the user is human-in-the-loop-stream.ts.

Tips
Remember to wait for stream.completed before exiting to ensure all output has been flushed.
The initial { stream: true } option only applies to the call where it is provided. If you re-run with a RunState you must specify the option again.
If your application only cares about the textual result prefer toTextStream() to avoid dealing with individual event objects.
With streaming and the event system you can integrate an agent into a chat interface, terminal application or any place where users benefit from incremental updates.

---

Tracing
The Agents SDK includes built-in tracing, collecting a comprehensive record of events during an agent run: LLM generations, tool calls, handoffs, guardrails, and even custom events that occur. Using the Traces dashboard, you can debug, visualize, and monitor your workflows during development and in production.

Note

Tracing is enabled by default. There are two ways to disable tracing:

You can globally disable tracing by setting the env var OPENAI_AGENTS_DISABLE_TRACING=1
You can disable tracing for a single run by setting RunConfig.tracingDisabled to true
For organizations operating under a Zero Data Retention (ZDR) policy using OpenAI’s APIs, tracing is unavailable.

Export loop lifecycle
In most environments traces will automatically be exported on a regular interval. In the browser or in Cloudflare Workers, this functionality is disabled by default. Traces will still get exported if too many are queued up but they are not exported on a regular interval. Instead you should use getGlobalTraceProvider().forceFlush() to manually export the traces as part of your code’s lifecycle.

For example, in a Cloudflare Worker, you should wrap your code into a try/catch/finally block and use force flush with waitUntil to ensure that traces are exported before the worker exits.

import { getGlobalTraceProvider } from '@openai/agents';

export default {
async fetch(request, env, ctx): Promise<Response> {
try {
async fetch(request, env, ctx): Promise {
return new Response(`success`);
} catch (error) {
console.error(error);
return new Response(String(error), { status: 500 });
} finally {
// make sure to flush any remaining traces before exiting
ctx.waitUntil(getGlobalTraceProvider().forceFlush());
}
},
};

Traces and spans
Traces represent a single end-to-end operation of a “workflow”. They’re composed of Spans. Traces have the following properties:
workflow*name: This is the logical workflow or app. For example “Code generation” or “Customer service”.
trace_id: A unique ID for the trace. Automatically generated if you don’t pass one. Must have the format trace*<32_alphanumeric>.
group_id: Optional group ID, to link multiple traces from the same conversation. For example, you might use a chat thread ID.
disabled: If True, the trace will not be recorded.
metadata: Optional metadata for the trace.
Spans represent operations that have a start and end time. Spans have:
started_at and ended_at timestamps.
trace_id, to represent the trace they belong to
parent_id, which points to the parent Span of this Span (if any)
span_data, which is information about the Span. For example, AgentSpanData contains information about the Agent, GenerationSpanData contains information about the LLM generation, etc.
Default tracing
By default, the SDK traces the following:

The entire run() or Runner.run() is wrapped in a Trace.
Each time an agent runs, it is wrapped in AgentSpan
LLM generations are wrapped in GenerationSpan
Function tool calls are each wrapped in FunctionSpan
Guardrails are wrapped in GuardrailSpan
Handoffs are wrapped in HandoffSpan
By default, the trace is named “Agent workflow”. You can set this name if you use withTrace, or you can can configure the name and other properties with the RunConfig.workflowName.

In addition, you can set up custom trace processors to push traces to other destinations (as a replacement, or secondary destination).

Voice agent tracing
If you are using RealtimeAgent and RealtimeSession with the default OpenAI Realtime API, tracing will automatically happen on the Realtime API side unless you disable it on the RealtimeSession using tracingDisabled: true or using the OPENAI_AGENTS_DISABLE_TRACING environment variable.

Check out the Voice agents guide for more details.

Higher level traces
Sometimes, you might want multiple calls to run() to be part of a single trace. You can do this by wrapping the entire code in a withTrace().

import { Agent, run, withTrace } from '@openai/agents';

const agent = new Agent({
name: 'Joke generator',
instructions: 'Tell funny jokes.',
});

await withTrace('Joke workflow', async () => {
const result = await run(agent, 'Tell me a joke');
const secondResult = await run(
agent,
`Rate this joke: ${result.finalOutput}`,
);
console.log(`Joke: ${result.finalOutput}`);
console.log(`Rating: ${secondResult.finalOutput}`);
});

Because the two calls to run are wrapped in a withTrace(), the individual runs will be part of the overall trace rather than creating two traces.
Creating traces
You can use the withTrace() function to create a trace. Alternatively, you can use getGlobalTraceProvider().createTrace() to create a new trace manually and pass it into withTrace().

The current trace is tracked via a Node.js AsyncLocalStorage or the respective environment polyfills. This means that it works with concurrency automatically.

Creating spans
You can use the various create\*Span() (e.g. createGenerationSpan(), createFunctionSpan(), etc.) methods to create a span. In general, you don’t need to manually create spans. A createCustomSpan() function is available for tracking custom span information.

Spans are automatically part of the current trace, and are nested under the nearest current span, which is tracked via a Node.js AsyncLocalStorage or the respective environment polyfills.

Sensitive data
Certain spans may capture potentially sensitive data.

The createGenerationSpan() stores the inputs/outputs of the LLM generation, and createFunctionSpan() stores the inputs/outputs of function calls. These may contain sensitive data, so you can disable capturing that data via RunConfig.traceIncludeSensitiveData .

Custom tracing processors
The high level architecture for tracing is:

At initialization, we create a global TraceProvider, which is responsible for creating traces and can be accessed through getGlobalTraceProvider().
We configure the TraceProvider with a BatchTraceProcessor that sends traces/spans in batches to a OpenAITracingExporter, which exports the spans and traces to the OpenAI backend in batches.
To customize this default setup, to send traces to alternative or additional backends or modifying exporter behavior, you have two options:

addTraceProcessor() lets you add an additional trace processor that will receive traces and spans as they are ready. This lets you do your own processing in addition to sending traces to OpenAI’s backend.
setTraceProcessors() lets you replace the default processors with your own trace processors. This means traces will not be sent to the OpenAI backend unless you include a TracingProcessor that does so.
External tracing processors list
AgentOps
Keywords AI

---

TypeScript SDK
Get started with the AgentOps TypeScript SDK for Node.js applications

​
TypeScript SDK
AgentOps provides TypeScript/JavaScript support through two SDK options:
​
Modern TypeScript SDK (Recommended)
The modern TypeScript SDK is built on OpenTelemetry standards and provides comprehensive instrumentation for AI agents.
​
Installation

Copy
npm install agentops
​
Quick Start

Copy
import { agentops } from 'agentops';

// Initialize with environment variable AGENTOPS_API_KEY
await agentops.init();

// Or pass API key explicitly
await agentops.init({
apiKey: 'your-api-key'
});

// Your AI agent code here - instrumentation happens automatically!
​
Features
🔌 Plugin Architecture: Dynamic loading and configuration of instrumentors
🤖 GenAI Support: Built-in support for OpenTelemetry GenAI semantic conventions
📊 Standards Compliant: Exports to any OpenTelemetry-compatible collector
🛠️ Framework Agnostic: Instrument multiple agent frameworks simultaneously
🔧 TypeScript First: Full TypeScript support with comprehensive type definitions
​
OpenAI Agents Integration
The SDK provides first-class support for the OpenAI Agents SDK:

Copy
import { agentops } from 'agentops';
import { Agent, run } from '@openai/agents';

// Initialize AgentOps first
await agentops.init();

// Create your agent with tools and instructions
const agent = new Agent({
name: 'My Assistant',
instructions: 'You are a helpful assistant.',
tools: [/*your tools*/],
});

// Run the agent - instrumentation happens automatically
const result = await run(agent, "Hello, how can you help me?");
console.log(result.finalOutput);
Automatically captures:
Agent Lifecycle: Track agent creation, execution, and completion
LLM Generation: Capture model requests, responses, and token usage
Function Calls: Monitor tool usage and function execution
Audio Processing: Observe speech-to-text and text-to-speech operations
Handoffs: Track agent-to-agent communication and workflow transitions
​
Debug Logging
Enable detailed instrumentation logs:

Copy
DEBUG=agentops:\* node your-app.js
​
Legacy TypeScript SDK (Alpha)
The legacy TypeScript SDK has limited functionality compared to the Python SDK. The modern TypeScript SDK above is recommended for new projects.
​
Installation

Copy
npm install agentops
​
Usage

Copy
import OpenAI from "openai";
import { Client } from 'agentops';

const openai = new OpenAI();

const agentops = new Client({
apiKey: "your-agentops-api-key",
tags: ["typescript", "example"],
patchApi: [openai] // Automatically record OpenAI calls
});

// Sample OpenAI call (automatically recorded)
async function chat() {
const completion = await openai.chat.completions.create({
messages: [
{ "role": "system", "content": "You are a helpful assistant." },
{ "role": "user", "content": "Hello!" }
],
model: "gpt-3.5-turbo",
});
return completion;
}

// Track custom functions
function customFunction(x: string) {
console.log(x);
return 5;
}

const wrappedFunction = agentops.wrap(customFunction);
wrappedFunction("hello");

// Run your agent
chat().then(() => {
agentops.endSession("Success");
});
​
Repository Links
Modern SDK: agentops-ts
Legacy SDK: agentops-node
​
Getting Help
Discord Community
GitHub Issues
Documentation

---

OpenAI Agents SDK
TS/JS

Copy page

Build multi-agent workflows with the OpenAI Agents SDK and Keywords AI.

This integration is only for Agent tracing. If you are looking for the OpenAI integration with the AI gateway, please see the OpenAI integration.
Give us a star on GitHub!
The OpenAI Agents SDK is a lightweight yet powerful framework for building multi-agent workflows in JavaScript/TypeScript.

Keywords AI agent tracing with OpenAI Agents SDK.

Agents: LLMs configured with instructions, tools, and guardrails
Handoffs: Transfer control between specialized agents
Guardrails: Safety checks for input and output validation
Tracing: Built-in tracking of agent runs for debugging and optimization
​
Getting started
​
Prerequisites
Install the required dependencies:

Copy
npm install @openai/agents

Copy
npm install @keywordsai/exporter-openai-agents
For function calling examples, also install:

Copy
npm install zod
Set up your environment variables in a .env file:
.env

Copy
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
KEYWORDSAI_API_KEY=YOUR_KEYWORDSAI_API_KEY
KEYWORDSAI_BASE_URL=<https://api.keywordsai.co/api>
If you are on the enterprise platform, please use the enterprise endpoint plus the suffix.
​
Hello world
helloworld.ts

Copy
import { Agent, BatchTraceProcessor, run, setTraceProcessors, withTrace } from '@openai/agents';
import { KeywordsAIOpenAIAgentsTracingExporter } from '@keywordsai/exporter-openai-agents';

setTraceProcessors([
new BatchTraceProcessor(
new KeywordsAIOpenAIAgentsTracingExporter(),
),
]);

async function main() {
const agent = new Agent({
name: 'Assistant',
instructions: 'You only respond in haikus.',
});

const result = await withTrace('Hello World', async () => {
return run(agent, 'Tell me about recursion in programming.');
});
console.log(result.finalOutput);
}

main().catch(console.error);
Run the example:

Copy
npx tsx helloworld.ts
​
Full example
Here’s a more comprehensive example with multiple agents:
full-example.ts

Copy
import { Agent, BatchTraceProcessor, run, setTraceProcessors, withTrace } from '@openai/agents';
import { KeywordsAIOpenAIAgentsTracingExporter } from '@keywordsai/exporter-openai-agents';

setTraceProcessors([
new BatchTraceProcessor(
new KeywordsAIOpenAIAgentsTracingExporter(),
),
]);

const agent = new Agent({
model: "gpt-4o-mini",
name: "Apple Agent",
instructions: "You are a helpful assistant who knows about apples.",
});

const secondAgent = new Agent({
model: "gpt-4o-mini",
name: "Banana Agent",
instructions: "You are a helpful assistant who knows about bananas.",
});

async function main() {
await withTrace("My Trace", async () => {
const response = await run(agent, "Hello, what fruit do you like?");
console.log(response.finalOutput);

    const secondResponse = await run(secondAgent, "Hello, what fruit do you like?");
    console.log(secondResponse.finalOutput);

});
}

main().catch(console.error);
Run the example:

Copy
npx tsx full-example.ts
​
Advanced features
​
Metadata support
You can add custom metadata (properties) to your traces for better tracking and debugging:
metadata-example.ts

Copy
import { Agent, BatchTraceProcessor, run, setTraceProcessors, withTrace } from '@openai/agents';
import { KeywordsAIOpenAIAgentsTracingExporter } from '@keywordsai/exporter-openai-agents';

setTraceProcessors([
new BatchTraceProcessor(
new KeywordsAIOpenAIAgentsTracingExporter(),
),
]);

const agent = new Agent({
model: "gpt-4o-mini",
name: "Apple Agent",
instructions: "You are a helpful assistant who knows about apples.",
});

const secondAgent = new Agent({
model: "gpt-4o-mini",
name: "Banana Agent",
instructions: "You are a helpful assistant who knows about bananas.",
});

async function main() {
await withTrace("My Trace", async () => {
const response = await run(agent, "Hello, what fruit do you like?");
console.log(response.finalOutput);
const secondResponse = await run(secondAgent, "Hello, what fruit do you like?");
console.log(secondResponse.finalOutput);
}, {
metadata: {
foo: "bar",
}
});
}

main().catch(console.error);
Run the example:

Copy
npx tsx metadata-example.ts
​
Function Calling
Agents can use tools to perform specific tasks. Here’s an example with a weather tool:
function_call.ts

Copy
import { Agent, BatchTraceProcessor, run, setTraceProcessors, tool, withTrace } from '@openai/agents';
import { KeywordsAIOpenAIAgentsTracingExporter } from '@keywordsai/exporter-openai-agents';
import { z } from 'zod';

setTraceProcessors([
new BatchTraceProcessor(
new KeywordsAIOpenAIAgentsTracingExporter(),
),
]);

const getWeather = tool({
name: 'get_weather',
description: 'Get the weather for a city.',
parameters: z.object({ city: z.string() }),
execute: async ({ city }): Promise<{ city: string; temperatureRange: string; conditions: string }> => {
return {
city,
temperatureRange: '14-20C',
conditions: 'Sunny with wind.',
};
},
});

const agent = new Agent({
name: "Hello world",
instructions: "You are a helpful agent.",
tools: [getWeather],
});

async function main() {
const result = await withTrace("What's the weather in Tokyo?", async () => {
return run(agent, "What's the weather in Tokyo?");
});
console.log(result.finalOutput);
}

main().catch(console.error);
Run the example:

Copy
npx tsx function_call.ts
​
Agent Handoffs
Agents can hand off conversations to other specialized agents based on context:
handoff.ts

Copy
import { Agent, BatchTraceProcessor, run, setTraceProcessors, withTrace } from '@openai/agents';
import { KeywordsAIOpenAIAgentsTracingExporter } from '@keywordsai/exporter-openai-agents';

setTraceProcessors([
new BatchTraceProcessor(
new KeywordsAIOpenAIAgentsTracingExporter(),
),
]);

const spanish_agent = new Agent({
name: "Spanish agent",
instructions: "You only speak Spanish.",
});

const english_agent = new Agent({
name: "English agent",
instructions: "You only speak English",
});

const triage_agent = new Agent({
name: "Triage agent",
instructions: "Handoff to the appropriate agent based on the language of the request.",
handoffs: [spanish_agent, english_agent],
});

async function main() {
const result = await withTrace("Handoff Example", async () => {
return run(triage_agent, "Hola, ¿cómo estás?");
});
console.log(result.finalOutput);
}

main().catch(console.error);
Run the example:

Copy
npx tsx handoff.ts
The resulting trace root span will have the custom properties visible in the Keywords AI platform:
