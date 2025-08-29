========================
CODE SNIPPETS
========================
TITLE: Example LangGraph Project Directory Structure
DESCRIPTION: This `bash` snippet illustrates a recommended directory structure for a LangGraph application. It organizes source code, utilities (tools, nodes, state), the main agent graph, `package.json`, environment variables, and the `langgraph.json` configuration file.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_5

LANGUAGE: Bash
CODE:

```
my-app/
├── src # all project code lies within here
│   ├── utils # optional utilities for your graph
│   │   ├── tools.ts # tools for your graph
│   │   ├── nodes.ts # node functions for you graph
│   │   └── state.ts # state definition of your graph
│   └── agent.ts # code for constructing your graph
├── package.json # package dependencies
├── .env # environment variables
└── langgraph.json # configuration file for LangGraph
```

---

TITLE: Install LangGraph and LangChain dependencies
DESCRIPTION: Instructions for installing the necessary Python and JavaScript packages for LangGraph and LangChain, including Anthropic integrations.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/agents/agents.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install -U langgraph "langchain[anthropic]"
```

LANGUAGE: bash
CODE:

```
npm install @langchain/langgraph @langchain/core @langchain/anthropic
```

---

TITLE: Example LangGraph Application Configuration File
DESCRIPTION: This JSON snippet provides an example of the `langgraph.json` configuration file. It specifies the Node.js version, Dockerfile lines, project dependencies, and maps graph names (e.g., 'agent') to their respective TypeScript file paths and exported variable names.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_6

LANGUAGE: JSON
CODE:

```
{
  "node_version": "20",
  "dockerfile_lines": [],
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:graph"
  },
  "env": ".env"
}
```

---

TITLE: Python LangGraph Control Plane API Orchestration Example Setup
DESCRIPTION: Partial Python code demonstrating the initial setup for orchestrating LangGraph Control Plane APIs, including loading environment variables and importing necessary libraries. The full example would cover deployment creation, update, and deletion.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/reference/api/api_ref_control_plane.md#_snippet_5

LANGUAGE: python
CODE:

```
import os
import time

import requests
from dotenv import load_dotenv


load_dotenv()
```

---

TITLE: Defining LangGraph.js Project Dependencies in package.json
DESCRIPTION: An example `package.json` file demonstrating how to declare core LangChain and LangGraph dependencies for a LangGraph.js application. These dependencies are automatically installed during deployment.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_1

LANGUAGE: JSON
CODE:

```
{
  "name": "langgraphjs-studio-starter",
  "packageManager": "yarn@1.22.22",
  "dependencies": {
    "@langchain/community": "^0.2.31",
    "@langchain/core": "^0.2.31",
    "@langchain/langgraph": "^0.2.0",
    "@langchain/openai": "^0.2.8"
  }
}
```

---

TITLE: Serve Documentation Locally (make)
DESCRIPTION: This `make` command starts a local web server to host the project's documentation. It makes the documentation accessible in a web browser, typically at `http://127.0.0.1:8000/langgraph/`.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
make serve-docs
```

---

TITLE: LangGraph.js Application Project Structure
DESCRIPTION: Illustrates the recommended directory and file organization for a LangGraph.js application, including source code, configuration files, and dependency manifests, essential for deployment.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_0

LANGUAGE: Bash
CODE:

```
my-app/
├── src # all project code lies within here
│   ├── utils # optional utilities for your graph
│   │   ├── tools.ts # tools for your graph
│   │   ├── nodes.ts # node functions for you graph
│   │   └── state.ts # state definition of your graph
│   └── agent.ts # code for constructing your graph
├── package.json # package dependencies
├── .env # environment variables
└── langgraph.json # configuration file for LangGraph
```

---

TITLE: Install LangGraph and LangChain Prerequisites
DESCRIPTION: Installs the necessary Python packages, including `langgraph`, `langchain-openai`, and `langchain`, required to run the examples in this guide. The `%%capture` magic command suppresses output.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/memory/semantic-search.ipynb#_snippet_0

LANGUAGE: python
CODE:

```
%%capture --no-stderr
%pip install -U langgraph langchain-openai langchain
```

---

TITLE: LangGraph Agent Definition Example (agent.py)
DESCRIPTION: An example Python file (`agent.py`) demonstrating the initial structure for defining a LangGraph agent. It shows essential imports for `StateGraph`, `END`, `START`, and custom utility modules containing node functions and state definitions, which are crucial for constructing the graph.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_pyproject.md#_snippet_6

LANGUAGE: python
CODE:

```
# my_agent/agent.py
from typing import Literal
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, END, START
from my_agent.utils.nodes import call_model, should_continue, tool_node # import nodes
from my_agent.utils.state import AgentState # import state
```

---

TITLE: Run LangGraph Development Server (JavaScript)
DESCRIPTION: Installs Node.js dependencies for the LangGraph project using `npm install` and then starts the development server using the `npm run langgraph dev` command.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/auth/getting_started.md#_snippet_3

LANGUAGE: shell
CODE:

```
npm install
npm run langgraph dev
```

---

TITLE: LangGraph Server Local Launch Output Example
DESCRIPTION: This snippet displays the typical console output when the LangGraph server successfully starts locally. It provides URLs for the API, documentation, and the LangGraph Studio Web UI for interaction and debugging.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/langgraph-platform/local-server.md#_snippet_5

LANGUAGE: Shell
CODE:

```
>    Ready!
>
>    - API: [http://localhost:2024](http://localhost:2024/)
>
>    - Docs: http://localhost:2024/docs
>
>    - LangGraph Studio Web UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
```

---

TITLE: Install Documentation Build Requirements (uv)
DESCRIPTION: This command uses `uv` to synchronize and install the necessary dependencies for building the project's documentation. It specifically targets the 'test' group of dependencies.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
uv sync --group test
```

---

TITLE: Setup LangGraph Client and Create Thread
DESCRIPTION: This snippet demonstrates how to initialize the LangGraph client and create a new thread for an agent. It provides examples for Python, Javascript, and cURL, showing how to connect to a specified deployment URL and create a new conversational thread.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/how-tos/background_run.md#_snippet_0

LANGUAGE: Python
CODE:

```
from langgraph_sdk import get_client

client = get_client(url=<DEPLOYMENT_URL>)
# Using the graph deployed with the name "agent"
assistant_id = "agent"
# create thread
thread = await client.threads.create()
print(thread)
```

LANGUAGE: Javascript
CODE:

```
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: <DEPLOYMENT_URL> });
// Using the graph deployed with the name "agent"
const assistantID = "agent";
// create thread
const thread = await client.threads.create();
console.log(thread);
```

LANGUAGE: CURL
CODE:

```
curl --request POST \
  --url <DEPLOYMENT_URL>/threads \
  --header 'Content-Type: application/json' \
  --data '{}'
```

---

TITLE: Example LangGraph Python API Server Dockerfile
DESCRIPTION: An example Dockerfile generated for a Python-based LangGraph Platform API server. This Dockerfile sets up the base image, adds pip configuration, installs Python dependencies from constraints, copies graph definitions, and sets environment variables for the LangServe graphs.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/reference/cli.md#_snippet_26

LANGUAGE: Dockerfile
CODE:

```
FROM langchain/langgraph-api:3.11

ADD ./pipconf.txt /pipconfig.txt

RUN PIP_CONFIG_FILE=/pipconfig.txt PYTHONDONTWRITEBYTECODE=1 pip install --no-cache-dir -c /api/constraints.txt langchain_community langchain_anthropic langchain_openai wikipedia scikit-learn

ADD ./graphs /deps/__outer_graphs/src
RUN set -ex && \
    for line in '[project]' \
                'name = "graphs"' \
                'version = "0.1"' \
                '[tool.setuptools.package-data]' \
                '"*" = ["**/*"]'; do \
        echo "$line" >> /deps/__outer_graphs/pyproject.toml; \
    done

RUN PIP_CONFIG_FILE=/pipconfig.txt PYTHONDONTWRITEBYTECODE=1 pip install --no-cache-dir -c /api/constraints.txt -e /deps/*

ENV LANGSERVE_GRAPHS='{"agent": "/deps/__outer_graphs/src/agent.py:graph", "storm": "/deps/__outer_graphs/src/storm.py:graph"}'
```

---

TITLE: Configuring Environment Variables in a .env File
DESCRIPTION: An example `.env` file illustrating how to define environment variables, including sensitive API keys, for a LangGraph.js application. These variables are loaded at runtime for application configuration.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_3

LANGUAGE: Shell
CODE:

```
MY_ENV_VAR_1=foo
MY_ENV_VAR_2=bar
OPENAI_API_KEY=key
TAVILY_API_KEY=key_2
```

---

TITLE: Run LangGraph Development Server (Python)
DESCRIPTION: Installs local Python dependencies for the LangGraph project in editable mode and then starts the development server using the `langgraph dev` command.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/auth/getting_started.md#_snippet_2

LANGUAGE: shell
CODE:

```
pip install -e .
langgraph dev
```

---

TITLE: LangGraph Package Ecosystem and Installation
DESCRIPTION: This section outlines the various packages within the LangGraph ecosystem, describing their specific focus and providing the necessary `pip install` commands for their installation. It serves as a guide for setting up the development environment with the required LangGraph components for agent development.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/agents/overview.md#_snippet_0

LANGUAGE: APIDOC
CODE:

```
Package: langgraph-prebuilt (part of langgraph)
  Description: Prebuilt components to create agents
  Installation: pip install -U langgraph langchain

Package: langgraph-supervisor
  Description: Tools for building supervisor agents
  Installation: pip install -U langgraph-supervisor

Package: langgraph-swarm
  Description: Tools for building a swarm multi-agent system
  Installation: pip install -U langgraph-swarm

Package: langchain-mcp-adapters
  Description: Interfaces to MCP servers for tool and resource integration
  Installation: pip install -U langchain-mcp-adapters

Package: langmem
  Description: Agent memory management: short-term and long-term
  Installation: pip install -U langmem

Package: agentevals
  Description: Utilities to evaluate agent performance
  Installation: pip install -U agentevals
```

---

TITLE: Example LangGraph JavaScript API Server Dockerfile
DESCRIPTION: An example Dockerfile generated for a JavaScript-based LangGraph Platform API server. This Dockerfile sets up the base image, copies project files, installs JavaScript dependencies using yarn, sets environment variables for LangServe graphs, and runs a prebuild script if available.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/reference/cli.md#_snippet_28

LANGUAGE: Dockerfile
CODE:

```
FROM langchain/langgraphjs-api:20

ADD . /deps/agent

RUN cd /deps/agent && yarn install

ENV LANGSERVE_GRAPHS='{"agent":"./src/react_agent/graph.ts:graph"}'

WORKDIR /deps/agent

RUN (test ! -f /api/langgraph_api/js/build.mts && echo "Prebuild script not found, skipping") || tsx /api/langgraph_api/js/build.mts
```

---

TITLE: Full Multi-Agent System Example for Travel Booking in Python
DESCRIPTION: A comprehensive Python example demonstrating a multi-agent system for travel booking. It includes utility functions for pretty printing messages, a generic `create_handoff_tool` for transferring control between agents, and placeholder booking functions for hotels and flights, showcasing the full setup of a LangGraph application.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/multi_agent.md#_snippet_8

LANGUAGE: python
CODE:

```
from typing import Annotated
from langchain_core.messages import convert_to_messages
from langchain_core.tools import tool, InjectedToolCallId
from langgraph.prebuilt import create_react_agent, InjectedState
from langgraph.graph import StateGraph, START, MessagesState
from langgraph.types import Command

# We'll use `pretty_print_messages` helper to render the streamed agent outputs nicely

def pretty_print_message(message, indent=False):
    pretty_message = message.pretty_repr(html=True)
    if not indent:
        print(pretty_message)
        return

    indented = "\n".join("\t" + c for c in pretty_message.split("\n"))
    print(indented)


def pretty_print_messages(update, last_message=False):
    is_subgraph = False
    if isinstance(update, tuple):
        ns, update = update
        # skip parent graph updates in the printouts
        if len(ns) == 0:
            return

        graph_id = ns[-1].split(":")[0]
        print(f"Update from subgraph {graph_id}:")
        print("\n")
        is_subgraph = True

    for node_name, node_update in update.items():
        update_label = f"Update from node {node_name}:"
        if is_subgraph:
            update_label = "\t" + update_label

        print(update_label)
        print("\n")

        messages = convert_to_messages(node_update["messages"])
        if last_message:
            messages = messages[-1:]

        for m in messages:
            pretty_print_message(m, indent=is_subgraph)
        print("\n")


def create_handoff_tool(*, agent_name: str, description: str | None = None):
    name = f"transfer_to_{agent_name}"
    description = description or f"Transfer to {agent_name}"

    @tool(name, description=description)
    def handoff_tool(
        state: Annotated[MessagesState, InjectedState],
        tool_call_id: Annotated[str, InjectedToolCallId],
    ) -> Command:
        tool_message = {
            "role": "tool",
            "content": f"Successfully transferred to {agent_name}",
            "name": name,
            "tool_call_id": tool_call_id,
        }
        return Command(
            goto=agent_name,
            update={"messages": state["messages"] + [tool_message]},
            graph=Command.PARENT,
        )
    return handoff_tool

# Handoffs
transfer_to_hotel_assistant = create_handoff_tool(
    agent_name="hotel_assistant",
    description="Transfer user to the hotel-booking assistant.",
)
transfer_to_flight_assistant = create_handoff_tool(
    agent_name="flight_assistant",
    description="Transfer user to the flight-booking assistant.",
)

# Simple agent tools
def book_hotel(hotel_name: str):
    """Book a hotel"""
    return f"Successfully booked a stay at {hotel_name}."

def book_flight(from_airport: str, to_airport: str):
    """Book a flight"""
```

---

TITLE: Example of Initial LangGraph State
DESCRIPTION: This snippet provides an example of an initial state for a LangGraph, illustrating the structure of the `foo` (integer) and `bar` (list of strings) channels as defined in the state schema. This state serves as a starting point before any updates are applied.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/concepts/persistence.md#_snippet_11

LANGUAGE: python
CODE:

```
{"foo": 1, "bar": ["a"]}
```

LANGUAGE: typescript
CODE:

```
{ foo: 1, bar: ["a"] }
```

---

TITLE: Compatible LangChain and LangGraph Package Version Ranges
DESCRIPTION: Specifies the compatible version ranges for essential `@langchain` and `@langgraph` packages required for successful deployment of a LangGraph.js application, ensuring compatibility with the platform.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_2

LANGUAGE: Shell
CODE:

```
"@langchain/core": "^0.3.42",
"@langchain/langgraph": "^0.2.57",
"@langchain/langgraph-checkpoint": "~0.0.16",
```

---

TITLE: Define a LangGraph StateGraph
DESCRIPTION: This example demonstrates how to define a simple `StateGraph` using `langgraph.graph.StateGraph`. It sets up a state with `topic` and `joke`, defines two nodes (`refine_topic`, `generate_joke`), and connects them in a sequence from `START` to `END` to process a topic and generate a joke.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/how-tos/streaming.md#_snippet_7

LANGUAGE: python
CODE:

```
from typing import TypedDict
from langgraph.graph import StateGraph, START, END

class State(TypedDict):
  topic: str
  joke: str

def refine_topic(state: State):
    return {"topic": state["topic"] + " and cats"}

def generate_joke(state: State):
    return {"joke": f"This is a joke about {state['topic']}"}

graph = (
  StateGraph(State)
  .add_node(refine_topic)
  .add_node(generate_joke)
  .add_edge(START, "refine_topic")
  .add_edge("refine_topic", "generate_joke")
  .add_edge("generate_joke", END)
  .compile()
)
```

---

TITLE: Execute Notebooks Without Pip Installs (Bash)
DESCRIPTION: This sequence of commands executes notebooks while skipping `%pip install` cells. The `prepare_notebooks_for_ci.py` script is run with the `--comment-install-cells` flag to disable installation steps, followed by the `execute_notebooks.sh` script.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/README.md#_snippet_3

LANGUAGE: bash
CODE:

```
python _scripts/prepare_notebooks_for_ci.py --comment-install-cells
./_scripts/execute_notebooks.sh
```

---

TITLE: Initialize LangGraph Agent in Python (agent.py)
DESCRIPTION: This Python code snippet demonstrates the initial setup of an `agent.py` file, which is central to defining a LangGraph application. It shows essential imports for state management (`TypedDict`, `AgentState`) and graph components (`StateGraph`, `END`, `START`, `call_model`, `should_continue`, `tool_node`), indicating how different modules contribute to the agent's construction.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup.md#_snippet_6

LANGUAGE: python
CODE:

```
# my_agent/agent.py
from typing import Literal
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, END, START
from my_agent.utils.nodes import call_model, should_continue, tool_node # import nodes
from my_agent.utils.state import AgentState # import state
```

---

TITLE: Install langgraph-supervisor for Python
DESCRIPTION: This command installs the `langgraph-supervisor` library, which is essential for building supervisor-based multi-agent systems in Python. It ensures all necessary dependencies are available for running the provided examples.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/agents/multi-agent.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install langgraph-supervisor
```

---

TITLE: Example LangGraph Configuration File (langgraph.json)
DESCRIPTION: This JSON snippet provides an example of the `langgraph.json` configuration file used by LangGraph. It specifies project dependencies, maps graph names to their Python file paths and variable names, and defines the location of the environment file. This configuration is crucial for deploying and running LangGraph applications.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup.md#_snippet_9

LANGUAGE: json
CODE:

```
{
  "dependencies": ["./my_agent"],
  "graphs": {
    "agent": "./my_agent/agent.py:graph"
  },
  "env": ".env"
}
```

---

TITLE: Install LangGraph CLI for Local Development
DESCRIPTION: Installs the LangGraph command-line interface with in-memory dependencies, enabling local server management and interaction. This is a prerequisite for running a local LangGraph development server.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/how-tos/studio/quick_start.md#_snippet_0

LANGUAGE: Python
CODE:

```
pip install -U "langgraph-cli[inmem]"
```

---

TITLE: Install LangGraph and AutoGen Dependencies
DESCRIPTION: Provides the command to install the necessary Python packages, `autogen` and `langgraph`, required to run the integration examples.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/autogen-integration-functional.ipynb#_snippet_1

LANGUAGE: Python
CODE:

```
%pip install autogen langgraph
```

---

TITLE: LangGraph TypeScript Application Setup with Postgres Checkpointer
DESCRIPTION: An example demonstrating the initial setup for a LangGraph application in TypeScript, including importing necessary modules, initializing `ChatAnthropic` model, and configuring `PostgresSaver`.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/memory/add-memory.md#_snippet_6

LANGUAGE: typescript
CODE:

```
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, MessagesZodState, START } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const model = new ChatAnthropic({ model: "claude-3-5-haiku-20241022" });

const DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable";
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await checkpointer.setup();
```

---

TITLE: Build and Serve LangGraph Documentation Locally
DESCRIPTION: Compiles the documentation and starts a local web server to preview the changes. This allows developers to verify the appearance and functionality of their documentation contributions before making a pull request.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/CONTRIBUTING.md#_snippet_2

LANGUAGE: bash
CODE:

```
make serve-docs
```

---

TITLE: Example LangGraph Project Directory Structure
DESCRIPTION: This `bash` snippet illustrates a recommended directory structure for a LangGraph application. It organizes source code, utilities (tools, nodes, state), the main agent graph, `package.json`, environment variables, and the `langgraph.json` configuration file.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_7

LANGUAGE: Bash
CODE:

```
my-app/
├── src # all project code lies within here
│   ├── utils # optional utilities for your graph
│   │   ├── tools.ts # tools for your graph
│   │   ├── nodes.ts # node functions for you graph
│   │   └── state.ts # state definition of your graph
│   └── agent.ts # code for constructing your graph
├── package.json # package dependencies
├── .env # environment variables
└── langgraph.json # configuration file for LangGraph
```

---

TITLE: Install LangGraph CLI
DESCRIPTION: Instructions for installing the LangGraph command-line interface using pip. Includes the standard installation for general use and a development mode installation with in-memory dependencies for hot reloading.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/libs/cli/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install langgraph-cli
```

LANGUAGE: bash
CODE:

```
pip install "langgraph-cli[inmem]"
```

---

TITLE: Install LangGraph Application Dependencies
DESCRIPTION: These commands navigate into the newly created LangGraph application directory and install its required dependencies. Python projects use `pip install -e .` for editable mode, and JavaScript projects use `npm install`.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/langgraph-platform/local-server.md#_snippet_2

LANGUAGE: Shell
CODE:

```
cd path/to/your/app
pip install -e .
```

LANGUAGE: Shell
CODE:

```
cd path/to/your/app
npm install
```

---

TITLE: Install LangGraph
DESCRIPTION: This command installs the LangGraph library using pip, ensuring you get the latest stable version. It's the first step to setting up your development environment for building stateful agents.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install -U langgraph
```

---

TITLE: Verify LangGraph CLI Installation
DESCRIPTION: Verifies the successful installation of the LangGraph CLI by running the help command. This command displays available options and confirms that the CLI is correctly installed and accessible in your system's PATH.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/reference/cli.md#_snippet_2

LANGUAGE: Bash
CODE:

```
langgraph --help
```

LANGUAGE: Bash
CODE:

```
npx @langchain/langgraph-cli --help
```

---

TITLE: Install LangGraph
DESCRIPTION: This command installs the LangGraph library using pip, ensuring you get the latest stable version. It's the first step to setting up your development environment for building stateful agents.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install -U langgraph
```

---

TITLE: Set the graph's entry point using START edge
DESCRIPTION: This code demonstrates how to define the starting point for graph execution using `add_edge`. The `START` constant indicates that the graph should begin processing at the 'chatbot' node whenever it is invoked.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/get-started/1-build-basic-chatbot.md#_snippet_5

LANGUAGE: python
CODE:

```
graph_builder.add_edge(START, "chatbot")
```

LANGUAGE: typescript
CODE:

```
import { StateGraph, MessagesZodState, START } from "@langchain/langgraph";
import { z } from "zod";

const State = z.object({ messages: MessagesZodState.shape.messages });

const graph = new StateGraph(State)
  .addNode("chatbot", async (state: z.infer<typeof State>) => {
    return { messages: [await llm.invoke(state.messages)] };
  })
  .addEdge(START, "chatbot")
  .compile();
```

---

TITLE: Install LangGraph and Langchain-OpenAI packages
DESCRIPTION: Installs the necessary Python packages for building a ReAct agent, including `langgraph` and `langchain-openai`, ensuring all dependencies are met for the project.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/react-agent-from-scratch.ipynb#_snippet_0

LANGUAGE: python
CODE:

```
%%capture --no-stderr
%pip install -U langgraph langchain-openai
```

---

TITLE: Start LangGraph Local Development Server
DESCRIPTION: Initiates the LangGraph server locally in watch mode, automatically restarting on code changes. This command provides a local environment for testing applications with LangGraph Studio.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/how-tos/studio/quick_start.md#_snippet_1

LANGUAGE: Bash
CODE:

```
langgraph dev
```

---

TITLE: Configure LangGraph with Redis Checkpointer
DESCRIPTION: Provides installation instructions and a partial synchronous example for integrating the Redis checkpointer with LangGraph. Note that `checkpointer.setup()` is required for initial Redis checkpointer usage.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/memory/add-memory.md#_snippet_9

LANGUAGE: python
CODE:

```
pip install -U langgraph langgraph-checkpoint-redis
```

LANGUAGE: python
CODE:

```
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, MessagesState, START
```

---

TITLE: Install LangGraph and Langchain Anthropic Packages
DESCRIPTION: Installs the necessary Python packages, `langgraph` and `langchain_anthropic`, using `pip`. This step is crucial for setting up the development environment to run the provided LangGraph examples.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/persistence-functional.ipynb#_snippet_4

LANGUAGE: python
CODE:

```
%%capture --no-stderr
%pip install --quiet -U langgraph langchain_anthropic
```

---

TITLE: Install LangGraph SDKs
DESCRIPTION: Instructions for installing the necessary LangGraph SDKs for Python and JavaScript environments. These SDKs provide client libraries to interact with the deployed LangGraph API.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/quick_start.md#_snippet_0

LANGUAGE: Shell
CODE:

```
pip install langgraph-sdk
```

LANGUAGE: Shell
CODE:

```
npm install @langchain/langgraph-sdk
```

---

TITLE: Example LangGraph Configuration File (langgraph.json)
DESCRIPTION: This JSON snippet provides an example of the `langgraph.json` configuration file used by LangGraph. It specifies project dependencies, maps graph names to their Python file paths and variable names, and defines the environment file to be used, facilitating the deployment and management of LangGraph applications.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_pyproject.md#_snippet_9

LANGUAGE: json
CODE:

```
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./my_agent/agent.py:graph"
  },
  "env": ".env"
}
```

---

TITLE: Example pyproject.toml for LangGraph Dependencies
DESCRIPTION: An example `pyproject.toml` file demonstrating how to define project metadata and dependencies for a LangGraph application. It specifies build system requirements, project name, version, description, authors, license, Python compatibility, and crucial LangGraph-related dependencies.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_pyproject.md#_snippet_2

LANGUAGE: toml
CODE:

```
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-agent"
version = "0.0.1"
description = "An excellent agent build for LangGraph Platform."
authors = [
    {name = "Polly the parrot", email = "1223+polly@users.noreply.github.com"}
]
license = {text = "MIT"}
readme = "README.md"
requires-python = ">=3.9"
dependencies = [
    "langgraph>=0.2.0",
    "langchain-fireworks>=0.1.3"
]

[tool.hatch.build.targets.wheel]
packages = ["my_agent"]
```

---

TITLE: Install LangGraph CLI (JavaScript/Node.js)
DESCRIPTION: Installs the LangGraph command-line interface for JavaScript/Node.js environments. The 'npx' command allows for one-time execution without global installation, while 'npm install -g' performs a global installation, making the 'langgraphjs' command available system-wide.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/reference/cli.md#_snippet_1

LANGUAGE: Bash
CODE:

```
npx @langchain/langgraph-cli
```

LANGUAGE: Bash
CODE:

```
npm install -g @langchain/langgraph-cli
```

---

TITLE: LangGraph Application Recommended Project Structure
DESCRIPTION: This snippet outlines the standard directory layout for a LangGraph application, detailing the placement of agent code, utility modules, dependency files, environment variables, and the crucial `langgraph.json` configuration file. It provides a clear visual guide for organizing project files for deployment.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup.md#_snippet_0

LANGUAGE: bash
CODE:

```
my-app/
├── my_agent # all project code lies within here
│   ├── utils # utilities for your graph
│   │   ├── __init__.py
│   │   ├── tools.py # tools for your graph
│   │   ├── nodes.py # node functions for you graph
│   │   └── state.py # state definition of your graph
│ 	├── requirements.txt # package dependencies
│ 	├── __init__.py
│ 	└── agent.py # code for constructing your graph
├── .env # environment variables
└── langgraph.json # configuration file for LangGraph
```

---

TITLE: Start LangGraph Local Server with Debugging Enabled
DESCRIPTION: Runs the LangGraph development server locally, enabling debugging on a specified port. This allows for step-by-step debugging with breakpoints and variable inspection using a compatible debugger.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/how-tos/studio/quick_start.md#_snippet_3

LANGUAGE: Bash
CODE:

```
langgraph dev --debug-port 5678
```

---

TITLE: Install LangGraph SDKs
DESCRIPTION: Instructions to install the necessary LangGraph SDK packages for Python and JavaScript environments using pip and npm respectively. These commands prepare your development environment for interacting with the LangGraph API.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/langgraph-platform/local-server.md#_snippet_7

LANGUAGE: Shell
CODE:

```
pip install langgraph-sdk
```

LANGUAGE: Shell
CODE:

```
npm install @langchain/langgraph-sdk
```

---

TITLE: Install LangGraph and Dependencies
DESCRIPTION: This snippet installs the necessary Python packages for the tutorial, including `langgraph`, `langchain-community`, `langchain-anthropic`, `tavily-python`, `pandas`, and `openai`. It uses `%%capture --no-stderr` to suppress output and `%pip install -U` for upgrading packages.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/customer-support/customer-support.ipynb#_snippet_0

LANGUAGE: python
CODE:

```
%%capture --no-stderr
%pip install -U langgraph langchain-community langchain-anthropic tavily-python pandas openai
```

---

TITLE: Import Utilities for Example Conversation
DESCRIPTION: This small snippet imports standard Python modules, `shutil` and `uuid`, which are typically used for file operations (e.g., copying, deleting) and generating unique identifiers, respectively. These imports likely precede an example conversation or testing setup.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/customer-support/customer-support.ipynb#_snippet_28

LANGUAGE: python
CODE:

```
import shutil
import uuid
```

---

TITLE: Install Required Python Packages for LangGraph
DESCRIPTION: This command installs the necessary Python libraries for running LangGraph examples, including `langchain_anthropic`, `langchain_openai`, and `langgraph` itself. The `%%capture` and `%pip` directives are common in Jupyter/IPython environments.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/cross-thread-persistence-functional.ipynb#_snippet_2

LANGUAGE: python
CODE:

```
%%capture --no-stderr
%pip install -U langchain_anthropic langchain_openai langgraph
```

---

TITLE: Python BM25 Retriever for Example Formatting and Initialization
DESCRIPTION: Defines a `format_example` helper function to structure problem and solution pairs into a consistent string format. It then initializes a `BM25Retriever` from `langchain_community` using the formatted `train_ds`, which contains examples to be retrieved based on similarity, excluding test cases.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/usaco/usaco.ipynb#_snippet_20

LANGUAGE: python
CODE:

```
from langchain_community.retrievers import BM25Retriever


def format_example(row):
    question = row["description"]
    answer = row["solution"]
    return f"""<problem>
{question}
</problem>
<solution>
{answer}
</solution>"""


# Skip our 'test examples' to avoid cheating
# This is "simulating" having seen other in-context examples
retriever = BM25Retriever.from_texts([format_example(row) for row in train_ds])
```

---

TITLE: Execute All Notebooks for CI (Bash)
DESCRIPTION: This sequence of commands prepares and executes all notebooks for Continuous Integration (CI). The `prepare_notebooks_for_ci.py` script adds VCR cassette context managers, and `execute_notebooks.sh` then runs the notebooks.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/README.md#_snippet_2

LANGUAGE: bash
CODE:

```
python _scripts/prepare_notebooks_for_ci.py
./_scripts/execute_notebooks.sh
```

---

TITLE: Python LangGraph Retrieve Examples Node Function
DESCRIPTION: Implements the `retrieve_examples` function, a LangGraph node responsible for fetching relevant examples. It takes the current `State` and `RunnableConfig` (allowing configurable parameters like `top_k`), extracts the candidate code from the `AIMessage`, uses the pre-initialized `retriever` to find similar examples, and formats them into the `examples` field of the state for subsequent processing by the agent.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/usaco/usaco.ipynb#_snippet_21

LANGUAGE: python
CODE:

```
from langchain_core.runnables import RunnableConfig


def retrieve_examples(state: State, config: RunnableConfig):
    top_k = config["configurable"].get("k") or 2
    ai_message: AIMessage = state["candidate"]
    if not ai_message.tool_calls:
        # We err here. To make more robust, you could loop back
        raise ValueError("Draft agent did not produce a valid code block")
    code = ai_message.tool_calls[0]["args"]["code"]
    examples_str = "\n".join(
        [doc.page_content for doc in retriever.invoke(code)[:top_k]]
    )
    examples_str = f"""
You previously solved the following problems in this competition:
<Examples>
{examples_str}
<Examples>
Approach this new question with similar sophistication."""
    return {"examples": examples_str}
```

---

TITLE: Python LangGraph Multi-Agent Travel Recommendation System Example
DESCRIPTION: This comprehensive example illustrates how to build a multi-agent system for travel recommendations using LangGraph. It defines two specialized agents, `travel_advisor` and `hotel_advisor`, each with specific tools and prompts. The agents are configured to communicate and handoff tasks to each other, demonstrating a collaborative workflow within the LangGraph framework. It also shows the setup of `MessagesState` for managing conversation history and agent invocation.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/multi_agent.md#_snippet_13

LANGUAGE: python
CODE:

```
from langchain_anthropic import ChatAnthropic
from langgraph.graph import MessagesState, StateGraph, START
from langgraph.prebuilt import create_react_agent, InjectedState
from langgraph.types import Command, interrupt
from langgraph.checkpoint.memory import InMemorySaver


model = ChatAnthropic(model="claude-3-5-sonnet-latest")

class MultiAgentState(MessagesState):
    last_active_agent: str


# Define travel advisor tools and ReAct agent
travel_advisor_tools = [
    get_travel_recommendations,
    make_handoff_tool(agent_name="hotel_advisor"),
]
travel_advisor = create_react_agent(
    model,
    travel_advisor_tools,
    prompt=(
        "You are a general travel expert that can recommend travel destinations (e.g. countries, cities, etc). "
        "If you need hotel recommendations, ask 'hotel_advisor' for help. "
        "You MUST include human-readable response before transferring to another agent."
    ),
)


def call_travel_advisor(
    state: MultiAgentState,
) -> Command[Literal["hotel_advisor", "human"]]:
    # You can also add additional logic like changing the input to the agent / output from the agent, etc.
    # NOTE: we're invoking the ReAct agent with the full history of messages in the state
    response = travel_advisor.invoke(state)
    update = {**response, "last_active_agent": "travel_advisor"}
    return Command(update=update, goto="human")


# Define hotel advisor tools and ReAct agent
hotel_advisor_tools = [
    get_hotel_recommendations,
    make_handoff_tool(agent_name="travel_advisor"),
]
hotel_advisor = create_react_agent(
    model,
    hotel_advisor_tools,
    prompt=(
        "You are a hotel expert that can provide hotel recommendations for a given destination. "
        "If you need help picking travel destinations, ask 'travel_advisor' for help."
        "You MUST include human-readable response before transferring to another agent."
    ),
)


def call_hotel_advisor(
    state: MultiAgentState,
) -> Command[Literal["travel_advisor", "human"]]:
    response = hotel_advisor.invoke(state)
```

---

TITLE: Install Debugpy for LangGraph Server Debugging
DESCRIPTION: Installs the `debugpy` package, which is required to enable step-by-step debugging capabilities for the local LangGraph development server.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/how-tos/studio/quick_start.md#_snippet_2

LANGUAGE: Python
CODE:

```
pip install debugpy
```

---

TITLE: Illustrate LangGraph Project Directory Structure (with langgraph.json)
DESCRIPTION: This snippet updates the LangGraph project directory structure to include the `langgraph.json` configuration file. It demonstrates the recommended placement of the configuration file at the root level, alongside the main application directory (`my_agent`) and the environment variables file (`.env`), ensuring proper project setup.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup.md#_snippet_10

LANGUAGE: bash
CODE:

```
my-app/
├── my_agent # all project code lies within here
│   ├── utils # utilities for your graph
│   │   ├── __init__.py
│   │   ├── tools.py # tools for your graph
│   │   ├── nodes.py # node functions for you graph
│   │   └── state.py # state definition of your graph
│   ├── requirements.txt # package dependencies
│   ├── __init__.py
│   └── agent.py # code for constructing your graph
├── .env # environment variables
└── langgraph.json # configuration file for LangGraph
```

---

TITLE: Initialize LangGraph Project from Template
DESCRIPTION: Use the LangGraph CLI to create a new project with a predefined template. This command sets up the initial directory structure and basic files, serving as a starting point for development.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/http/custom_routes.md#_snippet_0

LANGUAGE: bash
CODE:

```
langgraph new --template=new-langgraph-project-python my_new_project
```

---

TITLE: Initialize and Get SQL Database Tools (Python)
DESCRIPTION: Demonstrates how to initialize the `SQLDatabaseToolkit` from `langchain-community` with a database connection (`db`) and a language model (`llm`). It then retrieves and iterates through the available SQL interaction tools, printing their names and descriptions. This setup is essential for enabling an agent to interact with a SQL database.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/tutorials/sql/sql-agent.md#_snippet_4

LANGUAGE: python
CODE:

```
from langchain_community.agent_toolkits import SQLDatabaseToolkit

toolkit = SQLDatabaseToolkit(db=db, llm=llm)

tools = toolkit.get_tools()

for tool in tools:
    print(f"{tool.name}: {tool.description}\n")
```

---

TITLE: Retrieve Thread State
DESCRIPTION: Examples show how to get the state of a thread using client libraries in Python and Javascript, as well as a direct API call via CURL.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/how-tos/background_run.md#_snippet_5

LANGUAGE: Python
CODE:

```
final_result = await client.threads.get_state(thread["thread_id"])
print(final_result)
```

LANGUAGE: Javascript
CODE:

```
let finalResult = await client.threads.getState(thread["thread_id"]);
console.log(finalResult);
```

LANGUAGE: CURL
CODE:

```
curl --request GET \\
    --url <DEPLOYMENT_URL>/threads/<THREAD_ID>/state
```

---

TITLE: Example .env File for LangGraph Environment Variables
DESCRIPTION: An example `.env` file demonstrating how to define environment variables for a LangGraph application. This file can include sensitive information like API keys, which are then loaded into the application's environment at runtime.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_pyproject.md#_snippet_4

LANGUAGE: text
CODE:

```
MY_ENV_VAR_1=foo
MY_ENV_VAR_2=bar
FIREWORKS_API_KEY=key
```

---

TITLE: Define complete LangGraph with state and simple loop
DESCRIPTION: Provides a comprehensive example of defining a LangGraph with a custom `TypedDict` state, two nodes (`a` and `b`), and initiating the graph builder. This setup forms the foundation for a simple loop structure, demonstrating state management and node definition.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/graph-api.md#_snippet_67

LANGUAGE: python
CODE:

```
import operator
from typing import Annotated, Literal
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END

class State(TypedDict):
    # The operator.add reducer fn makes this append-only
    aggregate: Annotated[list, operator.add]

def a(state: State):
    print(f'Node A sees {state["aggregate"]}')
    return {"aggregate": ["A"]}

def b(state: State):
    print(f'Node B sees {state["aggregate"]}')
    return {"aggregate": ["B"]}

# Define nodes
builder = StateGraph(State)
builder.add_node(a)
builder.add_node(b)
```

---

TITLE: Example LangGraph Application Configuration File
DESCRIPTION: This JSON snippet provides an example of the `langgraph.json` configuration file. It specifies the Node.js version, Dockerfile lines, project dependencies, and maps graph names (e.g., 'agent') to their respective TypeScript file paths and exported variable names.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/cloud/deployment/setup_javascript.md#_snippet_8

LANGUAGE: JSON
CODE:

```
{
  "node_version": "20",
  "dockerfile_lines": [],
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:graph"
  },
  "env": ".env"
}
```

---

TITLE: Install LangGraph and Anthropic Libraries
DESCRIPTION: Installs the necessary Python packages, `langgraph` and `langchain_anthropic`, quietly and updates them to their latest versions. This setup is crucial for building agentic systems with human-in-the-loop capabilities.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/human_in_the_loop/wait-user-input.ipynb#_snippet_0

LANGUAGE: python
CODE:

```
%%capture --no-stderr
%pip install --quiet -U langgraph langchain_anthropic
```

---

TITLE: LangGraph CLI Configuration File Example
DESCRIPTION: An example of the `langgraph.json` configuration file used by the LangGraph CLI. This file allows users to define project dependencies, specify graph entry points, set environment variables, define Python versions, configure pip, and add custom Dockerfile commands.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/libs/cli/README.md#_snippet_2

LANGUAGE: json
CODE:

```
{
  "dependencies": ["langchain_openai", "./your_package"],  // Required: Package dependencies
  "graphs": {
    "my_graph": "./your_package/file.py:graph"            // Required: Graph definitions
  },
  "env": "./.env",                                        // Optional: Environment variables
  "python_version": "3.11",                               // Optional: Python version (3.11/3.12)
  "pip_config_file": "./pip.conf",                        // Optional: pip configuration
  "dockerfile_lines": []                                // Optional: Additional Dockerfile commands
}
```

---

TITLE: Configure static prompt for LangGraph React agent
DESCRIPTION: This example demonstrates how to set a fixed, static prompt for a LangGraph `create_react_agent`. The prompt, provided as a string, acts as a system message that never changes, instructing the LLM's behavior. It's suitable for agents with consistent conversational guidelines.

SOURCE: https://github.com/langchain-ai/langgraph/blob/main/docs/docs/agents/agents.md#_snippet_5

LANGUAGE: python
CODE:

```
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[get_weather],
    prompt="Never answer questions about the weather."
)

agent.invoke(
    {"messages": [{"role": "user", "content": "what is the weather in sf"}]}
)
```

LANGUAGE: typescript
CODE:

```
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";

const agent = createReactAgent({
  llm: new ChatAnthropic({ model: "anthropic:claude-3-5-sonnet-latest" }),
  tools: [getWeather],
  stateModifier: "Never answer questions about the weather."
});

await agent.invoke({
  messages: [{ role: "user", content: "what is the weather in sf" }]
});
```
