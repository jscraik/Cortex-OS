# Open-Source AI Agent Frameworks: Which One Is Right for You?

Explore the leading open-source AI agent frameworks—LangGraph, OpenAI Agents SDK, Smolagents, CrewAI, AutoGen, Semantic Kernel, LlamaIndex agents, Strands Agents, and Pydantic AI agents. Compare features, learn when to use each, and see how to track agent behavior with Langfuse

<!-- markdownlint-disable MD033 -->
<!-- cSpell:words Smolagents Pydantic Langfuse Jannik Maierhöfer skillset chatbots logfire asyncio LANGFUSE contextvars startswith criticlevel cómo estás SmolAgents -->

Picture Jannik Maierhöfer
Jannik Maierhöfer
Building AI agents used to be a patchwork of scripts, prompt engineering, and trial-and-error. Today, there is a growing landscape of open-source frameworks designed to streamline the process of creating agents that reason, plan, and execute tasks autonomously. This post offers an in-depth look at some of the leading open-source AI agent frameworks out there: LangGraph, the OpenAI Agents SDK, Smolagents, CrewAI, AutoGen, Semantic Kernel, LlamaIndex agents, Strands Agents, and Pydantic AI agents. By the time you finish reading, you should have a clearer view of each framework’s sweet spot, how they differ, and where they excel in real-world development.

One of the biggest challenges in agent development is striking the right balance between giving the AI enough autonomy to handle tasks dynamically and maintaining enough structure for reliability. Each framework has its own philosophy, from explicit graph-based workflows to lightweight code-driven agents. We’ll walk through their core ideas, trace how they might fit into your workflow, and examine how you can integrate them with monitoring solutions like Langfuse (GitHub) to evaluate and debug them to make sure they perform in production.

🦜 LangGraph
LangGraph extends the well-known LangChain library into a graph-based architecture that treats agent steps like nodes in a directed acyclic graph. Each node handles a prompt or sub-task, and edges control data flow and transitions. This is helpful for complex, multi-step tasks where you need precise control over branching and error handling. LangGraph’s DAG philosophy makes it easier to visualize or debug how decisions flow from one step to another, and you still inherit a ton of useful tooling and integrations from LangChain.

Example trace in Langfuse

How to trace LangGraph agents with Langfuse →

Developers who prefer to model AI tasks in stateful workflows often gravitate toward LangGraph. If your application demands robust task decomposition, parallel branching, or the ability to inject custom logic at specific stages, you might find LangGraph’s explicit approach a good fit.

OpenAI Agents SDK
The OpenAI Agents SDK is the latest entrant in the field. It packages OpenAI’s capabilities into a more structured toolset for building agents that can reason, plan, and call external APIs or functions. By providing a specialized agent runtime and a straightforward API for assigning roles, tools, and triggers, OpenAI aims to simplify multi-step or multi-agent orchestration. While it’s still evolving, developers appreciate the familiar style of prompts and the native integration with OpenAI’s model endpoints.

Example trace in Langfuse

How to trace the OpenAI Agents SDK with Langfuse →

If you are already deep into OpenAI’s stack and want an officially supported solution to spin up agents that utilize GPT-4o or GPT-o3, the OpenAI Agents SDK might be your first stop.

🤗 Smolagents
Hugging Face’s smolagents takes a radically simple, code-centric approach. Instead of juggling complex multi-step prompts or advanced orchestration, smolagents sets up a minimal loop where the agent writes and executes code to achieve a goal. It’s ideal for scenarios where you want a small, self-contained agent that can call Python libraries or run quick computations without building an entire DAG or multi-agent conversation flow. That minimalism is the chief selling point: you can define a few lines of configuration and let the model figure out how to call your chosen tools or libraries.

Smolagents Example trace in Langfuse

Example trace in Langfuse

How to trace smolagents with Langfuse →

If you value fast setup and want to watch your AI generate Python code on the fly, smolagents provides a neat solution. It handles the “ReAct” style prompting behind the scenes, so you can focus on what the agent should do rather than how it strings its reasoning steps together.

CrewAI
CrewAI is all about role-based collaboration among multiple agents. Imagine giving each agent a distinct skillset or personality, then letting them cooperate (or even debate) to solve a problem. This framework offers a higher-level abstraction called a “Crew,” which is basically a container for multiple agents that each has a role or function. The Crew coordinates workflows, allowing these agents to share context and build upon one another’s contributions. I like CrewAI as it is easy to configure while still letting you attach advanced memory and error-handling logic.

CrewAI trace visualization in Langfuse

Example trace in Langfuse

How to trace CrewAI agents with Langfuse →

If your use case calls for a multi-agent approach—like a “Planner” agent delegating tasks to a “Researcher” and “Writer” agent—CrewAI makes that easy. The built-in memory modules and fluid user experience have led to growing adoption where collaboration and parallelization of tasks are important.

AutoGen
AutoGen, born out of Microsoft Research, frames everything as an asynchronous conversation among specialized agents. Each agent can be a ChatGPT-style assistant or a tool executor, and you orchestrate how they pass messages back and forth. This asynchronous approach reduces blocking, making it well-suited for longer tasks or scenarios where an agent needs to wait on external events. Developers who like the idea of “multiple LLMs in conversation” may find AutoGen’s event-driven approach nice, especially for dynamic dialogues that need real-time concurrency or frequent role switching.

AutoGen trace visualization in Langfuse

Example trace in Langfuse

How to trace AutoGen agents with Langfuse →

AutoGen is good if you’re building an agent that heavily relies on multi-turn conversations and real-time tool invocation. It supports free-form chat among many agents and is backed by a research-driven community that consistently introduces new conversation patterns.

Semantic Kernel
Semantic Kernel is Microsoft’s .NET-first approach to orchestrating AI “skills” and combining them into full-fledged plans or workflows. It supports multiple programming languages (C#, Python, Java) and focuses on enterprise readiness, such as security, compliance, and integration with Azure services. Instead of limiting you to a single orchestrator, you can create a range of “skills,” some powered by AI, others by pure code, and combine them. This design makes it popular among teams that want to embed AI into existing business processes without a complete rewrite of their tech stack.

Semantic Kernel trace visualization in Langfuse

Example trace in Langfuse

How to trace Semantic Kernel with Langfuse →

If you want a more formal approach that merges AI with non-AI services, Semantic Kernel is a strong bet. It has a structured “Planner” abstraction that can handle multi-step tasks, making it well-suited for mission-critical enterprise apps.

🦙 LlamaIndex Agents
LlamaIndex started as a retrieval-augmented generation solution for powering chatbots with large document sets. Over time, it added agent-like capabilities to chain queries and incorporate external knowledge sources. LlamaIndex agents are good when your primary need is to retrieve data from local or external stores and fuse that information into coherent answers or actions. The tooling around indexing data, chunking text, and bridging your LLM with a knowledge base is top-notch, and that data-centric approach extends into the agent layer.

LlamaIndex Agents trace visualization in Langfuse

Example trace in Langfuse

How to trace LlamaIndex Agents with Langfuse →

If you’re solving data-heavy tasks—like question answering on private documents, summarizing large repositories, or building a specialized search agent—LlamaIndex agents could be exactly what you need. The development experience feels intuitive if you’ve already used LlamaIndex for retrieval, and it pairs nicely with other frameworks that focus on orchestration.

Strands Agents
Strands Agents SDK is a model-agnostic agent framework that runs anywhere and supports multiple model providers with reasoning and tool use, including Amazon Bedrock, Anthropic, OpenAI, Ollama, and others via LiteLLM. It emphasizes production readiness with first-class OpenTelemetry tracing and optional deep AWS integrations. This gives you end-to-end observability with a clean, declarative API for defining agent behavior. For a deeper technical overview of its agent architectures and observability, see AWS’s technical deep dive.

Strands Agents trace visualization in Langfuse

Example trace in Langfuse

How to trace Strands Agents with Langfuse →

Strands Agents runs anywhere (AWS, other clouds, or on-prem). If you’re on AWS, you can opt into deep Bedrock integrations; otherwise, use any provider (Anthropic, OpenAI, Ollama, etc.) via LiteLLM—while still pairing nicely with Langfuse’s observability pipeline.

🐍 Pydantic AI Agents
Pydantic AI brings Pydantic’s famous type safety and ergonomic developer experience to agent development. You define your agent’s inputs, tool signatures, and outputs as Python types, and the framework handles validation plus OpenTelemetry instrumentation under the hood. The result is FastAPI-style DX for GenAI applications.

Pydantic AI trace visualization in Langfuse

Example trace in Langfuse

How to trace Pydantic AI with Langfuse →

If you’re a Python developer who values explicit type contracts, tests, and quick feedback loops, Pydantic AI offers a lightweight yet powerful path to building production-ready agents with minimal boilerplate.

Comparison Table
Framework Core Paradigm Primary Strength Best For
LangGraph Graph-based workflow of prompts Explicit DAG control, branching, debugging Complex multi-step tasks with branching, advanced error handling
OpenAI Agents SDK High-level OpenAI toolchain Integrated tools such as web and file search Teams relying on OpenAI’s ecosystem who want official support & specialized features
Smolagents Code-centric minimal agent loop Simple setup, direct code execution Quick automation tasks without heavy orchestration overhead
CrewAI Multi-agent collaboration (crews) Parallel role-based workflows, memory Complex tasks requiring multiple specialists working together
AutoGen Asynchronous multi-agent chat Live conversations, event-driven Scenarios needing real-time concurrency, multiple LLM “voices” interacting
Semantic Kernel Skill-based, enterprise integrations Multi-language, enterprise compliance Enterprise settings, .NET ecosystems, or large orgs needing robust skill orchestration
LlamaIndex Agents RAG with integrated indexing Retrieval + agent synergy Use-cases that revolve around extensive data lookup, retrieval, and knowledge fusion
Strands Agents Model-agnostic agent toolkit Runs anywhere; multi-model via LiteLLM; strong OTEL observability Teams needing provider-flexible agents (Bedrock, Anthropic, OpenAI, Ollama) with production tracing
Pydantic AI Type-safe Python agent framework Strong type safety & FastAPI-style DX Python developers wanting structured, validated agent logic
As you can see there are very different approaches to these agent frameworks. Graph-based solutions like LangGraph give you precise control, while conversation-based solutions like AutoGen give you natural, flexible dialogues. Role-based orchestration from CrewAI can tackle complex tasks through a “cast” of specialized agents, whereas Smolagents is ideal for minimal code-driven patterns. Semantic Kernel is positioned in the enterprise space, and LlamaIndex Agents shine for retrieval-centric applications. The OpenAI Agents SDK appeals to users already confident in the OpenAI stack. Strands Agents is model-agnostic with optional deep AWS integrations, and Pydantic AI is tailored for Python environments.

When to Use Each Framework
Rather than prescribing a specific tool, it’s more important to focus on the high-level variables that should guide your decision:

Task Complexity and Workflow Structure:
Determine whether your task is simple or requires complex, multi-step reasoning. Complex workflows may benefit from explicit orchestration (like a graph-based or skill-based approach), whereas simpler tasks might be well served by a lightweight, code-centric solution.

Collaboration and Multi-Agents:
Check if your project needs multiple agents with distinct roles interacting in a coordinated way. Multi-agent collaboration might require an architecture that supports asynchronous conversations and role delegation.

Integrations:
Consider the environments and systems your agents need to interact with. Some frameworks provide easier integration for tool calling, while others are designed for rapid prototyping and minimal setup.

Performance and Scalability
Think about the performance demands of your application. High concurrency and real-time interactions may necessitate an event-driven architecture. Observability tools become crucial here, allowing you to trace agent behavior and optimize performance over time.

Below’s a Mermaid flowchart outlining some of the key decision. However, please note that this is not an exhaustive list and framework abilities might overlap (e.g. OpenAI Agents SDK can be used for multi-agent workflows).

Yes

No

RAG-based retrieval (doc search)

Code-gen agent (lightweight)

Generic OpenAI approach

Provider-flexible agent SDK

Graph-based & fine-grained control

Role-based, collaborative crew

Provider-flexible with OTEL

Conversation-based (chat & tool calls)

Planner-based (multi-step task)

Structured flows, DAG, or roles

Start

Do you need
multiple agents?

Preferred multi-agent style?

Single-agent approach?

LlamaIndex
(Retrieving data)

SmolAgents
(Small code approach)

OpenAI Agents SDK

Strands Agents
(Model-agnostic)

Workflow approach

LangGraph
(DAG of nodes)

CrewAI
(Multi-role synergy)

AutoGen (Microsoft)

Semantic Kernel (Microsoft)

Why Agent Tracing and Observability Matter
Agent frameworks involve a lot of moving parts. Each agent can call external APIs, retrieve data, or make decisions that branch into new sub-tasks. Keeping track of what happened, why it happened, and how it happened is vital, especially in production.

Observability tools like Langfuse let you capture, visualize, and analyze agent “traces” so you can see each prompt, response, and tool call in a structured timeline. This insight makes debugging far simpler and helps you refine prompts, measure performance, and ensure your AI behaves as expected.

---

---

source: ⚠️ Jupyter Notebook
title: Trace the OpenAI Agents SDK with Langfuse
sidebarTitle: OpenAI Agents
logo: /images/integrations/openai_icon.svg
description: Learn how to use Langfuse to monitor OpenAI Agents SDK to debug and evaluate your AI agents
category: Integrations

---

# Trace the OpenAI Agents SDK with Langfuse

This notebook demonstrates how to **integrate Langfuse** into your **OpenAI Agents** workflow to monitor, debug and evaluate your AI agents.

> **What is the OpenAI Agents SDK?**: The [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) is a lightweight, open-source framework that lets developers build AI agents and orchestrate multi-agent workflows. It provides building blocks—such as tools, handoffs, and guardrails to configure large language models with custom instructions and integrated tools. Its Python-first design supports dynamic instructions and function tools for rapid prototyping and integration with external systems.

> **What is Langfuse?**: [Langfuse](https://langfuse.com/) is an open-source observability platform for AI agents. It helps you visualize and monitor LLM calls, tool usage, cost, latency, and more.

## 1. Install Dependencies

Below we install the `openai-agents` library (the OpenAI Agents SDK), and the `pydantic-ai[logfire]` OpenTelemetry instrumentation.

```python
%pip install openai-agents langfuse nest_asyncio "pydantic-ai[logfire]"
```

## 2. Configure Environment & Langfuse Credentials

Next, set up your Langfuse API keys. You can get these keys by signing up for a free [Langfuse Cloud](https://cloud.langfuse.com/) account or by [self-hosting Langfuse](https://langfuse.com/self-hosting). These environment variables are essential for the Langfuse client to authenticate and send data to your Langfuse project.

```python
import os

# Get keys for your project from the project settings page: https://cloud.langfuse.com
os.environ["LANGFUSE_PUBLIC_KEY"] = "pk-lf-..."
os.environ["LANGFUSE_SECRET_KEY"] = "sk-lf-..."
os.environ["LANGFUSE_HOST"] = "https://cloud.langfuse.com" # 🇪🇺 EU region
# os.environ["LANGFUSE_HOST"] = "https://us.cloud.langfuse.com" # 🇺🇸 US region

# Your openai key
os.environ["OPENAI_API_KEY"] = "sk-proj-..."
```

## 3. Instrumenting the Agent

Pydantic Logfire offers an instrumentation for the OpenAi Agent SDK. We use this to send traces to Langfuse.

```python
import nest_asyncio
nest_asyncio.apply()
```

```python
import logfire

# Configure logfire instrumentation.
logfire.configure(
    service_name='my_agent_service',
    send_to_logfire=False,
)
# This method automatically patches the OpenAI Agents SDK to send logs via OTLP to Langfuse.
logfire.instrument_openai_agents()
```

Now initialize the Langfuse client. `get_client()` initializes the Langfuse client using the credentials provided in the environment variables.

```python
from langfuse import get_client

langfuse = get_client()

# Verify connection
if langfuse.auth_check():
    print("Langfuse client is authenticated and ready!")
else:
    print("Authentication failed. Please check your credentials and host.")
```

## 4. Hello World Example

Below we create an **OpenAI Agent** that always replies in **haiku** form. We run it with `Runner.run` and print the final output.

```python
import asyncio
from agents import Agent, Runner

async def main():
    agent = Agent(
        name="Assistant",
        instructions="You only respond in haikus.",
    )

    result = await Runner.run(agent, "Tell me about recursion in programming.")
    print(result.final_output)

loop = asyncio.get_running_loop()
await loop.create_task(main())
```

![Example trace in Langfuse](https://langfuse.com/images/cookbook/integration_openai-agents/openai-agent-example-trace.png)

**Example**: [Langfuse Trace](https://cloud.langfuse.com/project/cloramnkj0002jz088vzn1ja4/traces/019593c7330da67c08219bd1c75b7a6d?timestamp=2025-03-14T08%3A31%3A00.365Z&observation=81e525d819153eed)

Clicking the link above (or your own project link) lets you view all sub-spans, token usage, latencies, etc., for debugging or optimization.

## 5. Multi-agent Handoff Example

Here we create:

- A **Spanish agent** that responds only in Spanish.
- An **English agent** that responds only in English.
- A **Triage agent** that routes the request to the correct agent based on the input language.

Any calls or handoffs are captured as part of the trace. That way, you can see which sub-agent or tool was used, as well as the final result.

```python
from agents import Agent, Runner
import asyncio

spanish_agent = Agent(
    name="Spanish agent",
    instructions="You only speak Spanish.",
)

english_agent = Agent(
    name="English agent",
    instructions="You only speak English",
)

triage_agent = Agent(
    name="Triage agent",
    instructions="Handoff to the appropriate agent based on the language of the request.",
    handoffs=[spanish_agent, english_agent],
)

result = await Runner.run(triage_agent, input="Hola, ¿cómo estás?")
print(result.final_output)
```

![Example trace in Langfuse](https://langfuse.com/images/cookbook/integration_openai-agents/openai-agent-example-trace-handoff.png)

**Example**: [Langfuse Trace](https://cloud.langfuse.com/project/cloramnkj0002jz088vzn1ja4/traces/019593c74429a6d0489e9259703a1148?timestamp=2025-03-14T08%3A31%3A04.745Z&observation=e83609282c443b0d)

## 6. Functions Example

The OpenAI Agents SDK allows the agent to call Python functions. With Langfuse instrumentation, you can see which **functions** are called, their arguments, and the return values. Here we define a simple function `get_weather(city: str)` and add it as a tool.

```python
import asyncio
from agents import Agent, Runner, function_tool

# Example function tool.
@function_tool
def get_weather(city: str) -> str:
    return f"The weather in {city} is sunny."

agent = Agent(
    name="Hello world",
    instructions="You are a helpful agent.",
    tools=[get_weather],
)

async def main():
    result = await Runner.run(agent, input="What's the weather in Tokyo?")
    print(result.final_output)

loop = asyncio.get_running_loop()
await loop.create_task(main())
```

![Example trace in Langfuse](https://langfuse.com/images/cookbook/integration_openai-agents/openai-agent-example-trace-function.png)

**Example**: [Langfuse Trace](https://cloud.langfuse.com/project/cloramnkj0002jz088vzn1ja4/traces/019593c74a162f93387d9261b01f9ca9?timestamp=2025-03-14T08%3A31%3A06.262Z&observation=0e2988966786cdf4)

When viewing the trace, you’ll see a span capturing the function call `get_weather` and the arguments passed.

## 7. Grouping Agent Runs

In some workflows, you want to group multiple calls into a single trace—for instance, when building a small chain of prompts that all relate to the same user request. You can use a `trace(...)` context manager to nest multiple calls under one top-level trace.

```python
from agents import Agent, Runner, trace
import asyncio

async def main():
    agent = Agent(name="Joke generator", instructions="Tell funny jokes.")

    with trace("Joke workflow"):
        first_result = await Runner.run(agent, "Tell me a joke")
        second_result = await Runner.run(agent, f"Rate this joke: {first_result.final_output}")
        print(f"Joke: {first_result.final_output}")
        print(f"Rating: {second_result.final_output}")

loop = asyncio.get_running_loop()
await loop.create_task(main())
```

![Example trace in Langfuse](https://langfuse.com/images/cookbook/integration_openai-agents/openai-agent-example-trace-grouped.png)

**Example**: [Langfuse Trace](https://cloud.langfuse.com/project/cloramnkj0002jz088vzn1ja4/traces/019593c7523686ff7667b85673d033bf?timestamp=2025-03-14T08%3A31%3A08.342Z&observation=d69e377f62b1d331)

Each child call is represented as a sub-span under the top-level **Joke workflow** span, making it easy to see the entire conversation or sequence of calls.

> **Note:** This method links the Langfuse Prompt to all generation spans in the trace that start with the defined string (see next cell).

<Callout type="info" emoji="⚠️">
**Limitation:** This method links the Langfuse Prompt to all generation spans in the trace that start with the defined string (see next cell).
</Callout>

```python
from contextvars import ContextVar
from typing import Optional
from opentelemetry import context as context_api
from opentelemetry.sdk.trace.export import Span, SpanProcessor

prompt_info_var = ContextVar("prompt_info", default=None)

class LangfuseProcessor(SpanProcessor):
    def on_start(
        self,
        span: 'Span',
        parent_context: Optional[context_api.Context] = None,
    ) -> None:
        if span.name.startswith('Responses API'): # The name of the generation spans in your OpenAI Agent trace
            prompt_info = prompt_info_var.get()
            if prompt_info:
                span.set_attribute('langfuse.prompt.name', prompt_info.get("name"))
                span.set_attribute('langfuse.prompt.version', prompt_info.get("version"))
```

```python
import logfire
from langfuse import get_client

logfire.configure(
    service_name='my_agent_service',
    additional_span_processors=[LangfuseProcessor()], # Passing the LangfuseProcessor to the logfire configuration will automatically link the prompt to the trace
    send_to_logfire=False,
)

logfire.instrument_openai_agents()
langfuse = get_client()
```

```python
# Fetch the prompt from Langfuse Prompt Management
langfuse_prompt = langfuse.get_prompt("movie-critic")
system_prompt = langfuse_prompt.compile(criticlevel = "expert", movie = "Dune 2")

# Pass the prompt to the SpanProcessor
prompt_info_var.set({
    "name": langfuse_prompt.name,
    "version": langfuse_prompt.version,
})

# Run the agent ...
```

## Resources

- [Example notebook on evaluating agents](https://langfuse.com/guides/cookbook/example_evaluating_openai_agents) with Langfuse.

import { Tabs, Cards } from "nextra/components";
import {
FileText,
ClipboardCheck,
Scale,
Database,
LayoutDashboard,
TestTube,
} from "lucide-react";

## Interoperability with the Python SDK

You can use this integration together with the Langfuse [Python SDK](/docs/sdk/python/sdk-v3) to add additional attributes to the trace.

<Tabs items={["Decorator", "Context Manager"]}>
<Tabs.Tab>

The [`@observe()` decorator](/docs/sdk/python/sdk-v3#observe-decorator) provides a convenient way to automatically wrap your instrumented code and add additional attributes to the trace.

```python
from langfuse import observe, get_client

langfuse = get_client()

@observe()
def my_instrumented_function(input):
    output = my_llm_call(input)

    langfuse.update_current_trace(
        input=input,
        output=output,
        user_id="user_123",
        session_id="session_abc",
        tags=["agent", "my-trace"],
        metadata={"email": "user@langfuse.com"},
        version="1.0.0"
    )

    return output
```

Learn more about using the Decorator in the [Python SDK](/docs/sdk/python/sdk-v3#observe-decorator) docs.

</Tabs.Tab>
<Tabs.Tab>

The [Context Manager](/docs/sdk/python/sdk-v3#context-managers) allows you to wrap your instrumented code using context managers (with `with` statements), which allows you to add additional attributes to the trace.

```python
from langfuse import get_client

langfuse = get_client()

with langfuse.start_as_current_span(name="my-trace") as span:

    # Run your application here
    output = my_llm_call(input)

    # Pass additional attributes to the span
    span.update_trace(
        input=input,
        output=output,
        user_id="user_123",
        session_id="session_abc",
        tags=["agent", "my-trace"],
        metadata={"email": "user@langfuse.com"},
        version="1.0.0"
        )

# Flush events in short-lived applications
langfuse.flush()
```

Learn more about using the Context Manager in the [Python SDK](/sdk-v3#context-managers) docs.

</Tabs.Tab>
</Tabs>

## Next Steps

Once you have instrumented your code, you can manage, evaluate and debug your application:

import { Tabs, Cards } from "nextra/components";
import {
FileText,
ClipboardCheck,
Scale,
Database,
LayoutDashboard,
TestTube,
## Next Steps

- [Manage prompts in Langfuse](/docs/prompts/get-started)
- [Add evaluation scores](/docs/evaluation/features/evaluation-methods/custom-scores)
- [Run LLM-as-a-judge Evaluators](/docs/scores/model-based-evals)
- [Create datasets](/docs/datasets/overview)
- [Create custom dashboards](/docs/analytics/custom-dashboards)
- [Test queries in the Playground](/docs/playground)
/>
</Cards>
