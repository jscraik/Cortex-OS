Multi-Agent Systems in ADK¶
As agentic applications grow in complexity, structuring them as a single, monolithic agent can become challenging to develop, maintain, and reason about. The Agent Development Kit (ADK) supports building sophisticated applications by composing multiple, distinct BaseAgent instances into a Multi-Agent System (MAS).

In ADK, a multi-agent system is an application where different agents, often forming a hierarchy, collaborate or coordinate to achieve a larger goal. Structuring your application this way offers significant advantages, including enhanced modularity, specialization, reusability, maintainability, and the ability to define structured control flows using dedicated workflow agents.

You can compose various types of agents derived from BaseAgent to build these systems:

LLM Agents: Agents powered by large language models. (See LLM Agents)
Workflow Agents: Specialized agents (SequentialAgent, ParallelAgent, LoopAgent) designed to manage the execution flow of their sub-agents. (See Workflow Agents)
Custom agents: Your own agents inheriting from BaseAgent with specialized, non-LLM logic. (See Custom Agents)
The following sections detail the core ADK primitives—such as agent hierarchy, workflow agents, and interaction mechanisms—that enable you to construct and manage these multi-agent systems effectively.

1. ADK Primitives for Agent Composition¶
   ADK provides core building blocks—primitives—that enable you to structure and manage interactions within your multi-agent system.

Note

The specific parameters or method names for the primitives may vary slightly by SDK language (e.g., sub_agents in Python, subAgents in Java). Refer to the language-specific API documentation for details.

1.1. Agent Hierarchy (Parent agent, Sub Agents)¶
The foundation for structuring multi-agent systems is the parent-child relationship defined in BaseAgent.

Establishing Hierarchy: You create a tree structure by passing a list of agent instances to the sub_agents argument when initializing a parent agent. ADK automatically sets the parent_agent attribute on each child agent during initialization.
Single Parent Rule: An agent instance can only be added as a sub-agent once. Attempting to assign a second parent will result in a ValueError.
Importance: This hierarchy defines the scope for Workflow Agents and influences the potential targets for LLM-Driven Delegation. You can navigate the hierarchy using agent.parent_agent or find descendants using agent.find_agent(name).

Python
Java

# Conceptual Example: Defining Hierarchy

from google.adk.agents import LlmAgent, BaseAgent

# Define individual agents

greeter = LlmAgent(name="Greeter", model="gemini-2.0-flash")
task_doer = BaseAgent(name="TaskExecutor") # Custom non-LLM agent

# Create parent agent and assign children via sub_agents

coordinator = LlmAgent(
name="Coordinator",
model="gemini-2.0-flash",
description="I coordinate greetings and tasks.",
sub_agents=[ # Assign sub_agents here
greeter,
task_doer
]
)

# Framework automatically sets

# assert greeter.parent_agent == coordinator

# assert task_doer.parent_agent == coordinator

1.2. Workflow Agents as Orchestrators¶
ADK includes specialized agents derived from BaseAgent that don't perform tasks themselves but orchestrate the execution flow of their sub_agents.

SequentialAgent: Executes its sub_agents one after another in the order they are listed.
Context: Passes the same InvocationContext sequentially, allowing agents to easily pass results via shared state.

Python
Java

# Conceptual Example: Sequential Pipeline

from google.adk.agents import SequentialAgent, LlmAgent

step1 = LlmAgent(name="Step1_Fetch", output_key="data") # Saves output to state['data']
step2 = LlmAgent(name="Step2_Process", instruction="Process data from {data}.")

pipeline = SequentialAgent(name="MyPipeline", sub_agents=[step1, step2])

# When pipeline runs, Step2 can access the state['data'] set by Step1

ParallelAgent: Executes its sub_agents in parallel. Events from sub-agents may be interleaved.
Context: Modifies the InvocationContext.branch for each child agent (e.g., ParentBranch.ChildName), providing a distinct contextual path which can be useful for isolating history in some memory implementations.
State: Despite different branches, all parallel children access the same shared session.state, enabling them to read initial state and write results (use distinct keys to avoid race conditions).

Python
Java

# Conceptual Example: Parallel Execution

from google.adk.agents import ParallelAgent, LlmAgent

fetch_weather = LlmAgent(name="WeatherFetcher", output_key="weather")
fetch_news = LlmAgent(name="NewsFetcher", output_key="news")

gatherer = ParallelAgent(name="InfoGatherer", sub_agents=[fetch_weather, fetch_news])

# When gatherer runs, WeatherFetcher and NewsFetcher run concurrently

# A subsequent agent could read state['weather'] and state['news']

LoopAgent: Executes its sub_agents sequentially in a loop.
Termination: The loop stops if the optional max_iterations is reached, or if any sub-agent returns an Event with escalate=True in it's Event Actions.
Context & State: Passes the same InvocationContext in each iteration, allowing state changes (e.g., counters, flags) to persist across loops.

Python
Java

# Conceptual Example: Loop with Condition

from google.adk.agents import LoopAgent, LlmAgent, BaseAgent
from google.adk.events import Event, EventActions
from google.adk.agents.invocation_context import InvocationContext
from typing import AsyncGenerator

class CheckCondition(BaseAgent): # Custom agent to check state
async def \_run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
status = ctx.session.state.get("status", "pending")
is_done = (status == "completed")
yield Event(author=self.name, actions=EventActions(escalate=is_done)) # Escalate if done

process_step = LlmAgent(name="ProcessingStep") # Agent that might update state['status']

poller = LoopAgent(
name="StatusPoller",
max_iterations=10,
sub_agents=[process_step, CheckCondition(name="Checker")]
)

# When poller runs, it executes process_step then Checker repeatedly

# until Checker escalates (state['status'] == 'completed') or 10 iterations pass

1.3. Interaction & Communication Mechanisms¶
Agents within a system often need to exchange data or trigger actions in one another. ADK facilitates this through:

a) Shared Session State (session.state)¶
The most fundamental way for agents operating within the same invocation (and thus sharing the same Session object via the InvocationContext) to communicate passively.

Mechanism: One agent (or its tool/callback) writes a value (context.state['data_key'] = processed_data), and a subsequent agent reads it (data = context.state.get('data_key')). State changes are tracked via CallbackContext.
Convenience: The output_key property on LlmAgent automatically saves the agent's final response text (or structured output) to the specified state key.
Nature: Asynchronous, passive communication. Ideal for pipelines orchestrated by SequentialAgent or passing data across LoopAgent iterations.
See Also: State Management
Invocation Context and temp: State

When a parent agent invokes a sub-agent, it passes the same InvocationContext. This means they share the same temporary (temp:) state, which is ideal for passing data that is only relevant for the current turn.

Python
Java

# Conceptual Example: Using output_key and reading state

from google.adk.agents import LlmAgent, SequentialAgent

agent_A = LlmAgent(name="AgentA", instruction="Find the capital of France.", output_key="capital_city")
agent_B = LlmAgent(name="AgentB", instruction="Tell me about the city stored in {capital_city}.")

pipeline = SequentialAgent(name="CityInfo", sub_agents=[agent_A, agent_B])

# AgentA runs, saves "Paris" to state['capital_city']

# AgentB runs, its instruction processor reads state['capital_city'] to get "Paris"

b) LLM-Driven Delegation (Agent Transfer)¶
Leverages an LlmAgent's understanding to dynamically route tasks to other suitable agents within the hierarchy.

Mechanism: The agent's LLM generates a specific function call: transfer_to_agent(agent_name='target_agent_name').
Handling: The AutoFlow, used by default when sub-agents are present or transfer isn't disallowed, intercepts this call. It identifies the target agent using root_agent.find_agent() and updates the InvocationContext to switch execution focus.
Requires: The calling LlmAgent needs clear instructions on when to transfer, and potential target agents need distinct descriptions for the LLM to make informed decisions. Transfer scope (parent, sub-agent, siblings) can be configured on the LlmAgent.
Nature: Dynamic, flexible routing based on LLM interpretation.

Python
Java

# Conceptual Setup: LLM Transfer

from google.adk.agents import LlmAgent

booking_agent = LlmAgent(name="Booker", description="Handles flight and hotel bookings.")
info_agent = LlmAgent(name="Info", description="Provides general information and answers questions.")

coordinator = LlmAgent(
name="Coordinator",
model="gemini-2.0-flash",
instruction="You are an assistant. Delegate booking tasks to Booker and info requests to Info.",
description="Main coordinator.", # AutoFlow is typically used implicitly here
sub_agents=[booking_agent, info_agent]
)

# If coordinator receives "Book a flight", its LLM should generate

# FunctionCall(name='transfer_to_agent', args={'agent_name': 'Booker'})

# ADK framework then routes execution to booking_agent

c) Explicit Invocation (AgentTool)¶
Allows an LlmAgent to treat another BaseAgent instance as a callable function or Tool.

Mechanism: Wrap the target agent instance in AgentTool and include it in the parent LlmAgent's tools list. AgentTool generates a corresponding function declaration for the LLM.
Handling: When the parent LLM generates a function call targeting the AgentTool, the framework executes AgentTool.run_async. This method runs the target agent, captures its final response, forwards any state/artifact changes back to the parent's context, and returns the response as the tool's result.
Nature: Synchronous (within the parent's flow), explicit, controlled invocation like any other tool.
(Note: AgentTool needs to be imported and used explicitly).

Python
Java

# Conceptual Setup: Agent as a Tool

from google.adk.agents import LlmAgent, BaseAgent
from google.adk.tools import agent_tool
from pydantic import BaseModel

# Define a target agent (could be LlmAgent or custom BaseAgent)

class ImageGeneratorAgent(BaseAgent): # Example custom agent
name: str = "ImageGen"
description: str = "Generates an image based on a prompt." # ... internal logic ...
async def \_run_async_impl(self, ctx): # Simplified run logic
prompt = ctx.session.state.get("image_prompt", "default prompt") # ... generate image bytes ...
image_bytes = b"..."
yield Event(author=self.name, content=types.Content(parts=[types.Part.from_bytes(image_bytes, "image/png")]))

image_agent = ImageGeneratorAgent()
image_tool = agent_tool.AgentTool(agent=image_agent) # Wrap the agent

# Parent agent uses the AgentTool

artist_agent = LlmAgent(
name="Artist",
model="gemini-2.0-flash",
instruction="Create a prompt and use the ImageGen tool to generate the image.",
tools=[image_tool] # Include the AgentTool
)

# Artist LLM generates a prompt, then calls

# FunctionCall(name='ImageGen', args={'image_prompt': 'a cat wearing a hat'})

# Framework calls image_tool.run_async(...), which runs ImageGeneratorAgent

# The resulting image Part is returned to the Artist agent as the tool result

These primitives provide the flexibility to design multi-agent interactions ranging from tightly coupled sequential workflows to dynamic, LLM-driven delegation networks.

2. Common Multi-Agent Patterns using ADK Primitives¶
   By combining ADK's composition primitives, you can implement various established patterns for multi-agent collaboration.

Coordinator/Dispatcher Pattern¶
Structure: A central LlmAgent (Coordinator) manages several specialized sub_agents.
Goal: Route incoming requests to the appropriate specialist agent.
ADK Primitives Used:
Hierarchy: Coordinator has specialists listed in sub_agents.
Interaction: Primarily uses LLM-Driven Delegation (requires clear descriptions on sub-agents and appropriate instruction on Coordinator) or Explicit Invocation (AgentTool) (Coordinator includes AgentTool-wrapped specialists in its tools).

Python
Java

# Conceptual Code: Coordinator using LLM Transfer

from google.adk.agents import LlmAgent

billing_agent = LlmAgent(name="Billing", description="Handles billing inquiries.")
support_agent = LlmAgent(name="Support", description="Handles technical support requests.")

coordinator = LlmAgent(
name="HelpDeskCoordinator",
model="gemini-2.0-flash",
instruction="Route user requests: Use Billing agent for payment issues, Support agent for technical problems.",
description="Main help desk router.", # allow_transfer=True is often implicit with sub_agents in AutoFlow
sub_agents=[billing_agent, support_agent]
)

# User asks "My payment failed" -> Coordinator's LLM should call transfer_to_agent(agent_name='Billing')

# User asks "I can't log in" -> Coordinator's LLM should call transfer_to_agent(agent_name='Support')

Sequential Pipeline Pattern¶
Structure: A SequentialAgent contains sub_agents executed in a fixed order.
Goal: Implement a multi-step process where the output of one step feeds into the next.
ADK Primitives Used:
Workflow: SequentialAgent defines the order.
Communication: Primarily uses Shared Session State. Earlier agents write results (often via output_key), later agents read those results from context.state.

Python
Java

# Conceptual Code: Sequential Data Pipeline

from google.adk.agents import SequentialAgent, LlmAgent

validator = LlmAgent(name="ValidateInput", instruction="Validate the input.", output_key="validation_status")
processor = LlmAgent(name="ProcessData", instruction="Process data if {validation_status} is 'valid'.", output_key="result")
reporter = LlmAgent(name="ReportResult", instruction="Report the result from {result}.")

data_pipeline = SequentialAgent(
name="DataPipeline",
sub_agents=[validator, processor, reporter]
)

# validator runs -> saves to state['validation_status']

# processor runs -> reads state['validation_status'], saves to state['result']

# reporter runs -> reads state['result']

Parallel Fan-Out/Gather Pattern¶
Structure: A ParallelAgent runs multiple sub_agents concurrently, often followed by a later agent (in a SequentialAgent) that aggregates results.
Goal: Execute independent tasks simultaneously to reduce latency, then combine their outputs.
ADK Primitives Used:
Workflow: ParallelAgent for concurrent execution (Fan-Out). Often nested within a SequentialAgent to handle the subsequent aggregation step (Gather).
Communication: Sub-agents write results to distinct keys in Shared Session State. The subsequent "Gather" agent reads multiple state keys.

Python
Java

# Conceptual Code: Parallel Information Gathering

from google.adk.agents import SequentialAgent, ParallelAgent, LlmAgent

fetch_api1 = LlmAgent(name="API1Fetcher", instruction="Fetch data from API 1.", output_key="api1_data")
fetch_api2 = LlmAgent(name="API2Fetcher", instruction="Fetch data from API 2.", output_key="api2_data")

gather_concurrently = ParallelAgent(
name="ConcurrentFetch",
sub_agents=[fetch_api1, fetch_api2]
)

synthesizer = LlmAgent(
name="Synthesizer",
instruction="Combine results from {api1_data} and {api2_data}."
)

overall_workflow = SequentialAgent(
name="FetchAndSynthesize",
sub_agents=[gather_concurrently, synthesizer] # Run parallel fetch, then synthesize
)

# fetch_api1 and fetch_api2 run concurrently, saving to state

# synthesizer runs afterwards, reading state['api1_data'] and state['api2_data']

Hierarchical Task Decomposition¶
Structure: A multi-level tree of agents where higher-level agents break down complex goals and delegate sub-tasks to lower-level agents.
Goal: Solve complex problems by recursively breaking them down into simpler, executable steps.
ADK Primitives Used:
Hierarchy: Multi-level parent_agent/sub_agents structure.
Interaction: Primarily LLM-Driven Delegation or Explicit Invocation (AgentTool) used by parent agents to assign tasks to subagents. Results are returned up the hierarchy (via tool responses or state).

Python
Java

# Conceptual Code: Hierarchical Research Task

from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool

# Low-level tool-like agents

web_searcher = LlmAgent(name="WebSearch", description="Performs web searches for facts.")
summarizer = LlmAgent(name="Summarizer", description="Summarizes text.")

# Mid-level agent combining tools

research_assistant = LlmAgent(
name="ResearchAssistant",
model="gemini-2.0-flash",
description="Finds and summarizes information on a topic.",
tools=[agent_tool.AgentTool(agent=web_searcher), agent_tool.AgentTool(agent=summarizer)]
)

# High-level agent delegating research

report_writer = LlmAgent(
name="ReportWriter",
model="gemini-2.0-flash",
instruction="Write a report on topic X. Use the ResearchAssistant to gather information.",
tools=[agent_tool.AgentTool(agent=research_assistant)] # Alternatively, could use LLM Transfer if research_assistant is a sub_agent
)

# User interacts with ReportWriter

# ReportWriter calls ResearchAssistant tool

# ResearchAssistant calls WebSearch and Summarizer tools

# Results flow back up

Review/Critique Pattern (Generator-Critic)¶
Structure: Typically involves two agents within a SequentialAgent: a Generator and a Critic/Reviewer.
Goal: Improve the quality or validity of generated output by having a dedicated agent review it.
ADK Primitives Used:
Workflow: SequentialAgent ensures generation happens before review.
Communication: Shared Session State (Generator uses output_key to save output; Reviewer reads that state key). The Reviewer might save its feedback to another state key for subsequent steps.

Python
Java

# Conceptual Code: Generator-Critic

from google.adk.agents import SequentialAgent, LlmAgent

generator = LlmAgent(
name="DraftWriter",
instruction="Write a short paragraph about subject X.",
output_key="draft_text"
)

reviewer = LlmAgent(
name="FactChecker",
instruction="Review the text in {draft_text} for factual accuracy. Output 'valid' or 'invalid' with reasons.",
output_key="review_status"
)

# Optional: Further steps based on review_status

review_pipeline = SequentialAgent(
name="WriteAndReview",
sub_agents=[generator, reviewer]
)

# generator runs -> saves draft to state['draft_text']

# reviewer runs -> reads state['draft_text'], saves status to state['review_status']

Iterative Refinement Pattern¶
Structure: Uses a LoopAgent containing one or more agents that work on a task over multiple iterations.
Goal: Progressively improve a result (e.g., code, text, plan) stored in the session state until a quality threshold is met or a maximum number of iterations is reached.
ADK Primitives Used:
Workflow: LoopAgent manages the repetition.
Communication: Shared Session State is essential for agents to read the previous iteration's output and save the refined version.
Termination: The loop typically ends based on max_iterations or a dedicated checking agent setting escalate=True in the Event Actions when the result is satisfactory.

Python
Java

# Conceptual Code: Iterative Code Refinement

from google.adk.agents import LoopAgent, LlmAgent, BaseAgent
from google.adk.events import Event, EventActions
from google.adk.agents.invocation_context import InvocationContext
from typing import AsyncGenerator

# Agent to generate/refine code based on state['current_code'] and state['requirements']

code_refiner = LlmAgent(
name="CodeRefiner",
instruction="Read state['current_code'] (if exists) and state['requirements']. Generate/refine Python code to meet requirements. Save to state['current_code'].",
output_key="current_code" # Overwrites previous code in state
)

# Agent to check if the code meets quality standards

quality_checker = LlmAgent(
name="QualityChecker",
instruction="Evaluate the code in state['current_code'] against state['requirements']. Output 'pass' or 'fail'.",
output_key="quality_status"
)

# Custom agent to check the status and escalate if 'pass'

class CheckStatusAndEscalate(BaseAgent):
async def \_run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
status = ctx.session.state.get("quality_status", "fail")
should_stop = (status == "pass")
yield Event(author=self.name, actions=EventActions(escalate=should_stop))

refinement_loop = LoopAgent(
name="CodeRefinementLoop",
max_iterations=5,
sub_agents=[code_refiner, quality_checker, CheckStatusAndEscalate(name="StopChecker")]
)

# Loop runs: Refiner -> Checker -> StopChecker

# State['current_code'] is updated each iteration

# Loop stops if QualityChecker outputs 'pass' (leading to StopChecker escalating) or after 5 iterations

Human-in-the-Loop Pattern¶
Structure: Integrates human intervention points within an agent workflow.
Goal: Allow for human oversight, approval, correction, or tasks that AI cannot perform.
ADK Primitives Used (Conceptual):
Interaction: Can be implemented using a custom Tool that pauses execution and sends a request to an external system (e.g., a UI, ticketing system) waiting for human input. The tool then returns the human's response to the agent.
Workflow: Could use LLM-Driven Delegation (transfer_to_agent) targeting a conceptual "Human Agent" that triggers the external workflow, or use the custom tool within an LlmAgent.
State/Callbacks: State can hold task details for the human; callbacks can manage the interaction flow.
Note: ADK doesn't have a built-in "Human Agent" type, so this requires custom integration.

Python
Java

# Conceptual Code: Using a Tool for Human Approval

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool

# --- Assume external_approval_tool exists ---

# This tool would

# 1. Take details (e.g., request_id, amount, reason)

# 2. Send these details to a human review system (e.g., via API)

# 3. Poll or wait for the human response (approved/rejected)

# 4. Return the human's decision

# async def external_approval_tool(amount: float, reason: str) -> str

approval_tool = FunctionTool(func=external_approval_tool)

# Agent that prepares the request

prepare_request = LlmAgent(
name="PrepareApproval",
instruction="Prepare the approval request details based on user input. Store amount and reason in state.", # ... likely sets state['approval_amount'] and state['approval_reason'] ...
)

# Agent that calls the human approval tool

request_approval = LlmAgent(
name="RequestHumanApproval",
instruction="Use the external_approval_tool with amount from state['approval_amount'] and reason from state['approval_reason'].",
tools=[approval_tool],
output_key="human_decision"
)

# Agent that proceeds based on human decision

process_decision = LlmAgent(
name="ProcessDecision",
instruction="Check {human_decision}. If 'approved', proceed. If 'rejected', inform user."
)

approval_workflow = SequentialAgent(
name="HumanApprovalWorkflow",
sub_agents=[prepare_request, request_approval, process_decision]
)

These patterns provide starting points for structuring your multi-agent systems. You can mix and match them as needed to create the most effective architecture for your specific application.

---

Build agents with Agent Config¶
The ADK Agent Config feature lets you build an ADK workflow without writing code. An Agent Config uses a YAML format text file with a brief description of the agent, allowing just about anyone to assemble and run an ADK agent. The following is a simple example of an basic Agent Config definition:

name: assistant_agent
model: gemini-2.5-flash
description: A helper agent that can answer users' questions.
instruction: You are an agent to help answer users' various questions.
You can use Agent Config files to build more complex agents which can incorporate Functions, Tools, Sub-Agents, and more. This page describes how to build and run ADK workflows with the Agent Config feature. For detailed information on the syntax and settings supported by the Agent Config format, see the Agent Config syntax reference.

Experimental

The Agent Config feature is experimental and has some known limitations. We welcome your feedback!

Get started¶
This section describes how to set up and start building agents with the ADK and the Agent Config feature, including installation setup, building an agent, and running your agent.

Setup¶
You need to install the Google Agent Development Kit libraries, and provide an access key for a generative AI model such as Gemini API. This section provides details on what you must install and configure before you can run agents with the Agent Config files.

Note

The Agent Config feature currently only supports Gemini models. For more information about additional; functional restrictions, see Known limitations.

To setup ADK for use with Agent Config:

Install the ADK Python libraries by following the Installation instructions. Python is currently required. For more information, see the Known limitations.
Verify that ADK is installed by running the following command in your terminal:

adk --version
This command should show the ADK version you have installed.

Tip

If the adk command fails to run and the version is not listed in step 2, make sure your Python environment is active. Execute source .venv/bin/activate in your terminal on Mac and Linux. For other platform commands, see the Installation page.

Build an agent¶
You build an agent with Agent Config using the adk create command to create the project files for an agent, and then editing the root_agent.yaml file it generates for you.

To create an ADK project for use with Agent Config:

In your terminal window, run the following command to create a config-based agent:

adk create --type=config my_agent
This command generates a my_agent/ folder, containing a root_agent.yaml file and an .env file.

In the my_agent/.env file, set environment variables for your agent to access generative AI models and other services:

For Gemini model access through Google API, add a line to the file with your API key:

GOOGLE_GENAI_USE_VERTEXAI=0
GOOGLE_API_KEY=<your-Google-Gemini-API-key>
You can get an API key from the Google AI Studio API Keys page.

For Gemini model access through Google Cloud, add these lines to the file:

GOOGLE_GENAI_USE_VERTEXAI=1
GOOGLE_CLOUD_PROJECT=<your_gcp_project>
GOOGLE_CLOUD_LOCATION=us-central1
For information on creating a Cloud Project, see the Google Cloud docs for Creating and managing projects.

Using text editor, edit the Agent Config file my_agent/root_agent.yaml, as shown below:

# yaml-language-server: $schema=<https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json>

name: assistant_agent
model: gemini-2.5-flash
description: A helper agent that can answer users' questions.
instruction: You are an agent to help answer users' various questions.
You can discover more configuration options for your root_agent.yaml agent configuration file by referring to the ADK samples repository or the Agent Config syntax reference.

Run the agent¶
Once you have completed editing your Agent Config, you can run your agent using the web interface, command line terminal execution, or API server mode.

To run your Agent Config-defined agent:

In your terminal, navigate to the my_agent/ directory containing the root_agent.yaml file.
Type one of the following commands to run your agent:
adk web - Run web UI interface for your agent.
adk run - Run your agent in the terminal without a user interface.
adk api_server - Run your agent as a service that can be used by other applications.
For more information on the ways to run your agent, see the Run Your Agent topic in the Quickstart. For more information about the ADK command line options, see the ADK CLI reference.

Example configs¶
This section shows examples of Agent Config files to get you started building agents. For additional and more complete examples, see the ADK samples repository.

Built-in tool example¶
The following example uses a built-in ADK tool function for using google search to provide functionality to the agent. This agent automatically uses the search tool to reply to user requests.

# yaml-language-server: $schema=<https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json>

name: search_agent
model: gemini-2.0-flash
description: 'an agent whose job it is to perform Google search queries and answer questions about the results.'
instruction: You are an agent whose job is to perform Google search queries and answer questions about the results.
tools:

- name: google_search
  For more details, see the full code for this sample in the ADK sample repository.

Custom tool example¶
The following example uses a custom tool built with Python code and listed in the tools: section of the config file. The agent uses this tool to check if a list of numbers provided by the user are prime numbers.

# yaml-language-server: $schema=<https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json>

agent_class: LlmAgent
model: gemini-2.5-flash
name: prime_agent
description: Handles checking if numbers are prime.
instruction: |
You are responsible for checking whether numbers are prime.
When asked to check primes, you must call the check_prime tool with a list of integers.
Never attempt to determine prime numbers manually.
Return the prime number results to the root agent.
tools:

- name: ma_llm.check_prime
  For more details, see the full code for this sample in the ADK sample repository.

Sub-agents example¶
The following example shows an agent defined with two sub-agents in the sub_agents: section, and an example tool in the tools: section of the config file. This agent determines what the user wants, and delegates to one of the sub-agents to resolve the request. The sub-agents are defined using Agent Config YAML files.

# yaml-language-server: $schema=<https://raw.githubusercontent.com/google/adk-python/refs/heads/main/src/google/adk/agents/config_schemas/AgentConfig.json>

agent_class: LlmAgent
model: gemini-2.5-flash
name: root_agent
description: Learning assistant that provides tutoring in code and math.
instruction: |
You are a learning assistant that helps students with coding and math questions.

You delegate coding questions to the code_tutor_agent and math questions to the math_tutor_agent.

Follow these steps:

1. If the user asks about programming or coding, delegate to the code_tutor_agent.
2. If the user asks about math concepts or problems, delegate to the math_tutor_agent.
3. Always provide clear explanations and encourage learning.
   sub_agents:

- config_path: code_tutor_agent.yaml
- config_path: math_tutor_agent.yaml
  For more details, see the full code for this sample in the ADK sample repository.

Deploy agent configs¶
You can deploy Agent Config agents with Cloud Run and Agent Engine, using the same procedure as code-based agents. For more information on how to prepare and deploy Agent Config-based agents, see the Cloud Run and Agent Engine deployment guides.

Known limitations¶
The Agent Config feature is experimental and includes the following limitations:

Model support: Only Gemini models are currently supported. Integration with third-party models is in progress.
Programming language: The Agent Config feature currently supports only Python code for tools and other functionality requiring programming code.
ADK Tool support: The following ADK tools are supported by the Agent Config feature, but not all tools are fully supported:
google_search
load_artifacts
url_context
exit_loop
preload_memory
get_user_choice
enterprise_web_search
load_web_page: Requires a fully-qualified path to access web pages.
Agent Type Support: The LangGraphAgent and A2aAgent types are not yet supported.
AgentTool
LongRunningFunctionTool
VertexAiSearchTool
MCPToolset
CrewaiTool
LangchainTool
ExampleTool
Next steps¶
For ideas on how and what to build with ADK Agent Configs, see the yaml-based agent definitions in the ADK adk-samples repository. For detailed information on the syntax and settings supported by the Agent Config format, see the Agent Config syntax reference.

---

Using Different Models with ADK¶
Note

Java ADK currently supports Gemini and Anthropic models. More model support coming soon.

The Agent Development Kit (ADK) is designed for flexibility, allowing you to integrate various Large Language Models (LLMs) into your agents. While the setup for Google Gemini models is covered in the Setup Foundation Models guide, this page details how to leverage Gemini effectively and integrate other popular models, including those hosted externally or running locally.

ADK primarily uses two mechanisms for model integration:

Direct String / Registry: For models tightly integrated with Google Cloud (like Gemini models accessed via Google AI Studio or Vertex AI) or models hosted on Vertex AI endpoints. You typically provide the model name or endpoint resource string directly to the LlmAgent. ADK's internal registry resolves this string to the appropriate backend client, often utilizing the google-genai library.
Wrapper Classes: For broader compatibility, especially with models outside the Google ecosystem or those requiring specific client configurations (like models accessed via LiteLLM). You instantiate a specific wrapper class (e.g., LiteLlm) and pass this object as the model parameter to your LlmAgent.
The following sections guide you through using these methods based on your needs.

Using Google Gemini Models¶
This section covers authenticating with Google's Gemini models, either through Google AI Studio for rapid development or Google Cloud Vertex AI for enterprise applications. This is the most direct way to use Google's flagship models within ADK.

Integration Method: Once you are authenticated using one of the below methods, you can pass the model's identifier string directly to the model parameter of LlmAgent.

Tip

The google-genai library, used internally by ADK for Gemini models, can connect through either Google AI Studio or Vertex AI.

Model support for voice/video streaming

In order to use voice/video streaming in ADK, you will need to use Gemini models that support the Live API. You can find the model ID(s) that support the Gemini Live API in the documentation:

Google AI Studio: Gemini Live API
Vertex AI: Gemini Live API
Google AI Studio¶
This is the simplest method and is recommended for getting started quickly.

Authentication Method: API Key
Setup:

Get an API key: Obtain your key from Google AI Studio.
Set environment variables: Create a .env file (Python) or .properties (Java) in your project's root directory and add the following lines. ADK will automatically load this file.

export GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
export GOOGLE_GENAI_USE_VERTEXAI=FALSE
(or)

Pass these variables during the model initialization via the Client (see example below).

Models: Find all available models on the Google AI for Developers site.

Google Cloud Vertex AI¶
For scalable and production-oriented use cases, Vertex AI is the recommended platform. Gemini on Vertex AI supports enterprise-grade features, security, and compliance controls. Based on your development environment and usecase, choose one of the below methods to authenticate.

Pre-requisites: A Google Cloud Project with Vertex AI enabled.

Method A: User Credentials (for Local Development)¶
Install the gcloud CLI: Follow the official installation instructions.
Log in using ADC: This command opens a browser to authenticate your user account for local development.

gcloud auth application-default login
Set environment variables:

export GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"
export GOOGLE_CLOUD_LOCATION="YOUR_VERTEX_AI_LOCATION" # e.g., us-central1
Explicitly tell the library to use Vertex AI:

export GOOGLE_GENAI_USE_VERTEXAI=TRUE
Models: Find available model IDs in the Vertex AI documentation.

Method B: Vertex AI Express Mode¶
Vertex AI Express Mode offers a simplified, API-key-based setup for rapid prototyping.

Sign up for Express Mode to get your API key.
Set environment variables:

export GOOGLE_API_KEY="PASTE_YOUR_EXPRESS_MODE_API_KEY_HERE"
export GOOGLE_GENAI_USE_VERTEXAI=TRUE
Method C: Service Account (for Production & Automation)¶
For deployed applications, a service account is the standard method.

Create a Service Account and grant it the Vertex AI User role.
Provide credentials to your application:
On Google Cloud: If you are running the agent in Cloud Run, GKE, VM or other Google Cloud services, the environment can automatically provide the service account credentials. You don't have to create a key file.
Elsewhere: Create a service account key file and point to it with an environment variable:

export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/keyfile.json"
Instead of the key file, you can also authenticate the service account using Workload Identity. But this is outside the scope of this guide.
Example:

Python
Java

from google.adk.agents import LlmAgent

# --- Example using a stable Gemini Flash model ---

agent_gemini_flash = LlmAgent( # Use the latest stable Flash model identifier
model="gemini-2.0-flash",
name="gemini_flash_agent",
instruction="You are a fast and helpful Gemini assistant.", # ... other agent parameters
)

# --- Example using a powerful Gemini Pro model ---

# Note: Always check the official Gemini documentation for the latest model names

# including specific preview versions if needed. Preview models might have

# different availability or quota limitations

agent_gemini_pro = LlmAgent( # Use the latest generally available Pro model identifier
model="gemini-2.5-pro-preview-03-25",
name="gemini_pro_agent",
instruction="You are a powerful and knowledgeable Gemini assistant.", # ... other agent parameters
)

Secure Your Credentials

Service account credentials or API keys are powerful credentials. Never expose them publicly. Use a secret manager like Google Secret Manager to store and access them securely in production.

Using Anthropic models¶
java_only

You can integrate Anthropic's Claude models directly using their API key or from a Vertex AI backend into your Java ADK applications by using the ADK's Claude wrapper class.

For Vertex AI backend, see the Third-Party Models on Vertex AI section.

Prerequisites:

Dependencies:

Anthropic SDK Classes (Transitive): The Java ADK's com.google.adk.models.Claude wrapper relies on classes from Anthropic's official Java SDK. These are typically included as transitive dependencies.
Anthropic API Key:

Obtain an API key from Anthropic. Securely manage this key using a secret manager.
Integration:

Instantiate com.google.adk.models.Claude, providing the desired Claude model name and an AnthropicOkHttpClient configured with your API key. Then, pass this Claude instance to your LlmAgent.

Example:

import com.anthropic.client.AnthropicClient;
import com.google.adk.agents.LlmAgent;
import com.google.adk.models.Claude;
import com.anthropic.client.okhttp.AnthropicOkHttpClient; // From Anthropic's SDK

public class DirectAnthropicAgent {

private static final String CLAUDE_MODEL_ID = "claude-3-7-sonnet-latest"; // Or your preferred Claude model

public static LlmAgent createAgent() {

    // It's recommended to load sensitive keys from a secure config
    AnthropicClient anthropicClient = AnthropicOkHttpClient.builder()
        .apiKey("ANTHROPIC_API_KEY")
        .build();

    Claude claudeModel = new Claude(
        CLAUDE_MODEL_ID,
        anthropicClient
    );

    return LlmAgent.builder()
        .name("claude_direct_agent")
        .model(claudeModel)
        .instruction("You are a helpful AI assistant powered by Anthropic Claude.")
        // ... other LlmAgent configurations
        .build();

}

public static void main(String[] args) {
try {
LlmAgent agent = createAgent();
System.out.println("Successfully created direct Anthropic agent: " + agent.name());
} catch (IllegalStateException e) {
System.err.println("Error creating agent: " + e.getMessage());
}
}
}
Using Cloud & Proprietary Models via LiteLLM¶
python_only

To access a vast range of LLMs from providers like OpenAI, Anthropic (non-Vertex AI), Cohere, and many others, ADK offers integration through the LiteLLM library.

Integration Method: Instantiate the LiteLlm wrapper class and pass it to the model parameter of LlmAgent.

LiteLLM Overview: LiteLLM acts as a translation layer, providing a standardized, OpenAI-compatible interface to over 100+ LLMs.

Setup:

Install LiteLLM:

pip install litellm
Set Provider API Keys: Configure API keys as environment variables for the specific providers you intend to use.

Example for OpenAI:

export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
Example for Anthropic (non-Vertex AI):

export ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"
Consult the LiteLLM Providers Documentation for the correct environment variable names for other providers.

Example:

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

# --- Example Agent using OpenAI's GPT-4o ---

# (Requires OPENAI_API_KEY)

agent_openai = LlmAgent(
model=LiteLlm(model="openai/gpt-4o"), # LiteLLM model string format
name="openai_agent",
instruction="You are a helpful assistant powered by GPT-4o.", # ... other agent parameters
)

# --- Example Agent using Anthropic's Claude Haiku (non-Vertex) ---

# (Requires ANTHROPIC_API_KEY)

agent_claude_direct = LlmAgent(
model=LiteLlm(model="anthropic/claude-3-haiku-20240307"),
name="claude_direct_agent",
instruction="You are an assistant powered by Claude Haiku.", # ... other agent parameters
)
Windows Encoding Note for LiteLLM

When using ADK agents with LiteLLM on Windows, you might encounter a UnicodeDecodeError. This error occurs because LiteLLM may attempt to read cached files using the default Windows encoding (cp1252) instead of UTF-8.

To prevent this, we recommend setting the PYTHONUTF8 environment variable to 1. This forces Python to use UTF-8 for all file I/O.

Example (PowerShell):

# Set for the current session

$env:PYTHONUTF8 = "1"

# Set persistently for the user

[System.Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', [System.EnvironmentVariableTarget]::User)
Using Open & Local Models via LiteLLM¶
python_only

For maximum control, cost savings, privacy, or offline use cases, you can run open-source models locally or self-host them and integrate them using LiteLLM.

Integration Method: Instantiate the LiteLlm wrapper class, configured to point to your local model server.

Ollama Integration¶
Ollama allows you to easily run open-source models locally.

Model choice¶
If your agent is relying on tools, please make sure that you select a model with tool support from Ollama website.

For reliable results, we recommend using a decent-sized model with tool support.

The tool support for the model can be checked with the following command:

ollama show mistral-small3.1
Model
architecture mistral3
parameters 24.0B
context length 131072
embedding length 5120
quantization Q4_K_M

Capabilities
completion
vision
tools
You are supposed to see tools listed under capabilities.

You can also look at the template the model is using and tweak it based on your needs.

ollama show --modelfile llama3.2 > model_file_to_modify
For instance, the default template for the above model inherently suggests that the model shall call a function all the time. This may result in an infinite loop of function calls.

Given the following functions, please respond with a JSON for a function call
with its proper arguments that best answers the given prompt.

Respond in the format {"name": function name, "parameters": dictionary of
argument name and its value}. Do not use variables.
You can swap such prompts with a more descriptive one to prevent infinite tool call loops.

For instance:

Review the user's prompt and the available functions listed below.
First, determine if calling one of these functions is the most appropriate way to respond. A function call is likely needed if the prompt asks for a specific action, requires external data lookup, or involves calculations handled by the functions. If the prompt is a general question or can be answered directly, a function call is likely NOT needed.

If you determine a function call IS required: Respond ONLY with a JSON object in the format {"name": "function_name", "parameters": {"argument_name": "value"}}. Ensure parameter values are concrete, not variables.

If you determine a function call IS NOT required: Respond directly to the user's prompt in plain text, providing the answer or information requested. Do not output any JSON.
Then you can create a new model with the following command:

ollama create llama3.2-modified -f model_file_to_modify
Using ollama_chat provider¶
Our LiteLLM wrapper can be used to create agents with Ollama models.

root_agent = Agent(
model=LiteLlm(model="ollama_chat/mistral-small3.1"),
name="dice_agent",
description=(
"hello world agent that can roll a dice of 8 sides and check prime"
" numbers."
),
instruction="""
You roll dice and answer questions about the outcome of the dice rolls.
""",
tools=[
roll_die,
check_prime,
],
)
It is important to set the provider ollama_chat instead of ollama. Using ollama will result in unexpected behaviors such as infinite tool call loops and ignoring previous context.

While api_base can be provided inside LiteLLM for generation, LiteLLM library is calling other APIs relying on the env variable instead as of v1.65.5 after completion. So at this time, we recommend setting the env variable OLLAMA_API_BASE to point to the ollama server.

export OLLAMA_API_BASE="<http://localhost:11434>"
adk web
Using openai provider¶
Alternatively, openai can be used as the provider name. But this will also require setting the OPENAI_API_BASE=<http://localhost:11434/v1> and OPENAI_API_KEY=anything env variables instead of OLLAMA_API_BASE. Please note that api base now has /v1 at the end.

root_agent = Agent(
model=LiteLlm(model="openai/mistral-small3.1"),
name="dice_agent",
description=(
"hello world agent that can roll a dice of 8 sides and check prime"
" numbers."
),
instruction="""
You roll dice and answer questions about the outcome of the dice rolls.
""",
tools=[
roll_die,
check_prime,
],
)

export OPENAI_API_BASE=<http://localhost:11434/v1>
export OPENAI_API_KEY=anything
adk web
Debugging¶
You can see the request sent to the Ollama server by adding the following in your agent code just after imports.

import litellm
litellm.\_turn_on_debug()
Look for a line like the following:

Request Sent from LiteLLM:
curl -X POST \
<http://localhost:11434/api/chat> \
-d '{'model': 'mistral-small3.1', 'messages': [{'role': 'system', 'content': ...
Self-Hosted Endpoint (e.g., vLLM)¶
python_only

Tools such as vLLM allow you to host models efficiently and often expose an OpenAI-compatible API endpoint.

Setup:

Deploy Model: Deploy your chosen model using vLLM (or a similar tool). Note the API base URL (e.g., <https://your-vllm-endpoint.run.app/v1>).
Important for ADK Tools: When deploying, ensure the serving tool supports and enables OpenAI-compatible tool/function calling. For vLLM, this might involve flags like --enable-auto-tool-choice and potentially a specific --tool-call-parser, depending on the model. Refer to the vLLM documentation on Tool Use.
Authentication: Determine how your endpoint handles authentication (e.g., API key, bearer token).

Integration Example:

import subprocess
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

# --- Example Agent using a model hosted on a vLLM endpoint ---

# Endpoint URL provided by your vLLM deployment

api_base_url = "<https://your-vllm-endpoint.run.app/v1>"

# Model name as recognized by _your_ vLLM endpoint configuration

model_name_at_endpoint = "hosted_vllm/google/gemma-3-4b-it" # Example from vllm_test.py

# Authentication (Example: using gcloud identity token for a Cloud Run deployment)

# Adapt this based on your endpoint's security

try:
gcloud_token = subprocess.check_output(
["gcloud", "auth", "print-identity-token", "-q"]
).decode().strip()
auth_headers = {"Authorization": f"Bearer {gcloud_token}"}
except Exception as e:
print(f"Warning: Could not get gcloud token - {e}. Endpoint might be unsecured or require different auth.")
auth_headers = None # Or handle error appropriately

agent_vllm = LlmAgent(
model=LiteLlm(
model=model_name_at_endpoint,
api_base=api_base_url, # Pass authentication headers if needed
extra_headers=auth_headers # Alternatively, if endpoint uses an API key: # api_key="YOUR_ENDPOINT_API_KEY"
),
name="vllm_agent",
instruction="You are a helpful assistant running on a self-hosted vLLM endpoint.", # ... other agent parameters
)
Using Hosted & Tuned Models on Vertex AI¶
For enterprise-grade scalability, reliability, and integration with Google Cloud's MLOps ecosystem, you can use models deployed to Vertex AI Endpoints. This includes models from Model Garden or your own fine-tuned models.

Integration Method: Pass the full Vertex AI Endpoint resource string (projects/PROJECT_ID/locations/LOCATION/endpoints/ENDPOINT_ID) directly to the model parameter of LlmAgent.

Vertex AI Setup (Consolidated):

Ensure your environment is configured for Vertex AI:

Authentication: Use Application Default Credentials (ADC):

gcloud auth application-default login
Environment Variables: Set your project and location:

export GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"
export GOOGLE_CLOUD_LOCATION="YOUR_VERTEX_AI_LOCATION" # e.g., us-central1
Enable Vertex Backend: Crucially, ensure the google-genai library targets Vertex AI:

export GOOGLE_GENAI_USE_VERTEXAI=TRUE
Model Garden Deployments¶
python_only

You can deploy various open and proprietary models from the Vertex AI Model Garden to an endpoint.

Example:

from google.adk.agents import LlmAgent
from google.genai import types # For config objects

# --- Example Agent using a Llama 3 model deployed from Model Garden ---

# Replace with your actual Vertex AI Endpoint resource name

llama3_endpoint = "projects/YOUR_PROJECT_ID/locations/us-central1/endpoints/YOUR_LLAMA3_ENDPOINT_ID"

agent_llama3_vertex = LlmAgent(
model=llama3_endpoint,
name="llama3_vertex_agent",
instruction="You are a helpful assistant based on Llama 3, hosted on Vertex AI.",
generate_content_config=types.GenerateContentConfig(max_output_tokens=2048), # ... other agent parameters
)
Fine-tuned Model Endpoints¶
python_only

Deploying your fine-tuned models (whether based on Gemini or other architectures supported by Vertex AI) results in an endpoint that can be used directly.

Example:

from google.adk.agents import LlmAgent

# --- Example Agent using a fine-tuned Gemini model endpoint ---

# Replace with your fine-tuned model's endpoint resource name

finetuned_gemini_endpoint = "projects/YOUR_PROJECT_ID/locations/us-central1/endpoints/YOUR_FINETUNED_ENDPOINT_ID"

agent_finetuned_gemini = LlmAgent(
model=finetuned_gemini_endpoint,
name="finetuned_gemini_agent",
instruction="You are a specialized assistant trained on specific data.", # ... other agent parameters
)
Third-Party Models on Vertex AI (e.g., Anthropic Claude)¶
Some providers, like Anthropic, make their models available directly through Vertex AI.

Python
Java
Integration Method: Uses the direct model string (e.g., "claude-3-sonnet@20240229"), but requires manual registration within ADK.

Why Registration? ADK's registry automatically recognizes gemini-\* strings and standard Vertex AI endpoint strings (projects/.../endpoints/...) and routes them via the google-genai library. For other model types used directly via Vertex AI (like Claude), you must explicitly tell the ADK registry which specific wrapper class (Claude in this case) knows how to handle that model identifier string with the Vertex AI backend.

Setup:

Vertex AI Environment: Ensure the consolidated Vertex AI setup (ADC, Env Vars, GOOGLE_GENAI_USE_VERTEXAI=TRUE) is complete.

Install Provider Library: Install the necessary client library configured for Vertex AI.

pip install "anthropic[vertex]"
Register Model Class: Add this code near the start of your application, before creating an agent using the Claude model string:

# Required for using Claude model strings directly via Vertex AI with LlmAgent

from google.adk.models.anthropic_llm import Claude
from google.adk.models.registry import LLMRegistry

LLMRegistry.register(Claude)
Example:

from google.adk.agents import LlmAgent
from google.adk.models.anthropic_llm import Claude # Import needed for registration
from google.adk.models.registry import LLMRegistry # Import needed for registration
from google.genai import types

# --- Register Claude class (do this once at startup) ---

LLMRegistry.register(Claude)

# --- Example Agent using Claude 3 Sonnet on Vertex AI ---

# Standard model name for Claude 3 Sonnet on Vertex AI

claude_model_vertexai = "claude-3-sonnet@20240229"

agent_claude_vertexai = LlmAgent(
model=claude_model_vertexai, # Pass the direct string after registration
name="claude_vertexai_agent",
instruction="You are an assistant powered by Claude 3 Sonnet on Vertex AI.",
generate_content_config=types.GenerateContentConfig(max_output_tokens=4096), # ... other agent parameters
)

Back to top
Previous

---

Tools¶
What is a Tool?¶
In the context of ADK, a Tool represents a specific capability provided to an AI agent, enabling it to perform actions and interact with the world beyond its core text generation and reasoning abilities. What distinguishes capable agents from basic language models is often their effective use of tools.

Technically, a tool is typically a modular code component—like a Python/ Java function, a class method, or even another specialized agent—designed to execute a distinct, predefined task. These tasks often involve interacting with external systems or data.

Agent tool call

Key Characteristics¶
Action-Oriented: Tools perform specific actions, such as:

Querying databases
Making API requests (e.g., fetching weather data, booking systems)
Searching the web
Executing code snippets
Retrieving information from documents (RAG)
Interacting with other software or services
Extends Agent capabilities: They empower agents to access real-time information, affect external systems, and overcome the knowledge limitations inherent in their training data.

Execute predefined logic: Crucially, tools execute specific, developer-defined logic. They do not possess their own independent reasoning capabilities like the agent's core Large Language Model (LLM). The LLM reasons about which tool to use, when, and with what inputs, but the tool itself just executes its designated function.

How Agents Use Tools¶
Agents leverage tools dynamically through mechanisms often involving function calling. The process generally follows these steps:

Reasoning: The agent's LLM analyzes its system instruction, conversation history, and user request.
Selection: Based on the analysis, the LLM decides on which tool, if any, to execute, based on the tools available to the agent and the docstrings that describes each tool.
Invocation: The LLM generates the required arguments (inputs) for the selected tool and triggers its execution.
Observation: The agent receives the output (result) returned by the tool.
Finalization: The agent incorporates the tool's output into its ongoing reasoning process to formulate the next response, decide the subsequent step, or determine if the goal has been achieved.
Think of the tools as a specialized toolkit that the agent's intelligent core (the LLM) can access and utilize as needed to accomplish complex tasks.

Tool Types in ADK¶
ADK offers flexibility by supporting several types of tools:

Function Tools: Tools created by you, tailored to your specific application's needs.
Functions/Methods: Define standard synchronous functions or methods in your code (e.g., Python def).
Agents-as-Tools: Use another, potentially specialized, agent as a tool for a parent agent.
Long Running Function Tools: Support for tools that perform asynchronous operations or take significant time to complete.
Built-in Tools: Ready-to-use tools provided by the framework for common tasks. Examples: Google Search, Code Execution, Retrieval-Augmented Generation (RAG).
Third-Party Tools: Integrate tools seamlessly from popular external libraries. Examples: LangChain Tools, CrewAI Tools.
Navigate to the respective documentation pages linked above for detailed information and examples for each tool type.

Referencing Tool in Agent’s Instructions¶
Within an agent's instructions, you can directly reference a tool by using its function name. If the tool's function name and docstring are sufficiently descriptive, your instructions can primarily focus on when the Large Language Model (LLM) should utilize the tool. This promotes clarity and helps the model understand the intended use of each tool.

It is crucial to clearly instruct the agent on how to handle different return values that a tool might produce. For example, if a tool returns an error message, your instructions should specify whether the agent should retry the operation, give up on the task, or request additional information from the user.

Furthermore, ADK supports the sequential use of tools, where the output of one tool can serve as the input for another. When implementing such workflows, it's important to describe the intended sequence of tool usage within the agent's instructions to guide the model through the necessary steps.

Example¶
The following example showcases how an agent can use tools by referencing their function names in its instructions. It also demonstrates how to guide the agent to handle different return values from tools, such as success or error messages, and how to orchestrate the sequential use of multiple tools to accomplish a task.

Python
Java

# Copyright 2025 Google LLC

#

# Licensed under the Apache License, Version 2.0 (the "License")

# you may not use this file except in compliance with the License

# You may obtain a copy of the License at

#

# <http://www.apache.org/licenses/LICENSE-2.0>

#

# Unless required by applicable law or agreed to in writing, software

# distributed under the License is distributed on an "AS IS" BASIS

# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied

# See the License for the specific language governing permissions and

# limitations under the License

import asyncio
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

APP_NAME="weather_sentiment_agent"
USER_ID="user1234"
SESSION_ID="1234"
MODEL_ID="gemini-2.0-flash"

# Tool 1

def get_weather_report(city: str) -> dict:
"""Retrieves the current weather report for a specified city.

    Returns:
        dict: A dictionary containing the weather information with a 'status' key ('success' or 'error') and a 'report' key with the weather details if successful, or an 'error_message' if an error occurred.
    """
    if city.lower() == "london":
        return {"status": "success", "report": "The current weather in London is cloudy with a temperature of 18 degrees Celsius and a chance of rain."}
    elif city.lower() == "paris":
        return {"status": "success", "report": "The weather in Paris is sunny with a temperature of 25 degrees Celsius."}
    else:
        return {"status": "error", "error_message": f"Weather information for '{city}' is not available."}

weather_tool = FunctionTool(func=get_weather_report)

# Tool 2

def analyze_sentiment(text: str) -> dict:
"""Analyzes the sentiment of the given text.

    Returns:
        dict: A dictionary with 'sentiment' ('positive', 'negative', or 'neutral') and a 'confidence' score.
    """
    if "good" in text.lower() or "sunny" in text.lower():
        return {"sentiment": "positive", "confidence": 0.8}
    elif "rain" in text.lower() or "bad" in text.lower():
        return {"sentiment": "negative", "confidence": 0.7}
    else:
        return {"sentiment": "neutral", "confidence": 0.6}

sentiment_tool = FunctionTool(func=analyze_sentiment)

# Agent

weather_sentiment_agent = Agent(
model=MODEL_ID,
name='weather_sentiment_agent',
instruction="""You are a helpful assistant that provides weather information and analyzes the sentiment of user feedback.
**If the user asks about the weather in a specific city, use the 'get_weather_report' tool to retrieve the weather details.**
**If the 'get_weather_report' tool returns a 'success' status, provide the weather report to the user.**
**If the 'get_weather_report' tool returns an 'error' status, inform the user that the weather information for the specified city is not available and ask if they have another city in mind.**
**After providing a weather report, if the user gives feedback on the weather (e.g., 'That's good' or 'I don't like rain'), use the 'analyze_sentiment' tool to understand their sentiment.** Then, briefly acknowledge their sentiment.
You can handle these tasks sequentially if needed.""",
tools=[weather_tool, sentiment_tool]
)

async def main():
"""Main function to run the agent asynchronously.""" # Session and Runner Setup
session_service = InMemorySessionService() # Use 'await' to correctly create the session
await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)

    runner = Runner(agent=weather_sentiment_agent, app_name=APP_NAME, session_service=session_service)

    # Agent Interaction
    query = "weather in london?"
    print(f"User Query: {query}")
    content = types.Content(role='user', parts=[types.Part(text=query)])

    # The runner's run method handles the async loop internally
    events = runner.run(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

    for event in events:
        if event.is_final_response():
            final_response = event.content.parts[0].text
            print("Agent Response:", final_response)

# Standard way to run the main async function

if **name** == "**main**":
asyncio.run(main())

Tool Context¶
For more advanced scenarios, ADK allows you to access additional contextual information within your tool function by including the special parameter tool_context: ToolContext. By including this in the function signature, ADK will automatically provide an instance of the ToolContext class when your tool is called during agent execution.

The ToolContext provides access to several key pieces of information and control levers:

state: State: Read and modify the current session's state. Changes made here are tracked and persisted.

actions: EventActions: Influence the agent's subsequent actions after the tool runs (e.g., skip summarization, transfer to another agent).

function_call_id: str: The unique identifier assigned by the framework to this specific invocation of the tool. Useful for tracking and correlating with authentication responses. This can also be helpful when multiple tools are called within a single model response.

function_call_event_id: str: This attribute provides the unique identifier of the event that triggered the current tool call. This can be useful for tracking and logging purposes.

auth_response: Any: Contains the authentication response/credentials if an authentication flow was completed before this tool call.

Access to Services: Methods to interact with configured services like Artifacts and Memory.

Note that you shouldn't include the tool_context parameter in the tool function docstring. Since ToolContext is automatically injected by the ADK framework after the LLM decides to call the tool function, it is not relevant for the LLM's decision-making and including it can confuse the LLM.

State Management¶
The tool_context.state attribute provides direct read and write access to the state associated with the current session. It behaves like a dictionary but ensures that any modifications are tracked as deltas and persisted by the session service. This enables tools to maintain and share information across different interactions and agent steps.

Reading State: Use standard dictionary access (tool_context.state['my_key']) or the .get() method (tool_context.state.get('my_key', default_value)).

Writing State: Assign values directly (tool_context.state['new_key'] = 'new_value'). These changes are recorded in the state_delta of the resulting event.

State Prefixes: Remember the standard state prefixes:

app:\*: Shared across all users of the application.

user:\*: Specific to the current user across all their sessions.

(No prefix): Specific to the current session.

temp:\*: Temporary, not persisted across invocations (useful for passing data within a single run call but generally less useful inside a tool context which operates between LLM calls).

Python
Java

from google.adk.tools import ToolContext, FunctionTool

def update_user_preference(preference: str, value: str, tool_context: ToolContext):
"""Updates a user-specific preference."""
user_prefs_key = "user:preferences" # Get current preferences or initialize if none exist
preferences = tool_context.state.get(user_prefs_key, {})
preferences[preference] = value # Write the updated dictionary back to the state
tool_context.state[user_prefs_key] = preferences
print(f"Tool: Updated user preference '{preference}' to '{value}'")
return {"status": "success", "updated_preference": preference}

pref_tool = FunctionTool(func=update_user_preference)

# In an Agent

# my_agent = Agent(..., tools=[pref_tool])

# When the LLM calls update_user_preference(preference='theme', value='dark', ...)

# The tool_context.state will be updated, and the change will be part of the

# resulting tool response event's actions.state_delta

Controlling Agent Flow¶
The tool_context.actions attribute (ToolContext.actions() in Java) holds an EventActions object. Modifying attributes on this object allows your tool to influence what the agent or framework does after the tool finishes execution.

skip_summarization: bool: (Default: False) If set to True, instructs the ADK to bypass the LLM call that typically summarizes the tool's output. This is useful if your tool's return value is already a user-ready message.

transfer_to_agent: str: Set this to the name of another agent. The framework will halt the current agent's execution and transfer control of the conversation to the specified agent. This allows tools to dynamically hand off tasks to more specialized agents.

escalate: bool: (Default: False) Setting this to True signals that the current agent cannot handle the request and should pass control up to its parent agent (if in a hierarchy). In a LoopAgent, setting escalate=True in a sub-agent's tool will terminate the loop.

Example¶

Python
Java

# Copyright 2025 Google LLC

#

# Licensed under the Apache License, Version 2.0 (the "License")

# you may not use this file except in compliance with the License

# You may obtain a copy of the License at

#

# <http://www.apache.org/licenses/LICENSE-2.0>

#

# Unless required by applicable law or agreed to in writing, software

# distributed under the License is distributed on an "AS IS" BASIS

# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied

# See the License for the specific language governing permissions and

# limitations under the License

from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import ToolContext
from google.genai import types

APP_NAME="customer_support_agent"
USER_ID="user1234"
SESSION_ID="1234"

def check_and_transfer(query: str, tool_context: ToolContext) -> str:
"""Checks if the query requires escalation and transfers to another agent if needed."""
if "urgent" in query.lower():
print("Tool: Detected urgency, transferring to the support agent.")
tool_context.actions.transfer_to_agent = "support_agent"
return "Transferring to the support agent..."
else:
return f"Processed query: '{query}'. No further action needed."

escalation_tool = FunctionTool(func=check_and_transfer)

main_agent = Agent(
model='gemini-2.0-flash',
name='main_agent',
instruction="""You are the first point of contact for customer support of an analytics tool. Answer general queries. If the user indicates urgency, use the 'check_and_transfer' tool.""",
tools=[check_and_transfer]
)

support_agent = Agent(
model='gemini-2.0-flash',
name='support_agent',
instruction="""You are the dedicated support agent. Mentioned you are a support handler and please help the user with their urgent issue."""
)

main_agent.sub_agents = [support_agent]

# Session and Runner

async def setup_session_and_runner():
session_service = InMemorySessionService()
session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
runner = Runner(agent=main_agent, app_name=APP_NAME, session_service=session_service)
return session, runner

# Agent Interaction

async def call_agent_async(query):
content = types.Content(role='user', parts=[types.Part(text=query)])
session, runner = await setup_session_and_runner()
events = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

    async for event in events:
        if event.is_final_response():
            final_response = event.content.parts[0].text
            print("Agent Response: ", final_response)

# Note: In Colab, you can directly use 'await' at the top level

# If running this code as a standalone Python script, you'll need to use asyncio.run() or manage the event loop

await call_agent_async("this is urgent, i cant login")

Explanation¶
We define two agents: main_agent and support_agent. The main_agent is designed to be the initial point of contact.
The check_and_transfer tool, when called by main_agent, examines the user's query.
If the query contains the word "urgent", the tool accesses the tool_context, specifically tool_context.actions, and sets the transfer_to_agent attribute to support_agent.
This action signals to the framework to transfer the control of the conversation to the agent named support_agent.
When the main_agent processes the urgent query, the check_and_transfer tool triggers the transfer. The subsequent response would ideally come from the support_agent.
For a normal query without urgency, the tool simply processes it without triggering a transfer.
This example illustrates how a tool, through EventActions in its ToolContext, can dynamically influence the flow of the conversation by transferring control to another specialized agent.

Authentication¶
python_only

ToolContext provides mechanisms for tools interacting with authenticated APIs. If your tool needs to handle authentication, you might use the following:

auth_response: Contains credentials (e.g., a token) if authentication was already handled by the framework before your tool was called (common with RestApiTool and OpenAPI security schemes).

request_credential(auth_config: dict): Call this method if your tool determines authentication is needed but credentials aren't available. This signals the framework to start an authentication flow based on the provided auth_config.

get_auth_response(): Call this in a subsequent invocation (after request_credential was successfully handled) to retrieve the credentials the user provided.

For detailed explanations of authentication flows, configuration, and examples, please refer to the dedicated Tool Authentication documentation page.

Context-Aware Data Access Methods¶
These methods provide convenient ways for your tool to interact with persistent data associated with the session or user, managed by configured services.

list_artifacts() (or listArtifacts() in Java): Returns a list of filenames (or keys) for all artifacts currently stored for the session via the artifact_service. Artifacts are typically files (images, documents, etc.) uploaded by the user or generated by tools/agents.

load_artifact(filename: str): Retrieves a specific artifact by its filename from the artifact_service. You can optionally specify a version; if omitted, the latest version is returned. Returns a google.genai.types.Part object containing the artifact data and mime type, or None if not found.

save_artifact(filename: str, artifact: types.Part): Saves a new version of an artifact to the artifact_service. Returns the new version number (starting from 0).

search_memory(query: str) python_only

Queries the user's long-term memory using the configured memory_service. This is useful for retrieving relevant information from past interactions or stored knowledge. The structure of the SearchMemoryResponse depends on the specific memory service implementation but typically contains relevant text snippets or conversation excerpts.

Example¶

Python
Java

# Copyright 2025 Google LLC

#

# Licensed under the Apache License, Version 2.0 (the "License")

# you may not use this file except in compliance with the License

# You may obtain a copy of the License at

#

# <http://www.apache.org/licenses/LICENSE-2.0>

#

# Unless required by applicable law or agreed to in writing, software

# distributed under the License is distributed on an "AS IS" BASIS

# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied

# See the License for the specific language governing permissions and

# limitations under the License

from google.adk.tools import ToolContext, FunctionTool
from google.genai import types

def process_document(
document_name: str, analysis_query: str, tool_context: ToolContext
) -> dict:
"""Analyzes a document using context from memory."""

    # 1. Load the artifact
    print(f"Tool: Attempting to load artifact: {document_name}")
    document_part = tool_context.load_artifact(document_name)

    if not document_part:
        return {"status": "error", "message": f"Document '{document_name}' not found."}

    document_text = document_part.text  # Assuming it's text for simplicity
    print(f"Tool: Loaded document '{document_name}' ({len(document_text)} chars).")

    # 2. Search memory for related context
    print(f"Tool: Searching memory for context related to: '{analysis_query}'")
    memory_response = tool_context.search_memory(
        f"Context for analyzing document about {analysis_query}"
    )
    memory_context = "\n".join(
        [
            m.events[0].content.parts[0].text
            for m in memory_response.memories
            if m.events and m.events[0].content
        ]
    )  # Simplified extraction
    print(f"Tool: Found memory context: {memory_context[:100]}...")

    # 3. Perform analysis (placeholder)
    analysis_result = f"Analysis of '{document_name}' regarding '{analysis_query}' using memory context: [Placeholder Analysis Result]"
    print("Tool: Performed analysis.")

    # 4. Save the analysis result as a new artifact
    analysis_part = types.Part.from_text(text=analysis_result)
    new_artifact_name = f"analysis_{document_name}"
    version = await tool_context.save_artifact(new_artifact_name, analysis_part)
    print(f"Tool: Saved analysis result as '{new_artifact_name}' version {version}.")

    return {
        "status": "success",
        "analysis_artifact": new_artifact_name,
        "version": version,
    }

doc_analysis_tool = FunctionTool(func=process_document)

# In an Agent

# Assume artifact 'report.txt' was previously saved

# Assume memory service is configured and has relevant past data

# my_agent = Agent(..., tools=[doc_analysis_tool], artifact_service=..., memory_service=...)

By leveraging the ToolContext, developers can create more sophisticated and context-aware custom tools that seamlessly integrate with ADK's architecture and enhance the overall capabilities of their agents.

Defining Effective Tool Functions¶
When using a method or function as an ADK Tool, how you define it significantly impacts the agent's ability to use it correctly. The agent's Large Language Model (LLM) relies heavily on the function's name, parameters (arguments), type hints, and docstring / source code comments to understand its purpose and generate the correct call.

Here are key guidelines for defining effective tool functions:

Function Name:

Use descriptive, verb-noun based names that clearly indicate the action (e.g., get_weather, searchDocuments, schedule_meeting).
Avoid generic names like run, process, handle_data, or overly ambiguous names like doStuff. Even with a good description, a name like do_stuff might confuse the model about when to use the tool versus, for example, cancelFlight.
The LLM uses the function name as a primary identifier during tool selection.
Parameters (Arguments):

Your function can have any number of parameters.
Use clear and descriptive names (e.g., city instead of c, search_query instead of q).
Provide type hints in Python for all parameters (e.g., city: str, user_id: int, items: list[str]). This is essential for ADK to generate the correct schema for the LLM.
Ensure all parameter types are JSON serializable. All java primitives as well as standard Python types like str, int, float, bool, list, dict, and their combinations are generally safe. Avoid complex custom class instances as direct parameters unless they have a clear JSON representation.
Do not set default values for parameters. E.g., def my_func(param1: str = "default"). Default values are not reliably supported or used by the underlying models during function call generation. All necessary information should be derived by the LLM from the context or explicitly requested if missing.
self / cls Handled Automatically: Implicit parameters like self (for instance methods) or cls (for class methods) are automatically handled by ADK and excluded from the schema shown to the LLM. You only need to define type hints and descriptions for the logical parameters your tool requires the LLM to provide.
Return Type:

The function's return value must be a dictionary (dict) in Python or a Map in Java.
If your function returns a non-dictionary type (e.g., a string, number, list), the ADK framework will automatically wrap it into a dictionary/Map like {'result': your_original_return_value} before passing the result back to the model.
Design the dictionary/Map keys and values to be descriptive and easily understood by the LLM. Remember, the model reads this output to decide its next step.
Include meaningful keys. For example, instead of returning just an error code like 500, return {'status': 'error', 'error_message': 'Database connection failed'}.
It's a highly recommended practice to include a status key (e.g., 'success', 'error', 'pending', 'ambiguous') to clearly indicate the outcome of the tool execution for the model.
Docstring / Source Code Comments:

This is critical. The docstring is the primary source of descriptive information for the LLM.
Clearly state what the tool does. Be specific about its purpose and limitations.
Explain when the tool should be used. Provide context or example scenarios to guide the LLM's decision-making.
Describe each parameter clearly. Explain what information the LLM needs to provide for that argument.
Describe the structure and meaning of the expected dict return value, especially the different status values and associated data keys.
Do not describe the injected ToolContext parameter. Avoid mentioning the optional tool_context: ToolContext parameter within the docstring description since it is not a parameter the LLM needs to know about. ToolContext is injected by ADK, after the LLM decides to call it.
Example of a good definition:

Python
Java

def lookup_order_status(order_id: str) -> dict:
"""Fetches the current status of a customer's order using its ID.

Use this tool ONLY when a user explicitly asks for the status of
a specific order and provides the order ID. Do not use it for
general inquiries.

Args:
order_id: The unique identifier of the order to look up.

Returns:
A dictionary indicating the outcome.
On success, status is 'success' and includes an 'order' dictionary.
On failure, status is 'error' and includes an 'error_message'.
Example success: {'status': 'success', 'order': {'state': 'shipped', 'tracking_number': '1Z9...'}}
Example error: {'status': 'error', 'error_message': 'Order ID not found.'}
"""

# ... function implementation to fetch status

if status_details := fetch_status_from_backend(order_id):
return {
"status": "success",
"order": {
"state": status_details.state,
"tracking_number": status_details.tracking,
},
}
else:
return {"status": "error", "error_message": f"Order ID {order_id} not found."}

Simplicity and Focus:
Keep Tools Focused: Each tool should ideally perform one well-defined task.
Fewer Parameters are Better: Models generally handle tools with fewer, clearly defined parameters more reliably than those with many optional or complex ones.
Use Simple Data Types: Prefer basic types (str, int, bool, float, List[str], in Python, or int, byte, short, long, float, double, boolean and char in Java) over complex custom classes or deeply nested structures as parameters when possible.
Decompose Complex Tasks: Break down functions that perform multiple distinct logical steps into smaller, more focused tools. For instance, instead of a single update_user_profile(profile: ProfileObject) tool, consider separate tools like update_user_name(name: str), update_user_address(address: str), update_user_preferences(preferences: list[str]), etc. This makes it easier for the LLM to select and use the correct capability.
By adhering to these guidelines, you provide the LLM with the clarity and structure it needs to effectively utilize your custom function tools, leading to more capable and reliable agent behavior.

Toolsets: Grouping and Dynamically Providing Tools python_only¶
Beyond individual tools, ADK introduces the concept of a Toolset via the BaseToolset interface (defined in google.adk.tools.base_toolset). A toolset allows you to manage and provide a collection of BaseTool instances, often dynamically, to an agent.

This approach is beneficial for:

Organizing Related Tools: Grouping tools that serve a common purpose (e.g., all tools for mathematical operations, or all tools interacting with a specific API).
Dynamic Tool Availability: Enabling an agent to have different tools available based on the current context (e.g., user permissions, session state, or other runtime conditions). The get_tools method of a toolset can decide which tools to expose.
Integrating External Tool Providers: Toolsets can act as adapters for tools coming from external systems, like an OpenAPI specification or an MCP server, converting them into ADK-compatible BaseTool objects.
The BaseToolset Interface¶
Any class acting as a toolset in ADK should implement the BaseToolset abstract base class. This interface primarily defines two methods:

async def get_tools(...) -> list[BaseTool]: This is the core method of a toolset. When an ADK agent needs to know its available tools, it will call get_tools() on each BaseToolset instance provided in its tools list.

It receives an optional readonly_context (an instance of ReadonlyContext). This context provides read-only access to information like the current session state (readonly_context.state), agent name, and invocation ID. The toolset can use this context to dynamically decide which tools to return.
It must return a list of BaseTool instances (e.g., FunctionTool, RestApiTool).
async def close(self) -> None: This asynchronous method is called by the ADK framework when the toolset is no longer needed, for example, when an agent server is shutting down or the Runner is being closed. Implement this method to perform any necessary cleanup, such as closing network connections, releasing file handles, or cleaning up other resources managed by the toolset.

Using Toolsets with Agents¶
You can include instances of your BaseToolset implementations directly in an LlmAgent's tools list, alongside individual BaseTool instances.

When the agent initializes or needs to determine its available capabilities, the ADK framework will iterate through the tools list:

If an item is a BaseTool instance, it's used directly.
If an item is a BaseToolset instance, its get_tools() method is called (with the current ReadonlyContext), and the returned list of BaseTools is added to the agent's available tools.
Example: A Simple Math Toolset¶
Let's create a basic example of a toolset that provides simple arithmetic operations.

# 1. Define the individual tool functions

def add_numbers(a: int, b: int, tool_context: ToolContext) -> Dict[str, Any]:
"""Adds two integer numbers.
Args:
a: The first number.
b: The second number.
Returns:
A dictionary with the sum, e.g., {'status': 'success', 'result': 5}
"""
print(f"Tool: add_numbers called with a={a}, b={b}")
result = a + b # Example: Storing something in tool_context state
tool_context.state["last_math_operation"] = "addition"
return {"status": "success", "result": result}

def subtract_numbers(a: int, b: int) -> Dict[str, Any]:
"""Subtracts the second number from the first.
Args:
a: The first number.
b: The second number.
Returns:
A dictionary with the difference, e.g., {'status': 'success', 'result': 1}
"""
print(f"Tool: subtract_numbers called with a={a}, b={b}")
return {"status": "success", "result": a - b}

# 2. Create the Toolset by implementing BaseToolset

class SimpleMathToolset(BaseToolset):
def **init**(self, prefix: str = "math\_"):
self.prefix = prefix # Create FunctionTool instances once
self.\_add_tool = FunctionTool(
func=add_numbers,
name=f"{self.prefix}add_numbers", # Toolset can customize names
)
self.\_subtract_tool = FunctionTool(
func=subtract_numbers, name=f"{self.prefix}subtract_numbers"
)
print(f"SimpleMathToolset initialized with prefix '{self.prefix}'")

    async def get_tools(
        self, readonly_context: Optional[ReadonlyContext] = None
    ) -> List[BaseTool]:
        print(f"SimpleMathToolset.get_tools() called.")
        # Example of dynamic behavior:
        # Could use readonly_context.state to decide which tools to return
        # For instance, if readonly_context.state.get("enable_advanced_math"):
        #    return [self._add_tool, self._subtract_tool, self._multiply_tool]

        # For this simple example, always return both tools
        tools_to_return = [self._add_tool, self._subtract_tool]
        print(f"SimpleMathToolset providing tools: {[t.name for t in tools_to_return]}")
        return tools_to_return

    async def close(self) -> None:
        # No resources to clean up in this simple example
        print(f"SimpleMathToolset.close() called for prefix '{self.prefix}'.")
        await asyncio.sleep(0)  # Placeholder for async cleanup if needed

# 3. Define an individual tool (not part of the toolset)

def greet_user(name: str = "User") -> Dict[str, str]:
"""Greets the user."""
print(f"Tool: greet_user called with name={name}")
return {"greeting": f"Hello, {name}!"}

greet_tool = FunctionTool(func=greet_user)

# 4. Instantiate the toolset

math*toolset_instance = SimpleMathToolset(prefix="calculator*")

# 5. Define an agent that uses both the individual tool and the toolset

calculator_agent = LlmAgent(
name="CalculatorAgent",
model="gemini-2.0-flash", # Replace with your desired model
instruction="You are a helpful calculator and greeter. "
"Use 'greet_user' for greetings. "
"Use 'calculator_add_numbers' to add and 'calculator_subtract_numbers' to subtract. "
"Announce the state of 'last_math_operation' if it's set.",
tools=[greet_tool, math_toolset_instance], # Individual tool # Toolset instance
)
In this example:

SimpleMathToolset implements BaseToolset and its get_tools() method returns FunctionTool instances for add_numbers and subtract_numbers. It also customizes their names using a prefix.
The calculator_agent is configured with both an individual greet_tool and an instance of SimpleMathToolset.
When calculator_agent is run, ADK will call math_toolset_instance.get_tools(). The agent's LLM will then have access to greet_user, calculator_add_numbers, and calculator_subtract_numbers to handle user requests.
The add_numbers tool demonstrates writing to tool_context.state, and the agent's instruction mentions reading this state.
The close() method is called to ensure any resources held by the toolset are released.
Toolsets offer a powerful way to organize, manage, and dynamically provide collections of tools to your ADK agents, leading to more modular, maintainable, and adaptable agentic applications.

---

Function tools¶
When pre-built ADK tools don't meet your requirements, you can create custom function tools. Building function tools allows you to create tailored functionality, such as connecting to proprietary databases or implementing unique algorithms. For example, a function tool, myfinancetool, might be a function that calculates a specific financial metric. ADK also supports long running functions, so if that calculation takes a while, the agent can continue working on other tasks.

ADK offers several ways to create functions tools, each suited to different levels of complexity and control:

Function Tools
Long Running Function Tools
Agents-as-a-Tool
Function Tools¶
Transforming a Python function into a tool is a straightforward way to integrate custom logic into your agents. When you assign a function to an agent’s tools list, the framework automatically wraps it as a FunctionTool.

How it Works¶
The ADK framework automatically inspects your Python function's signature—including its name, docstring, parameters, type hints, and default values—to generate a schema. This schema is what the LLM uses to understand the tool's purpose, when to use it, and what arguments it requires.

Defining Function Signatures¶
A well-defined function signature is crucial for the LLM to use your tool correctly.

Parameters¶
You can define functions with required parameters, optional parameters, and variadic arguments. Here’s how each is handled:

Required Parameters¶
A parameter is considered required if it has a type hint but no default value. The LLM must provide a value for this argument when it calls the tool.

Example: Required Parameters

Python

def get_weather(city: str, unit: str):
"""
Retrieves the weather for a city in the specified unit.

    Args:
        city (str): The city name.
        unit (str): The temperature unit, either 'Celsius' or 'Fahrenheit'.
    """
    # ... function logic ...
    return {"status": "success", "report": f"Weather for {city} is sunny."}

In this example, both city and unit are mandatory. If the LLM tries to call get_weather without one of them, the ADK will return an error to the LLM, prompting it to correct the call.

Optional Parameters with Default Values¶
A parameter is considered optional if you provide a default value. This is the standard Python way to define optional arguments. The ADK correctly interprets these and does not list them in the required field of the tool schema sent to the LLM.

Example: Optional Parameter with Default Value

Python

def search_flights(destination: str, departure_date: str, flexible_days: int = 0):
"""
Searches for flights.

    Args:
        destination (str): The destination city.
        departure_date (str): The desired departure date.
        flexible_days (int, optional): Number of flexible days for the search. Defaults to 0.
    """
    # ... function logic ...
    if flexible_days > 0:
        return {"status": "success", "report": f"Found flexible flights to {destination}."}
    return {"status": "success", "report": f"Found flights to {destination} on {departure_date}."}

Here, flexible_days is optional. The LLM can choose to provide it, but it's not required.

Optional Parameters with typing.Optional¶
You can also mark a parameter as optional using typing.Optional[SomeType] or the | None syntax (Python 3.10+). This signals that the parameter can be None. When combined with a default value of None, it behaves as a standard optional parameter.

Example: typing.Optional

Python

from typing import Optional

def create_user_profile(username: str, bio: Optional[str] = None):
"""
Creates a new user profile.

    Args:
        username (str): The user's unique username.
        bio (str, optional): A short biography for the user. Defaults to None.
    """
    # ... function logic ...
    if bio:
        return {"status": "success", "message": f"Profile for {username} created with a bio."}
    return {"status": "success", "message": f"Profile for {username} created."}

Variadic Parameters (*args and \*\*kwargs)¶
While you can include*args (variable positional arguments) and\*\*kwargs (variable keyword arguments) in your function signature for other purposes, they are ignored by the ADK framework when generating the tool schema for the LLM. The LLM will not be aware of them and cannot pass arguments to them. It's best to rely on explicitly defined parameters for all data you expect from the LLM.

Return Type¶
The preferred return type for a Function Tool is a dictionary in Python or Map in Java. This allows you to structure the response with key-value pairs, providing context and clarity to the LLM. If your function returns a type other than a dictionary, the framework automatically wraps it into a dictionary with a single key named "result".

Strive to make your return values as descriptive as possible. For example, instead of returning a numeric error code, return a dictionary with an "error_message" key containing a human-readable explanation. Remember that the LLM, not a piece of code, needs to understand the result. As a best practice, include a "status" key in your return dictionary to indicate the overall outcome (e.g., "success", "error", "pending"), providing the LLM with a clear signal about the operation's state.

Docstrings¶
The docstring of your function serves as the tool's description and is sent to the LLM. Therefore, a well-written and comprehensive docstring is crucial for the LLM to understand how to use the tool effectively. Clearly explain the purpose of the function, the meaning of its parameters, and the expected return values.

Passing Data Between Tools¶
When an agent calls multiple tools in a sequence, you might need to pass data from one tool to another. The recommended way to do this is by using the temp: prefix in the session state.

A tool can write data to a temp: variable, and a subsequent tool can read it. This data is only available for the current invocation and is discarded afterwards.

Shared Invocation Context

All tool calls within a single agent turn share the same InvocationContext. This means they also share the same temporary (temp:) state, which is how data can be passed between them.

Example¶
Example
Best Practices¶
While you have considerable flexibility in defining your function, remember that simplicity enhances usability for the LLM. Consider these guidelines:

Fewer Parameters are Better: Minimize the number of parameters to reduce complexity.
Simple Data Types: Favor primitive data types like str and int over custom classes whenever possible.
Meaningful Names: The function's name and parameter names significantly influence how the LLM interprets and utilizes the tool. Choose names that clearly reflect the function's purpose and the meaning of its inputs. Avoid generic names like do_stuff() or beAgent().
Build for Parallel Execution: Improve function calling performance when multiple tools are run by building for asynchronous operation. For information on enabling parallel execution for tools, see Increase tool performance with parallel execution.
Long Running Function Tools¶
Designed for tasks that require a significant amount of processing time without blocking the agent's execution. This tool is a subclass of FunctionTool.

When using a LongRunningFunctionTool, your function can initiate the long-running operation and optionally return an initial result (e.g., the long-running operation id). Once a long running function tool is invoked the agent runner will pause the agent run and let the agent client to decide whether to continue or wait until the long-running operation finishes. The agent client can query the progress of the long-running operation and send back an intermediate or final response. The agent can then continue with other tasks. An example is the human-in-the-loop scenario where the agent needs human approval before proceeding with a task.

Tip: Parallel execution

Depending on the type of tool you are building, designing for asychronous operation may be a better solution than creating a long running tool. For more information, see Increase tool performance with parallel execution.

How it Works¶
In Python, you wrap a function with LongRunningFunctionTool. In Java, you pass a Method name to LongRunningFunctionTool.create().

Initiation: When the LLM calls the tool, your function starts the long-running operation.

Initial Updates: Your function should optionally return an initial result (e.g. the long-running operaiton id). The ADK framework takes the result and sends it back to the LLM packaged within a FunctionResponse. This allows the LLM to inform the user (e.g., status, percentage complete, messages). And then the agent run is ended / paused.

Continue or Wait: After each agent run is completed. Agent client can query the progress of the long-running operation and decide whether to continue the agent run with an intermediate response (to update the progress) or wait until a final response is retrieved. Agent client should send the intermediate or final response back to the agent for the next run.

Framework Handling: The ADK framework manages the execution. It sends the intermediate or final FunctionResponse sent by agent client to the LLM to generate a user friendly message.

Creating the Tool¶
Define your tool function and wrap it using the LongRunningFunctionTool class:

Python
Java

# 1. Define the long running function

def ask_for_approval(
purpose: str, amount: float
) -> dict[str, Any]:
"""Ask for approval for the reimbursement.""" # create a ticket for the approval # Send a notification to the approver with the link of the ticket
return {'status': 'pending', 'approver': 'Sean Zhou', 'purpose' : purpose, 'amount': amount, 'ticket-id': 'approval-ticket-1'}

def reimburse(purpose: str, amount: float) -> str:
"""Reimburse the amount of money to the employee.""" # send the reimbrusement request to payment vendor
return {'status': 'ok'}

# 2. Wrap the function with LongRunningFunctionTool

long_running_tool = LongRunningFunctionTool(func=ask_for_approval)

Intermediate / Final result Updates¶
Agent client received an event with long running function calls and check the status of the ticket. Then Agent client can send the intermediate or final response back to update the progress. The framework packages this value (even if it's None) into the content of the FunctionResponse sent back to the LLM.

Applies to only Java ADK

Python
Java

# Agent Interaction

async def call_agent_async(query):

    def get_long_running_function_call(event: Event) -> types.FunctionCall:
        # Get the long running function call from the event
        if not event.long_running_tool_ids or not event.content or not event.content.parts:
            return
        for part in event.content.parts:
            if (
                part
                and part.function_call
                and event.long_running_tool_ids
                and part.function_call.id in event.long_running_tool_ids
            ):
                return part.function_call

    def get_function_response(event: Event, function_call_id: str) -> types.FunctionResponse:
        # Get the function response for the fuction call with specified id.
        if not event.content or not event.content.parts:
            return
        for part in event.content.parts:
            if (
                part
                and part.function_response
                and part.function_response.id == function_call_id
            ):
                return part.function_response

    content = types.Content(role='user', parts=[types.Part(text=query)])
    session, runner = await setup_session_and_runner()

    print("\nRunning agent...")
    events_async = runner.run_async(
        session_id=session.id, user_id=USER_ID, new_message=content
    )


    long_running_function_call, long_running_function_response, ticket_id = None, None, None
    async for event in events_async:
        # Use helper to check for the specific auth request event
        if not long_running_function_call:
            long_running_function_call = get_long_running_function_call(event)
        else:
            _potential_response = get_function_response(event, long_running_function_call.id)
            if _potential_response: # Only update if we get a non-None response
                long_running_function_response = _potential_response
                ticket_id = long_running_function_response.response['ticket-id']
        if event.content and event.content.parts:
            if text := ''.join(part.text or '' for part in event.content.parts):
                print(f'[{event.author}]: {text}')


    if long_running_function_response:
        # query the status of the correpsonding ticket via tciket_id
        # send back an intermediate / final response
        updated_response = long_running_function_response.model_copy(deep=True)
        updated_response.response = {'status': 'approved'}
        async for event in runner.run_async(
          session_id=session.id, user_id=USER_ID, new_message=types.Content(parts=[types.Part(function_response = updated_response)], role='user')
        ):
            if event.content and event.content.parts:
                if text := ''.join(part.text or '' for part in event.content.parts):
                    print(f'[{event.author}]: {text}')

Python complete example: File Processing Simulation
Key aspects of this example¶
LongRunningFunctionTool: Wraps the supplied method/function; the framework handles sending yielded updates and the final return value as sequential FunctionResponses.

Agent instruction: Directs the LLM to use the tool and understand the incoming FunctionResponse stream (progress vs. completion) for user updates.

Final return: The function returns the final result dictionary, which is sent in the concluding FunctionResponse to indicate completion.

Agent-as-a-Tool¶
This powerful feature allows you to leverage the capabilities of other agents within your system by calling them as tools. The Agent-as-a-Tool enables you to invoke another agent to perform a specific task, effectively delegating responsibility. This is conceptually similar to creating a Python function that calls another agent and uses the agent's response as the function's return value.

Key difference from sub-agents¶
It's important to distinguish an Agent-as-a-Tool from a Sub-Agent.

Agent-as-a-Tool: When Agent A calls Agent B as a tool (using Agent-as-a-Tool), Agent B's answer is passed back to Agent A, which then summarizes the answer and generates a response to the user. Agent A retains control and continues to handle future user input.

Sub-agent: When Agent A calls Agent B as a sub-agent, the responsibility of answering the user is completely transferred to Agent B. Agent A is effectively out of the loop. All subsequent user input will be answered by Agent B.

Usage¶
To use an agent as a tool, wrap the agent with the AgentTool class.

Python
Java

tools=[AgentTool(agent=agent_b)]

Customization¶
The AgentTool class provides the following attributes for customizing its behavior:

skip_summarization: bool: If set to True, the framework will bypass the LLM-based summarization of the tool agent's response. This can be useful when the tool's response is already well-formatted and requires no further processing.
Example
How it works¶
When the main_agent receives the long text, its instruction tells it to use the 'summarize' tool for long texts.
The framework recognizes 'summarize' as an AgentTool that wraps the summary_agent.
Behind the scenes, the main_agent will call the summary_agent with the long text as input.
The summary_agent will process the text according to its instruction and generate a summary.
The response from the summary_agent is then passed back to the main_agent.
The main_agent can then take the summary and formulate its final response to the user (e.g., "Here's a summary of the text: ...")

---

Increase tool performance with parallel execution¶
Starting with Agent Development Kit (ADK) version 1.10.0, the framework attempts to run any agent-requested function tools in parallel. This behavior can significantly improve the performance and responsiveness of your agents, particularly for agents that rely on multiple external APIs or long-running tasks. For example, if you have 3 tools that each take 2 seconds, by running them in parallel, the total execution time will be closer to 2 seconds, instead of 6 seconds. The ability to run tool functions parallel can improve the performance of your agents, particularly in the following scenarios:

Research tasks: Where the agent collects information from multiple sources before proceeding to the next stage of the workflow.
API calls: Where the agent accesses several APIs independently, such as searching for available flights using APIs from multiple airlines.
Publishing and communication tasks: When the agent needs to publish or communicate through multiple, independent channels or multiple recipients.
However, your custom tools must be built with asynchronous execution support to enable this performance improvement. This guide explains how parallel tool execution works in the ADK and how to build your tools to take full advantage of this processing feature.

Warning

Any ADK Tools that use synchronous processing in a set of tool function calls will block other tools from executing in parallel, even if the other tools allow for parallel execution.

Build parallel-ready tools¶
Enable parallel execution of your tool functions by defining them as asynchronous functions. In Python code, this means using async def and await syntax which allows the ADK to run them concurrently in an asyncio event loop. The following sections show examples of agent tools built for parallel processing and asynchronous operations.

Example of http web call¶
The following code example show how to modify the get_weather() function to operate asynchronously and allow for parallel execution:

async def get_weather(city: str) -> dict:
async with aiohttp.ClientSession() as session:
async with session.get(f"<http://api.weather.com/{city}>") as response:
return await response.json()
Example of database call¶
The following code example show how to write a database calling function to operate asynchronously:

async def query_database(query: str) -> list:
async with asyncpg.connect("postgresql://...") as conn:
return await conn.fetch(query)
Example of yielding behavior for long loops¶
In cases where a tool is processing multiple requests or numerous long running requests, consider adding yielding code to allow other tools to execute, as shown in the following code sample:

async def process_data(data: list) -> dict:
results = []
for i, item in enumerate(data):
processed = await process_item(item) # Yield point
results.append(processed)

          # Add periodic yield points for long loops
          if i % 100 == 0:
              await asyncio.sleep(0)  # Yield control
      return {"results": results}

Important

Use the asyncio.sleep() function for pauses to avoid blocking execution of other functions.

Example of thread pools for intensive operations¶
When performing processing-intensive functions, consider creating thread pools for better management of available computing resources, as shown in the following example:

async def cpu_intensive_tool(data: list) -> dict:
loop = asyncio.get_event_loop()

      # Use thread pool for CPU-bound work
      with ThreadPoolExecutor() as executor:
          result = await loop.run_in_executor(
              executor,
              expensive_computation,
              data
          )
      return {"result": result}

Example of process chunking¶
When performing processes on long lists or large amounts of data, consider combining a thread pool technique with dividing up processing into chunks of data, and yielding processing time between the chunks, as shown in the following example:

async def process_large_dataset(dataset: list) -> dict:
results = []
chunk_size = 1000

      for i in range(0, len(dataset), chunk_size):
          chunk = dataset[i:i + chunk_size]

          # Process chunk in thread pool
          loop = asyncio.get_event_loop()
          with ThreadPoolExecutor() as executor:
              chunk_result = await loop.run_in_executor(
                  executor, process_chunk, chunk
              )

          results.extend(chunk_result)

          # Yield control between chunks
          await asyncio.sleep(0)

      return {"total_processed": len(results), "results": results}

Write parallel-ready prompts and tool descriptions¶
When building prompts for AI models, consider explicitly specifying or hinting that function calls be made in parallel. The following example of an AI prompt directs the model to use tools in parallel:

When users ask for multiple pieces of information, always call functions in
parallel.

Examples:

- "Get weather for London and currency rate USD to EUR" → Call both functions
  simultaneously
- "Compare cities A and B" → Call get_weather, get_population, get_distance in
  parallel
- "Analyze multiple stocks" → Call get_stock_price for each stock in parallel

  Always prefer multiple specific function calls over single complex calls.
  The following example shows a tool function description that hints at more efficient use through parallel execution:

async def get_weather(city: str) -> dict:
"""Get current weather for a single city.

      This function is optimized for parallel execution - call multiple times for different cities.

      Args:
          city: Name of the city, for example: 'London', 'New York'

      Returns:
          Weather data including temperature, conditions, humidity
      """
      await asyncio.sleep(2)  # Simulate API call
      return {"city": city, "temp": 72, "condition": "sunny"}

Next steps¶
For more information on building Tools for agents and function calling, see Function Tools. For more detailed examples of tools that take advantage of parallel processing, see the samples in the adk-python repository.

---
