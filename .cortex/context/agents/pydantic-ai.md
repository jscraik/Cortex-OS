========================
CODE SNIPPETS
========================
TITLE: Run Pydantic AI Example with Zero Setup using uv
DESCRIPTION: This advanced one-liner command uses `uv` to run a Pydantic AI example (`pydantic_model`) by setting the OpenAI API key and installing dependencies on the fly. It's ideal for quick testing without prior setup.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/index.md#_snippet_5

LANGUAGE: bash
CODE:

```
OPENAI_API_KEY='your-api-key' \
  uv run --with "pydantic-ai[examples]" \
  -m pydantic_ai_examples.pydantic_model
```

---

TITLE: Install Pydantic AI with examples
DESCRIPTION: Installs the `pydantic-ai-examples` package via the `examples` optional group. This makes it easy to customize and run the provided Pydantic AI examples.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/install.md#_snippet_2

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai[examples]"
```

---

TITLE: Install Pydantic AI Example Dependencies
DESCRIPTION: Commands to install the necessary extra dependencies for running Pydantic AI examples. This includes the `examples` optional dependency group, which can be installed via `pip` or `uv` for PyPI installations, or `uv sync` if cloning the repository.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/index.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai[examples]"
```

LANGUAGE: bash
CODE:

```
uv sync --extra examples
```

---

TITLE: Copy Pydantic AI Examples to Local Directory
DESCRIPTION: This command copies the Pydantic AI example files to a specified local directory (e.g., `examples/`). This allows users to modify, experiment with, and develop upon the examples without affecting the installed package.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/index.md#_snippet_6

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples --copy-to examples/
```

---

TITLE: Perform slim installation for Pydantic AI with multiple optional groups
DESCRIPTION: Demonstrates how to install `pydantic-ai-slim` with multiple optional groups simultaneously. This allows for including dependencies for several specific models and features in a single installation command.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/install.md#_snippet_5

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[openai,vertexai,logfire]"
```

---

TITLE: Run Pydantic AI Flight Booking Example (Bash)
DESCRIPTION: Command to execute the Pydantic AI flight booking example. This command assumes that all necessary dependencies are installed and environment variables are properly configured as per the project's setup instructions.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/flight-booking.md#_snippet_1

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.flight_booking
```

---

TITLE: Run Pydantic AI Bank Support Agent Example
DESCRIPTION: Command to execute the Pydantic AI bank support agent example. This requires prior installation of dependencies and setting up environment variables as per the project's usage instructions.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/bank-support.md#_snippet_0

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.bank_support
```

---

TITLE: Run Pydantic AI Data Analyst Example Script
DESCRIPTION: Execute the Pydantic AI data analyst example script from the command line. This command uses `python/uv-run` to launch the `pydantic_ai_examples.data_analyst` module, assuming necessary dependencies are installed and environment variables are configured as per the project's setup instructions.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/data-analyst.md#_snippet_0

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.data_analyst
```

---

TITLE: Run Specific Pydantic AI Example (pydantic_model)
DESCRIPTION: This command demonstrates how to run the `pydantic_model` example specifically. It uses `python` or `uv run` to execute the module, showcasing a common use case for running individual examples.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/index.md#_snippet_4

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.pydantic_model
```

---

TITLE: Run Pydantic AI Examples
DESCRIPTION: Commands to execute Pydantic AI examples using either `python` or `uv run`. This includes a general command for running any example module, a specific command for the `pydantic_model` example, and a convenient one-liner for `uv` that handles dependency installation and API key setting.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/index.md#_snippet_2

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.<example_module_name>
```

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.pydantic_model
```

LANGUAGE: bash
CODE:

```
OPENAI_API_KEY='your-api-key' \
  uv run --with "pydantic-ai[examples]" \
  -m pydantic_ai_examples.pydantic_model
```

---

TITLE: Install and Run clai with uv
DESCRIPTION: These commands demonstrate how to install `clai` globally using `uv tool install` and then run it. After installation, `clai` can be invoked directly from the command line to start an interactive AI chat session.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/clai/README.md#_snippet_2

LANGUAGE: bash
CODE:

```
uv tool install clai
...
clai
```

---

TITLE: Serve Pydantic AI Documentation Locally
DESCRIPTION: Runs the `mkdocs serve` command via `uv` to start a local web server, allowing contributors to preview and test changes to the project's documentation pages.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/contributing.md#_snippet_6

LANGUAGE: bash
CODE:

```
uv run mkdocs serve
```

---

TITLE: Install Pydantic AI Dependencies and Pre-commit Hooks
DESCRIPTION: Command to install all project dependencies and set up pre-commit hooks using the `make` utility. This command streamlines the setup process for development.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/contributing.md#_snippet_3

LANGUAGE: bash
CODE:

```
make install
```

---

TITLE: Perform slim installation for Pydantic AI with OpenAI model
DESCRIPTION: Installs the `pydantic-ai-slim` package with only the `openai` optional group. This is recommended when you intend to use only the `OpenAIModel` and wish to avoid installing superfluous packages.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/install.md#_snippet_3

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[openai]"
```

---

TITLE: Start Pydantic AI AG-UI Backend
DESCRIPTION: Initiates the Pydantic AI AG-UI example backend application. This command uses `uv-run` to execute the specified Python module, making the backend services available for the frontend to communicate with.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/ag-ui.md#_snippet_1

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.ag_ui
```

---

TITLE: Install Pydantic AI core package
DESCRIPTION: Installs the main `pydantic-ai` package and its core dependencies, including libraries required to use all models. This installation requires Python 3.9 or newer.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/install.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add pydantic-ai
```

---

TITLE: Install Gradio and Run Weather Agent UI
DESCRIPTION: This sequence of commands first installs the required Gradio library, then launches the web-based user interface for the Pydantic AI weather agent. The UI provides a chat-based interaction for the agent, requiring Python 3.10+.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/weather-agent.md#_snippet_1

LANGUAGE: bash
CODE:

```
pip install gradio>=5.9.0
python/uv-run -m pydantic_ai_examples.weather_agent_gradio
```

---

TITLE: Pydantic AI Slim Install Optional Groups
DESCRIPTION: This section details the available optional groups for `pydantic-ai-slim`, allowing users to install only the necessary dependencies for specific models or features, thereby avoiding superfluous packages. Each group corresponds to a set of external libraries.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/install.md#_snippet_4

LANGUAGE: APIDOC
CODE:

```
pydantic-ai-slim Optional Groups:
  logfire: Installs `logfire` for Logfire integration.
  evals: Installs `pydantic-evals`.
  openai: Installs `openai`.
  vertexai: Installs `google-auth` and `requests`.
  google: Installs `google-genai`.
  anthropic: Installs `anthropic`.
  groq: Installs `groq`.
  mistral: Installs `mistralai`.
  cohere: Installs `cohere`.
  bedrock: Installs `boto3`.
  huggingface: Installs `huggingface-hub[inference]`.
  duckduckgo: Installs `ddgs`.
  tavily: Installs `tavily-python`.
  cli: Installs `rich`, `prompt-toolkit`, and `argcomplete`.
  mcp: Installs `mcp`.
  a2a: Installs `fasta2a`.
  ag-ui: Installs `ag-ui-protocol` and `starlette`.
```

---

TITLE: Copy Pydantic AI Examples to Local Directory
DESCRIPTION: Command to copy the Pydantic AI example files to a specified local directory. This allows users to easily modify and experiment with the examples without affecting the original installed package files.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/index.md#_snippet_3

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples --copy-to examples/
```

---

TITLE: Install Pydantic AI with Logfire integration
DESCRIPTION: Installs Pydantic AI with the optional `logfire` group, enabling integration with Pydantic Logfire. This allows for enhanced viewing and understanding of agent runs.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/install.md#_snippet_1

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai[logfire]"
```

---

TITLE: Pydantic AI Hello World Example
DESCRIPTION: This minimal example demonstrates how to initialize and run a basic Pydantic AI agent. It configures the agent to use a specific LLM model (Gemini 1.5 Flash) and registers a static system prompt. The agent then synchronously runs a query, and its output is printed. This showcases the fundamental steps for setting up and interacting with a Pydantic AI agent.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/index.md#_snippet_0

LANGUAGE: python
CODE:

```
from pydantic_ai import Agent

agent = Agent(  # (1)!
    'google-gla:gemini-1.5-flash',
    system_prompt='Be concise, reply with one sentence.',  # (2)!
)

result = agent.run_sync('Where does "hello world" come from?')  # (3)!
print(result.output)
"""
The first known use of "hello, world" was in a 1974 textbook about the C programming language.
"""
```

---

TITLE: Run Question Graph Example
DESCRIPTION: Executes the `pydantic_ai_examples.question_graph` module using `python/uv-run`. This command initiates the question graph application, which is designed for asking and evaluating questions. Users must ensure that all necessary dependencies are installed and environment variables are correctly configured as per the project's usage instructions before running.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/question-graph.md#_snippet_0

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.question_graph
```

---

TITLE: Install and Run Pydantic AI CLI Globally with uv
DESCRIPTION: Install the `clai` CLI globally using `uv`'s tool installation feature. After installation, run `clai` to start an interactive chat session with the AI model.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/cli.md#_snippet_2

LANGUAGE: bash
CODE:

```
uv tool install clai
...
clai
```

---

TITLE: Install Pydantic-AI with Groq Support
DESCRIPTION: This command installs the `pydantic-ai-slim` package along with the necessary `groq` optional dependencies, enabling Groq model integration. It uses either `pip` or `uv` for package management.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/groq.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[groq]"
```

---

TITLE: Run Pydantic AI Stream Whales Example Script
DESCRIPTION: This command executes the `stream_whales.py` example script, which demonstrates streaming structured responses from GPT-4 and displaying them dynamically. It requires dependencies to be installed and environment variables to be set up beforehand, as detailed in the project's usage instructions.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/stream-whales.md#_snippet_0

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.stream_whales
```

---

TITLE: Install and Run clai with pip
DESCRIPTION: These commands show how to install `clai` using `pip`, the Python package installer, and then run it. Once installed, `clai` can be executed to initiate an interactive chat session with an AI model.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/clai/README.md#_snippet_3

LANGUAGE: bash
CODE:

```
pip install clai
...
clai
```

---

TITLE: Install Pydantic AI with Google Dependencies
DESCRIPTION: This command installs `pydantic-ai-slim` along with its `google` optional dependencies, which are required to use `GoogleModel` and access Google's Gemini models.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/google.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[google]"
```

---

TITLE: Run Pydantic AI Weather Agent
DESCRIPTION: This command executes the main Pydantic AI weather agent script. It initializes the agent, allowing it to process user queries by leveraging configured tools and API keys. Ensure dependencies are installed and environment variables are set before running.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/weather-agent.md#_snippet_0

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.weather_agent
```

---

TITLE: Install Pydantic AI with AG-UI Dependencies
DESCRIPTION: Instructions for installing Pydantic AI with AG-UI extra and Uvicorn for running ASGI applications, using pip or uv.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/ag-ui.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add 'pydantic-ai-slim[ag-ui]'
pip/uv-add uvicorn
```

---

TITLE: Execute Pydantic AI SQL Generation Example
DESCRIPTION: Commands to execute the Pydantic AI SQL generation script. The first command runs the example with default settings, while the second demonstrates passing a custom prompt string.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/sql-gen.md#_snippet_1

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.sql_gen
```

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.sql_gen "find me errors"
```

---

TITLE: Example Prompt for Haiku Generation
DESCRIPTION: A simple text prompt demonstrating how to instruct a generative AI model to create a haiku on a specific subject, such as Formula 1.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/ag-ui.md#_snippet_4

LANGUAGE: text
CODE:

```
Generate a haiku about formula 1
```

---

TITLE: Install Pre-commit with uv
DESCRIPTION: Command to install the `pre-commit` tool using `uv`, a fast Python package installer and resolver. This tool helps manage and run pre-commit hooks for code quality.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/contributing.md#_snippet_1

LANGUAGE: bash
CODE:

```
uv tool install pre-commit
```

---

TITLE: Run Pydantic AI with OpenTelemetry Example
DESCRIPTION: Terminal command to execute a Python script (`raw_otel.py`) that demonstrates Pydantic AI's integration with OpenTelemetry. It ensures necessary dependencies like `pydantic-ai-slim[openai]`, `opentelemetry-sdk`, and `opentelemetry-exporter-otlp` are included for a complete setup.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/logfire.md#_snippet_8

LANGUAGE: txt
CODE:

```
uv run \
  --with 'pydantic-ai-slim[openai]' \
  --with opentelemetry-sdk \
  --with opentelemetry-exporter-otlp \
  raw_otel.py
```

---

TITLE: Run pydantic-ai stream_markdown example
DESCRIPTION: Execute the pydantic-ai example script to stream markdown output. This command uses `python` or `uv-run` to launch the module.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/stream-markdown.md#_snippet_0

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.stream_markdown
```

---

TITLE: Install Pydantic-AI with Bedrock Support
DESCRIPTION: Instructions for installing the `pydantic-ai-slim` package with the `bedrock` optional group, which provides necessary dependencies for integrating with AWS Bedrock.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/bedrock.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[bedrock]"
```

---

TITLE: Comprehensive Pydantic-AI Agent with Asynchronous Dependencies, Tools, and Output Validators
DESCRIPTION: Illustrates a complete Pydantic-AI agent setup utilizing asynchronous dependencies. This example integrates an `httpx.AsyncClient` with an `async` system prompt, an `async` tool, and an `async` output validator, showcasing how `RunContext` can be passed to all these components.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/dependencies.md#_snippet_3

LANGUAGE: python
CODE:

```
from dataclasses import dataclass

import httpx

from pydantic_ai import Agent, ModelRetry, RunContext


@dataclass
class MyDeps:
    api_key: str
    http_client: httpx.AsyncClient


agent = Agent(
    'openai:gpt-4o',
    deps_type=MyDeps,
)


@agent.system_prompt
async def get_system_prompt(ctx: RunContext[MyDeps]) -> str:
    response = await ctx.deps.http_client.get('https://example.com')
    response.raise_for_status()
    return f'Prompt: {response.text}'


@agent.tool  # (1)!
async def get_joke_material(ctx: RunContext[MyDeps], subject: str) -> str:
    response = await ctx.deps.http_client.get(
        'https://example.com#jokes',
        params={'subject': subject},
        headers={'Authorization': f'Bearer {ctx.deps.api_key}'},
    )
    response.raise_for_status()
    return response.text


@agent.output_validator  # (2)!
async def validate_output(ctx: RunContext[MyDeps], output: str) -> str:
    response = await ctx.deps.http_client.post(
        'https://example.com#validate',
        headers={'Authorization': f'Bearer {ctx.deps.api_key}'},
        params={'query': output},
    )
    if response.status_code == 400:
        raise ModelRetry(f'invalid response: {response.text}')
    response.raise_for_status()
    return output


async def main():
    async with httpx.AsyncClient() as client:
        deps = MyDeps('foobar', client)
        result = await agent.run('Tell me a joke.', deps=deps)
        print(result.output)
        #> Did you hear about the toothpaste scandal? They called it Colgate.
```

---

TITLE: Navigate to AG-UI TypeScript SDK Directory
DESCRIPTION: Changes the current working directory to `ag-ui/typescript-sdk`. This directory contains the TypeScript-based AG-UI Dojo example application, which serves as the frontend component for demonstrating Pydantic AI agent interactions.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/ag-ui.md#_snippet_3

LANGUAGE: shell
CODE:

```
cd ag-ui/typescript-sdk
```

---

TITLE: Install pydantic-ai-slim with Hugging Face support
DESCRIPTION: This command installs the `pydantic-ai-slim` package along with the `huggingface` optional group, providing necessary dependencies for integrating with Hugging Face models and inference providers.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/huggingface.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[huggingface]"
```

---

TITLE: Running Pydantic-AI Agents Example
DESCRIPTION: This Python example demonstrates how to use `pydantic_ai.Agent` to perform various types of runs: `agent.run_sync()` for a synchronous call, `agent.run()` for an asynchronous call (awaitable), and `agent.run_stream()` for streaming text output asynchronously. It showcases how to get a completed response or stream parts of it.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/agents.md#_snippet_1

LANGUAGE: python
CODE:

```
from pydantic_ai import Agent

agent = Agent('openai:gpt-4o')

result_sync = agent.run_sync('What is the capital of Italy?')
print(result_sync.output)


async def main():
    result = await agent.run('What is the capital of France?')
    print(result.output)

    async with agent.run_stream('What is the capital of the UK?') as response:
        async for text in response.stream_text():
            print(text)
```

---

TITLE: Install pydantic-ai-slim with Cohere Support
DESCRIPTION: This command installs the `pydantic-ai-slim` package along with its `cohere` optional dependencies. This ensures that all necessary components for interacting with Cohere models via `pydantic-ai` are available in your environment.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/cohere.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[cohere]"
```

---

TITLE: Integrate single ACI.dev tool with Pydantic AI using tool_from_aci
DESCRIPTION: This Python example demonstrates how to use the `tool_from_aci` convenience method to integrate a specific ACI.dev tool, like `TAVILY__SEARCH`, into a Pydantic AI `Agent`. It shows the setup for initializing the tool with a linked account owner ID and then using the agent to run a query. Users need to install `aci-sdk` and set the `ACI_API_KEY` environment variable.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/tools.md#_snippet_19

LANGUAGE: python
CODE:

```
import os

from pydantic_ai import Agent
from pydantic_ai.ext.aci import tool_from_aci


tavily_search = tool_from_aci(
    'TAVILY__SEARCH',
    linked_account_owner_id=os.getenv('LINKED_ACCOUNT_OWNER_ID'),
)

agent = Agent(
    'google-gla:gemini-2.0-flash',
    tools=[tavily_search],
)

result = agent.run_sync('What is the release date of Elden Ring Nightreign?')
print(result.output)
#> Elden Ring Nightreign is planned to be released on May 30, 2025.
```

---

TITLE: Install pydantic-ai with OpenAI support
DESCRIPTION: Instructions to install the `pydantic-ai-slim` package with the `openai` optional group using pip or uv-add. This enables the necessary dependencies for OpenAI model integration.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/openai.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[openai]"
```

---

TITLE: Install pydantic-ai-slim with Mistral support
DESCRIPTION: Instructions to install the `pydantic-ai-slim` package with the `mistral` optional group using `pip` or `uv-add`, which provides the necessary dependencies for Mistral integration.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/mistral.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[mistral]"
```

---

TITLE: Clone AG-UI Protocol Repository
DESCRIPTION: Clones the official AG-UI protocol repository from GitHub. This step is necessary to obtain the source code for the AG-UI Dojo example frontend application, which complements the Pydantic AI backend.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/ag-ui.md#_snippet_2

LANGUAGE: shell
CODE:

```
git clone https://github.com/ag-ui-protocol/ag-ui.git
```

---

TITLE: Install Pydantic AI with MCP Support
DESCRIPTION: Provides the `pip` or `uv-add` command to install `pydantic-ai-slim` along with its `mcp` optional dependencies, which are necessary for MCP client functionality. This installation requires Python 3.10 or higher.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/mcp/client.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[mcp]"
```

---

TITLE: Run Pydantic AI Example
DESCRIPTION: Execute the Pydantic AI example using `python/uv-run`. This command runs the `pydantic_model` module from `pydantic_ai_examples` with default settings or allows specifying an alternative model like Gemini via the `PYDANTIC_AI_MODEL` environment variable.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/pydantic-model.md#_snippet_0

LANGUAGE: bash
CODE:

```
python/uv-run -m pydantic_ai_examples.pydantic_model
```

LANGUAGE: bash
CODE:

```
PYDANTIC_AI_MODEL=gemini-1.5-pro python/uv-run -m pydantic_ai_examples.pydantic_model
```

---

TITLE: Run PostgreSQL with pgvector using Docker
DESCRIPTION: This command starts a PostgreSQL container with the pgvector extension, mapping port 54320 and mounting a local volume for data persistence. It's used as the search database for the RAG example, avoiding port conflicts with other PostgreSQL instances.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/rag.md#_snippet_0

LANGUAGE: bash
CODE:

```
mkdir postgres-data
docker run --rm \
  -e POSTGRES_PASSWORD=postgres \
  -p 54320:5432 \
  -v `pwd`/postgres-data:/var/lib/postgresql/data \
  pgvector/pgvector:pg17
```

---

TITLE: Install Pydantic Evals Package
DESCRIPTION: This snippet demonstrates how to install the Pydantic Evals library using `pip` or `uv`. The first command installs the base package, while the second command includes an optional `logfire` dependency for OpenTelemetry tracing and sending evaluation results to Logfire.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/evals.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add pydantic-evals
```

LANGUAGE: bash
CODE:

```
pip/uv-add 'pydantic-evals[logfire]'
```

---

TITLE: Install Deno Runtime via Curl
DESCRIPTION: Command to install the Deno runtime using a `curl` script. Deno is a secure runtime for JavaScript and TypeScript, often used for web development and scripting.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/contributing.md#_snippet_2

LANGUAGE: bash
CODE:

```
curl -fsSL https://deno.land/install.sh | sh
```

---

TITLE: Install FastA2A Library
DESCRIPTION: This command installs the `fasta2a` library from PyPI, which provides a framework-agnostic implementation of the A2A protocol in Python. It's the foundational package for building A2A-compliant services.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/a2a.md#_snippet_1

LANGUAGE: bash
CODE:

```
pip/uv-add fasta2a
```

---

TITLE: Install Pydantic AI with A2A Extra
DESCRIPTION: This command installs the `pydantic-ai-slim` package along with its `a2a` extra, which automatically includes the `FastA2A` library as a dependency. This is the recommended installation method for users who want to leverage both Pydantic AI and FastA2A together.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/a2a.md#_snippet_2

LANGUAGE: bash
CODE:

```
pip/uv-add 'pydantic-ai-slim[a2a]'
```

---

TITLE: Run clai with uvx
DESCRIPTION: This command executes the `clai` command-line interface using `uvx`, a tool for running Python applications without global installation. It starts an interactive session where you can chat with an AI model.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/clai/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
uvx clai
```

---

TITLE: Pydantic AI Agent with Tools, Dependency Injection, and Structured Output
DESCRIPTION: This comprehensive example illustrates building a sophisticated Pydantic AI agent for a bank support system. It showcases key features such as defining agent dependencies (`SupportDependencies`), enforcing structured output with Pydantic models (`SupportOutput`), creating dynamic system prompts, and registering custom Python functions as LLM-callable tools (`customer_balance`). The example demonstrates how to run the agent asynchronously with injected dependencies and process its validated, structured output.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/README.md#_snippet_2

LANGUAGE: python
CODE:

```
from dataclasses import dataclass

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

from bank_database import DatabaseConn


# SupportDependencies is used to pass data, connections, and logic into the model that will be needed when running
# system prompt and tool functions. Dependency injection provides a type-safe way to customise the behavior of your agents.
@dataclass
class SupportDependencies:
    customer_id: int
    db: DatabaseConn


# This pydantic model defines the structure of the output returned by the agent.
class SupportOutput(BaseModel):
    support_advice: str = Field(description='Advice returned to the customer')
    block_card: bool = Field(description="Whether to block the customer's card")
    risk: int = Field(description='Risk level of query', ge=0, le=10)


# This agent will act as first-tier support in a bank.
# Agents are generic in the type of dependencies they accept and the type of output they return.
# In this case, the support agent has type `Agent[SupportDependencies, SupportOutput]`.
support_agent = Agent(
    'openai:gpt-4o',
    deps_type=SupportDependencies,
    # The response from the agent will, be guaranteed to be a SupportOutput,
    # if validation fails the agent is prompted to try again.
    output_type=SupportOutput,
    system_prompt=(
        'You are a support agent in our bank, give the '
        'customer support and judge the risk level of their query.'
    ),
)


# Dynamic system prompts can make use of dependency injection.
# Dependencies are carried via the `RunContext` argument, which is parameterized with the `deps_type` from above.
# If the type annotation here is wrong, static type checkers will catch it.
@support_agent.system_prompt
async def add_customer_name(ctx: RunContext[SupportDependencies]) -> str:
    customer_name = await ctx.deps.db.customer_name(id=ctx.deps.customer_id)
    return f"The customer's name is {customer_name!r}"


# `tool` let you register functions which the LLM may call while responding to a user.
# Again, dependencies are carried via `RunContext`, any other arguments become the tool schema passed to the LLM.
# Pydantic is used to validate these arguments, and errors are passed back to the LLM so it can retry.
@support_agent.tool
async def customer_balance(
        ctx: RunContext[SupportDependencies], include_pending: bool
) -> float:
    """Returns the customer's current account balance."""
    # The docstring of a tool is also passed to the LLM as the description of the tool.
    # Parameter descriptions are extracted from the docstring and added to the parameter schema sent to the LLM.
    balance = await ctx.deps.db.customer_balance(
        id=ctx.deps.customer_id,
        include_pending=include_pending,
    )
    return balance


# ...  # In a real use case, you'd add more tools and a longer system prompt


async def main():
    deps = SupportDependencies(customer_id=123, db=DatabaseConn())
    # Run the agent asynchronously, conducting a conversation with the LLM until a final response is reached.
    # Even in this fairly simple case, the agent will exchange multiple messages with the LLM as tools are called to retrieve an output.
    result = await support_agent.run('What is my balance?', deps=deps)
    # The `result.output` will be validated with Pydantic to guarantee it is a `SupportOutput`. Since the agent is generic,
    # it'll also be typed as a `SupportOutput` to aid with static type checking.
    print(result.output)
    # """
    # support_advice='Hello John, your current account balance, including pending transactions, is $123.45.' block_card=False risk=1
    # """

    result = await support_agent.run('I just lost my card!', deps=deps)
    print(result.output)
    # """
    # support_advice="I'm sorry to hear that, John. We are temporarily blocking your card to prevent unauthorized transactions." block_card=True risk=8
    # """
```

---

TITLE: Integrate MCP Run Python with Pydantic AI Agent
DESCRIPTION: This Python example demonstrates how to set up and use the MCP Run Python server as a toolset for a Pydantic AI Agent. It shows the initialization of the MCPServerStdio, configuring logging, creating an Agent instance, and executing an asynchronous task that leverages the Python sandbox.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/mcp-run-python/README.md#_snippet_1

LANGUAGE: python
CODE:

```
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPServerStdio

import logfire

logfire.configure()
logfire.instrument_mcp()
logfire.instrument_pydantic_ai()

server = MCPServerStdio('deno',
    args=[
        'run',
        '-N',
        '-R=node_modules',
        '-W=node_modules',
        '--node-modules-dir=auto',
        'jsr:@pydantic/mcp-run-python',
        'stdio',
    ])
agent = Agent('claude-3-5-haiku-latest', toolsets=[server])


async def main():
    async with agent:
        result = await agent.run('How many days between 2000-01-01 and 2025-03-18?')
    print(result.output)
    # There are 9,208 days between January 1, 2000, and March 18, 2025.w

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
```

---

TITLE: Install and Run Pydantic AI CLI with pip
DESCRIPTION: Install the `clai` CLI using pip, Python's package installer. Once installed, execute `clai` to initiate an interactive chat session with the AI model.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/cli.md#_snippet_3

LANGUAGE: bash
CODE:

```
pip install clai
...
clai
```

---

TITLE: Set LLM API Key Environment Variables
DESCRIPTION: Commands to set environment variables for authenticating with Large Language Models (LLMs) such as OpenAI or Google Gemini. These API keys are crucial for the Pydantic AI examples to interact with the respective model providers.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/index.md#_snippet_1

LANGUAGE: bash
CODE:

```
export OPENAI_API_KEY=your-api-key
```

LANGUAGE: bash
CODE:

```
export GEMINI_API_KEY=your-api-key
```

---

TITLE: Create a Streamable HTTP MCP Server in Python
DESCRIPTION: This Python example demonstrates how to set up a basic Model Context Protocol (MCP) server using `FastMCP`. It defines an `add` tool and configures the server to run using the `streamable-http` transport, which is a prerequisite for the client example.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/mcp/client.md#_snippet_1

LANGUAGE: python
CODE:

```
from mcp.server.fastmcp import FastMCP

app = FastMCP()

@app.tool()
def add(a: int, b: int) -> int:
    return a + b

if __name__ == '__main__':
    app.run(transport='streamable-http')
```

---

TITLE: Install Pydantic-Graph Library
DESCRIPTION: This snippet provides the command to install the `pydantic-graph` library using `pip` or `uv-add`. It is a required dependency for `pydantic-ai` and an optional one for `pydantic-ai-slim`, enabling the use of graph-based state machines.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/graph.md#_snippet_0

LANGUAGE: Bash
CODE:

```
pip/uv-add pydantic-graph
```

---

TITLE: Install and Run Ollama Locally
DESCRIPTION: Instructions to download and run the Ollama server with a specific model, preparing it for local `pydantic-ai` integration. This command will pull the specified model if it's not already downloaded.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/openai.md#_snippet_14

LANGUAGE: bash
CODE:

```
ollama run llama3.2
```

---

TITLE: Query Pydantic AI Agent with RAG Search
DESCRIPTION: This Python command allows users to ask questions to the Pydantic AI agent, leveraging the previously built RAG search database. The example demonstrates how to query the agent with a specific question about Logfire configuration.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/rag.md#_snippet_2

LANGUAGE: python
CODE:

```
python/uv-run -m pydantic_ai_examples.rag search "How do I configure logfire to work with FastAPI?"
```

---

TITLE: Run Pydantic AI Example with Gemini Model
DESCRIPTION: Command to execute the Pydantic AI example using the Gemini 1.5 Pro model by setting the PYDANTIC_AI_MODEL environment variable. This allows overriding the default model.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/examples/pydantic-model.md#_snippet_1

LANGUAGE: bash
CODE:

```
PYDANTIC_AI_MODEL=gemini-1.5-pro python/uv-run -m pydantic_ai_examples.pydantic_model
```

---

TITLE: Configure Pydantic-AI Models with Fallback
DESCRIPTION: This example shows how to initialize `OpenAIModel` and `AnthropicModel` with specific `ModelSettings` (e.g., temperature, max_tokens) and then combine them into a `FallbackModel`. An `Agent` is then created with the `FallbackModel` to execute a prompt, demonstrating automatic model failover.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/index.md#_snippet_2

LANGUAGE: python
CODE:

```
openai_model = OpenAIModel(
    'gpt-4o',
    settings=ModelSettings(temperature=0.7, max_tokens=1000)  # Higher creativity for OpenAI
)
anthropic_model = AnthropicModel(
    'claude-3-5-sonnet-latest',
    settings=ModelSettings(temperature=0.2, max_tokens=1000)  # Lower temperature for consistency
)

fallback_model = FallbackModel(openai_model, anthropic_model)
agent = Agent(fallback_model)

result = agent.run_sync('Write a creative story about space exploration')
print(result.output)
```

---

TITLE: Install and Run MCP Run Python Server with Deno
DESCRIPTION: This command installs and runs the MCP Run Python server using Deno. It specifies necessary permissions for network access and node_modules, and allows choosing a transport method (stdio, streamable_http, sse, or warmup) for server operation.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/mcp/run-python.md#_snippet_0

LANGUAGE: bash
CODE:

```
deno run \
  -N -R=node_modules -W=node_modules --node-modules-dir=auto \
  jsr:@pydantic/mcp-run-python [stdio|streamable_http|sse|warmup]
```

---

TITLE: Install Anthropic dependency for pydantic-ai-slim
DESCRIPTION: This command installs the `anthropic` optional group for `pydantic-ai-slim`, enabling the use of Anthropic models. It ensures necessary dependencies are available for integration with Anthropic's API.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/anthropic.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[anthropic]"
```

---

TITLE: Run MCP Python Server with Deno
DESCRIPTION: This snippet provides the Deno command to start the MCP Run Python server. It includes necessary flags for network access, read/write permissions to node_modules (required for Pyodide), and specifies different transport options like stdio, sse, or warmup for various deployment scenarios.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/mcp-run-python/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
deno run \
  -N -R=node_modules -W=node_modules --node-modules-dir=auto \
  jsr:@pydantic/mcp-run-python [stdio|sse|warmup]
```

---

TITLE: Install Tavily Search Tool for Pydantic AI
DESCRIPTION: Provides the `pip` or `uv` command to install the `tavily` optional group for `pydantic-ai-slim`, which is required to use the Tavily search tool with Pydantic AI agents. Users need to sign up for a Tavily account and obtain an API key.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/common-tools.md#_snippet_2

LANGUAGE: bash
CODE:

```
pip/uv-add "pydantic-ai-slim[tavily]"
```

---

TITLE: Serve Pydantic AI Documentation Locally
DESCRIPTION: Command to run the Pydantic AI documentation site locally using `uv` and `mkdocs serve`. This allows contributors to preview documentation changes before committing.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/contributing.md#_snippet_5

LANGUAGE: bash
CODE:

```
uv run mkdocs serve
```

---

TITLE: Authenticate Local Environment with Logfire
DESCRIPTION: Authenticates your local development environment with Pydantic Logfire. This command typically guides you through a process to link your local setup to your Logfire account, ensuring that data can be sent securely.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/logfire.md#_snippet_1

LANGUAGE: bash
CODE:

```
py-cli logfire auth
```

---

TITLE: Pydantic AI Native Output Mode Example
DESCRIPTION: Demonstrates how to use Pydantic AI's `NativeOutput` mode to force a language model to return structured data matching a specified JSON schema. This mode leverages the model's native structured output capabilities, which are not supported by all models. The example shows an `Agent` configured to output either a `Fruit` or `Vehicle` object, and then runs a query to get a `Vehicle`.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/output.md#_snippet_7

LANGUAGE: python
CODE:

```
from tool_output import Fruit, Vehicle

from pydantic_ai import Agent, NativeOutput

agent = Agent(
    'openai:gpt-4o',
    output_type=NativeOutput(
        [Fruit, Vehicle], # (1)!
        name='Fruit_or_vehicle',
        description='Return a fruit or vehicle.'
    ),
)
result = agent.run_sync('What is a Ford Explorer?')
print(repr(result.output))
#> Vehicle(name='Ford Explorer', wheels=4)
```

---

TITLE: Configure Pydantic AI with Together AI
DESCRIPTION: Outlines the setup for using Together AI with Pydantic AI via the `TogetherProvider`. This configuration requires an API key from Together.ai and allows access to their model library, exemplified by 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free'.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/models/openai.md#_snippet_29

LANGUAGE: Python
CODE:

```
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.together import TogetherProvider

model = OpenAIModel(
    'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',  # model library available at https://www.together.ai/models
    provider=TogetherProvider(api_key='your-together-api-key'),
)
agent = Agent(model)
...
```

---

TITLE: Mermaid Diagram Definition for Fives Graph
DESCRIPTION: This Mermaid syntax defines the visual flow of the `fives_graph` example. It shows the state transitions between `DivisibleBy5` and `Increment` nodes, including the start and end points of the graph execution.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/graph.md#_snippet_6

LANGUAGE: Mermaid
CODE:

```
---
title: fives_graph
---
stateDiagram-v2
  [*] --> DivisibleBy5
  DivisibleBy5 --> Increment
  DivisibleBy5 --> [*]
  Increment --> DivisibleBy5
```

---

TITLE: Implementing Static and Dynamic System Prompts in Pydantic AI
DESCRIPTION: This example demonstrates how to define both static and dynamic system prompts for a Pydantic AI agent. It shows how static prompts are set during agent initialization and dynamic prompts are created using decorated functions, optionally leveraging `RunContext` for runtime information to tailor responses.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/agents.md#_snippet_18

LANGUAGE: Python
CODE:

```
from datetime import date

from pydantic_ai import Agent, RunContext

agent = Agent(
    'openai:gpt-4o',
    deps_type=str,  # (1)!
    system_prompt="Use the customer's name while replying to them.",  # (2)!
)


@agent.system_prompt  # (3)!
def add_the_users_name(ctx: RunContext[str]) -> str:
    return f"The user's name is {ctx.deps}."


@agent.system_prompt
def add_the_date() -> str:  # (4)!
    return f'The date is {date.today()}.'


result = agent.run_sync('What is the date?', deps='Frank')
print(result.output)
#> Hello Frank, the date today is 2032-01-02.
```

---

TITLE: Dynamically Customize Pydantic-AI Tool Parameter Description
DESCRIPTION: This Python example demonstrates using the `prepare` method to dynamically modify a tool's definition before it's passed to the model. The `prepare_greet` function updates the `description` of the `name` parameter for the `greet` tool based on the `deps` value from the `RunContext`, showcasing how tool metadata can be adapted at runtime.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/tools.md#_snippet_10

LANGUAGE: python
CODE:

```
from __future__ import annotations

from typing import Literal

from pydantic_ai import Agent, RunContext
from pydantic_ai.models.test import TestModel
from pydantic_ai.tools import Tool, ToolDefinition


def greet(name: str) -> str:
    return f'hello {name}'


async def prepare_greet(
    ctx: RunContext[Literal['human', 'machine']], tool_def: ToolDefinition
) -> ToolDefinition | None:
    d = f'Name of the {ctx.deps} to greet.'
    tool_def.parameters_json_schema['properties']['name']['description'] = d
    return tool_def


greet_tool = Tool(greet, prepare=prepare_greet)
test_model = TestModel()
agent = Agent(test_model, tools=[greet_tool], deps_type=Literal['human', 'machine'])

result = agent.run_sync('testing...', deps='human')
print(result.output)
# {"greet":"hello a"}
print(test_model.last_model_request_parameters.function_tools)
"""
[
    ToolDefinition(
        name='greet',
        parameters_json_schema={
            'additionalProperties': False,
            'properties': {
                'name': {'type': 'string', 'description': 'Name of the human to greet.'}
            },
            'required': ['name'],
            'type': 'object',
        },
    )
]
"""
```

---

TITLE: Python Example: Agent Delegation with Shared Dependencies
DESCRIPTION: This Python example demonstrates how to set up agent delegation where a 'joke selection' agent delegates joke generation to a 'joke generation' agent. It highlights the use of `deps_type` to define shared dependencies (an HTTP client and API key) and how these dependencies are passed and utilized across agents to make external API calls efficiently. The example also shows how to track combined usage across delegated agents.

SOURCE: https://github.com/pydantic/pydantic-ai/blob/main/docs/multi-agent-applications.md#_snippet_2

LANGUAGE: python
CODE:

```
from dataclasses import dataclass

import httpx

from pydantic_ai import Agent, RunContext


@dataclass
class ClientAndKey:
    http_client: httpx.AsyncClient
    api_key: str


joke_selection_agent = Agent(
    'openai:gpt-4o',
    deps_type=ClientAndKey,
    system_prompt=(
        'Use the `joke_factory` tool to generate some jokes on the given subject, '
        'then choose the best. You must return just a single joke.'
    ),
)
joke_generation_agent = Agent(
    'gemini-1.5-flash',
    deps_type=ClientAndKey,
    output_type=list[str],
    system_prompt=(
        'Use the "get_jokes" tool to get some jokes on the given subject, '
        'then extract each joke into a list.'
    ),
)


@joke_selection_agent.tool
async def joke_factory(ctx: RunContext[ClientAndKey], count: int) -> list[str]:
    r = await joke_generation_agent.run(
        f'Please generate {count} jokes.',
        deps=ctx.deps,
        usage=ctx.usage,
    )
    return r.output


@joke_generation_agent.tool
async def get_jokes(ctx: RunContext[ClientAndKey], count: int) -> str:
    response = await ctx.deps.http_client.get(
        'https://example.com',
        params={'count': count},
        headers={'Authorization': f'Bearer {ctx.deps.api_key}'},
    )
    response.raise_for_status()
    return response.text


async def main():
    async with httpx.AsyncClient() as client:
        deps = ClientAndKey(client, 'foobar')
        result = await joke_selection_agent.run('Tell me a joke.', deps=deps)
        print(result.output)
        # > Did you hear about the toothpaste scandal? They called it Colgate.
        print(result.usage())
        # > Usage(requests=4, request_tokens=309, response_tokens=32, total_tokens=341)
```
