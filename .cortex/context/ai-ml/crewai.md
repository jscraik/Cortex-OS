========================
CODE SNIPPETS
========================
TITLE: Quick Setup: Install and Initialize Neatlogs
DESCRIPTION: A concise guide to get started with Neatlogs and CrewAI. Install the SDK and initialize it with your API key to capture, understand, share, and act on your agent runs with full transparency and collaboration.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/observability/neatlogs.mdx#_snippet_2

LANGUAGE: bash
CODE:

```
pip install neatlogs
```

LANGUAGE: python
CODE:

```
import neatlogs
neatlogs.init("YOUR_API_KEY")
```

---

TITLE: CrewAI Enterprise API Quick Start Endpoints
DESCRIPTION: Provides a quick guide to the essential API endpoints for getting started with CrewAI Enterprise, including discovering inputs, starting execution, and monitoring progress.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/api-reference/introduction.mdx#_snippet_4

LANGUAGE: APIDOC
CODE:

```
Get Your API Credentials: Navigate to your crew's detail page in the CrewAI Enterprise dashboard and copy your Bearer Token from the Status tab.
Discover Required Inputs: Use the `GET /inputs` endpoint to see what parameters your crew expects.
Start a Crew Execution: Call `POST /kickoff` with your inputs to start the crew execution and receive a `kickoff_id`.
Monitor Progress: Use `GET /status/{kickoff_id}` to check execution status and retrieve results.
```

---

TITLE: CrewAI CLI Commands for Flow Management
DESCRIPTION: Command-line interface (CLI) commands for interacting with CrewAI flows. `crewai install` is used to install project dependencies, `crewai flow kickoff` starts the guide creation process, and `crewai flow plot` generates a visual representation of the flow's structure.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/guides/flows/first-flow.mdx#_snippet_13

LANGUAGE: bash
CODE:

```
crewai install
```

LANGUAGE: bash
CODE:

```
crewai flow kickoff
```

LANGUAGE: bash
CODE:

```
crewai flow plot
```

---

TITLE: Run CrewAI Project - Shell
DESCRIPTION: Executes your CrewAI project. This command starts the AI agents and tasks defined in your project's configuration files.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_11

LANGUAGE: shell
CODE:

```
crewai run
```

---

TITLE: Install CrewAI CLI
DESCRIPTION: Installs the CrewAI library, which includes the command-line interface. This is the primary method to get started with the CrewAI CLI.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/cli.mdx#_snippet_0

LANGUAGE: shell
CODE:

```
pip install crewai
```

---

TITLE: Guide Creation Flow Setup and Models
DESCRIPTION: Sets up the main flow for creating a guide, including defining Pydantic models (`Section`, `GuideOutline`) for structured data and importing the `ContentCrew`. This code snippet demonstrates how to structure data for a guide and prepare for orchestrating tasks.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/guides/flows/first-flow.mdx#_snippet_7

LANGUAGE: python
CODE:

```
#!/usr/bin/env python
import json
import os
from typing import List, Dict
from pydantic import BaseModel, Field
from crewai import LLM
from crewai.flow.flow import Flow, listen, start
from guide_creator_flow.crews.content_crew.content_crew import ContentCrew

# Define our models for structured data
class Section(BaseModel):
    title: str = Field(description="Title of the section")
    description: str = Field(description="Brief description of what the section should cover")

class GuideOutline(BaseModel):
    title: str = Field(description="Title of the guide")
    introduction: str = Field(description="Introduction to the topic")
    target_audience: str = Field(description="Description of the target audience")
    sections: List[Section] = Field(description="List of sections in the guide")
    conclusion: str = Field(description="Conclusion or summary of the guide")

```

---

TITLE: Install uv (Windows via PowerShell) - Shell
DESCRIPTION: Installs the uv dependency manager and package handler on Windows systems using PowerShell. This command downloads and executes the installation script.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_3

LANGUAGE: shell
CODE:

```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

TITLE: Full Agent Collaboration Example
DESCRIPTION: A comprehensive example demonstrating the setup of multiple agents (Researcher, Writer, Editor) and a Crew to collaborate on a content creation task. It highlights how `allow_delegation=True` facilitates teamwork.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/collaboration.mdx#_snippet_3

LANGUAGE: python
CODE:

```
from crewai import Agent, Crew, Task, Process

# Create collaborative agents
researcher = Agent(
    role="Research Specialist",
    goal="Find accurate, up-to-date information on any topic",
    backstory="""You're a meticulous researcher with expertise in finding
    reliable sources and fact-checking information across various domains.""",
    allow_delegation=True,
    verbose=True
)

writer = Agent(
    role="Content Writer",
    goal="Create engaging, well-structured content",
    backstory="""You're a skilled content writer who excels at transforming
    research into compelling, readable content for different audiences.""",
    allow_delegation=True,
    verbose=True
)

editor = Agent(
    role="Content Editor",
    goal="Ensure content quality and consistency",
    backstory="""You're an experienced editor with an eye for detail,
    ensuring content meets high standards for clarity and accuracy.""",
    allow_delegation=True,
    verbose=True
)

# Create a task that encourages collaboration
article_task = Task(
    description="""Write a comprehensive 1000-word article about 'The Future of AI in Healthcare'.

    The article should include:
    - Current AI applications in healthcare
    - Emerging trends and technologies
    - Potential challenges and ethical considerations
    - Expert predictions for the next 5 years

    Collaborate with your teammates to ensure accuracy and quality.""",
    expected_output="A well-researched, engaging 1000-word article with proper structure and citations",
    agent=writer  # Writer leads, but can delegate research to researcher
)

# Create collaborative crew
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[article_task],
    process=Process.sequential,
    verbose=True
)

result = crew.kickoff()
```

---

TITLE: Basic Salesforce Agent Setup with CrewAI
DESCRIPTION: Python code example demonstrating how to set up a CrewAI agent with Salesforce capabilities using CrewaiEnterpriseTools. It shows how to initialize tools, create an agent, define a task, and run the crew.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/salesforce.mdx#_snippet_20

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Salesforce tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Salesforce capabilities
salesforce_agent = Agent(
    role="CRM Manager",
    goal="Manage customer relationships and sales processes efficiently",
    backstory="An AI assistant specialized in CRM operations and sales automation.",
    tools=[enterprise_tools]
)

# Task to create a new lead
create_lead_task = Task(
    description="Create a new lead for John Doe from Example Corp with email john.doe@example.com",
    agent=salesforce_agent,
    expected_output="Lead created successfully with lead ID"
)

# Run the task
crew = Crew(
    agents=[salesforce_agent],
    tasks=[create_lead_task]
)

crew.kickoff()
```

---

TITLE: Install uv (macOS/Linux via wget) - Shell
DESCRIPTION: Installs the uv dependency manager and package handler on macOS or Linux systems using wget, as an alternative if curl is not available. This script handles the setup of uv.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_2

LANGUAGE: shell
CODE:

```
wget -qO- https://astral.sh/uv/install.sh | sh
```

---

TITLE: Install Project Dependencies
DESCRIPTION: Installs all project dependencies, optionally locking them first. This command ensures your environment is set up correctly to run the CrewAI project.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/flow/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
crewai install
```

---

TITLE: Install CrewAI Project Dependencies
DESCRIPTION: Navigates to your project directory and installs all necessary dependencies for your CrewAI project using the `crewai install` command.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/tool/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
crewai install
```

---

TITLE: Verify CrewAI Installation - Shell
DESCRIPTION: Lists installed tools managed by uv to confirm that CrewAI has been successfully installed. It shows the version of the installed crewai package.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_6

LANGUAGE: shell
CODE:

```
uv tool list
```

---

TITLE: Install CrewAI CLI - Shell
DESCRIPTION: Installs the CrewAI command-line interface (CLI) using uv. This command makes the crewai tool available for project management and execution.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_4

LANGUAGE: shell
CODE:

```
uv tool install crewai
```

---

TITLE: Basic ClickUp Agent Setup
DESCRIPTION: Example of setting up a basic agent using CrewAI and CrewaiEnterpriseTools for ClickUp integration.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/clickup.mdx#_snippet_12

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Example setup (details omitted as per input)
# crew = Crew(
#     agents=[
#         # Define your agents here
#     ],
#     tasks=[
#         # Define your tasks here
#     ],
#     tools=[
#         CrewaiEnterpriseTools()
#     ]
# )

# crew.kickoff()
```

---

TITLE: Create CrewAI Project Scaffolding - Shell
DESCRIPTION: Generates a new CrewAI project structure with essential files and directories. Replace <your_project_name> with your desired project name.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_8

LANGUAGE: shell
CODE:

```
crewai create crew <your_project_name>
```

---

TITLE: Start Simple and Iterate Model Configurations in CrewAI
DESCRIPTION: Begin with straightforward model configurations for your CrewAI setup. Optimize specific agents or introduce complex model-switching logic only after testing and validating performance gains against your actual workflows and business goals.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/learn/llm-selection-guide.mdx#_snippet_6

LANGUAGE: python
CODE:

```
from crewai import Crew, Agent, LLM

# Start with a simple, general-purpose model
crew = Crew(
    agents=[Agent(role="General Agent", llm=LLM(model="gpt-4o-mini"))],
    tasks=[None], # Placeholder tasks
    llm=LLM(model="gpt-4o-mini")
)

# Later, based on performance testing, optimize specific agents:
# optimized_agent = Agent(role="Specialized Agent", llm=LLM(model="gpt-4-turbo"))
```

---

TITLE: Run the CrewAI Project
DESCRIPTION: Executes the CrewAI project, initiating the defined AI agents and tasks. This command starts the main workflow of your crew.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/flow/README.md#_snippet_2

LANGUAGE: bash
CODE:

```
crewai run
```

---

TITLE: Install UV
DESCRIPTION: Installs the UV package manager, used for dependency management and package handling in the project.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/crew/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install uv
```

---

TITLE: Install CrewAI
DESCRIPTION: Installs the core CrewAI framework using pip. This is the primary command for setting up the library.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/README.md#_snippet_23

LANGUAGE: shell
CODE:

```
pip install crewai
```

---

TITLE: Install CrewAI Project Dependencies - Shell
DESCRIPTION: Installs all necessary Python packages for your CrewAI project, typically defined in pyproject.toml. This command should be run in the root of your project directory.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_9

LANGUAGE: shell
CODE:

```
crewai install
```

---

TITLE: Install uv Package Manager
DESCRIPTION: Installs the uv package manager, which is recommended for managing Python dependencies in the project. Ensure you have Python installed before running this command.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/flow/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install uv
```

---

TITLE: Crew Configuration Setup (Python)
DESCRIPTION: Initiates the setup for a CrewAI crew, which orchestrates agents and tasks. This Python script is the starting point for defining the team's workflow and execution. The provided snippet is incomplete.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/guides/crews/first-crew.mdx#_snippet_5

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew, Process

# Define agents (assuming agents.yaml is loaded or agents are defined here)
# Define tasks (assuming tasks.yaml is loaded or tasks are defined here)

# Example of how agents and tasks might be instantiated (conceptual)
# researcher_agent = Agent(
#   role='Senior Research Specialist',
#   goal='Find comprehensive information',
#   backstory='You are an experienced research specialist.',
#   llm=llm_model # Assuming llm_model is defined
# )

# research_task = Task(
#   description='Conduct thorough research on {topic}',
#   expected_output='A comprehensive research document.',
#   agent=researcher_agent
# )

# Create a crew with the agents and tasks
# crew = Crew(
#   agents=[researcher_agent, analyst_agent], # Assuming analyst_agent is also defined
#   tasks=[research_task, analysis_task], # Assuming analysis_task is also defined
#   process=Process.sequential # Or other process types like hierarchical
# )

# To run the crew:
# result = crew.kickoff()
# print(result)

# The provided snippet ends here, indicating the start of the crew configuration.
```

---

TITLE: Manual StdioServer Integration with CrewAI
DESCRIPTION: This snippet demonstrates manually starting and managing a StdioServer using `MCPServerAdapter` and integrating its tools with a CrewAI agent for task execution. It covers server parameter setup, starting/stopping the server, and using the server's tools within an agent's capabilities. Ensure `MCPServerAdapter` and CrewAI are installed and the Stdio server script path is correct.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/mcp/stdio.mdx#_snippet_2

LANGUAGE: python
CODE:

```
import os
from crewai import Agent, Task, Crew, Process
from crewai_tools.tools.stdio import StdioServerParameters, MCPServerAdapter

# Create a StdioServerParameters object
stdio_params = StdioServerParameters(
    command="python3",
    args=["servers/your_stdio_server.py"], # Replace with your actual server script path
    env={"UV_PYTHON": "3.12", **os.environ},
)

mcp_server_adapter = MCPServerAdapter(server_params=stdio_params)
try:
    mcp_server_adapter.start()  # Manually start the connection and server process
    tools = mcp_server_adapter.tools
    print(f"Available tools (manual Stdio): {[tool.name for tool in tools]}")

    # Example: Using the tools with your Agent, Task, Crew setup
    manual_agent = Agent(
        role="Local Task Executor",
        goal="Execute a specific local task using a manually managed Stdio tool.",
        backstory="An AI proficient in controlling local processes via MCP.",
        tools=tools,
        verbose=True
    )

    manual_task = Task(
        description="Execute the 'perform_analysis' command via the Stdio tool.", # Replace with an actual command your tool supports
        expected_output="Results of the analysis.",
        agent=manual_agent
    )

    manual_crew = Crew(
        agents=[manual_agent],
        tasks=[manual_task],
        verbose=True,
        process=Process.sequential
    )


    result = manual_crew.kickoff() # Actual inputs depend on your tool
    print("\nCrew Task Result (Stdio - Manual):\n", result)

except Exception as e:
    print(f"An error occurred during manual Stdio MCP integration: {e}")
finally:
    if mcp_server_adapter and mcp_server_adapter.is_connected: # Check if connected before stopping
        print("Stopping Stdio MCP server connection (manual)...")
        mcp_server_adapter.stop()  # **Crucial: Ensure stop is called**
    elif mcp_server_adapter: # If adapter exists but not connected (e.g. start failed)
        print("Stdio MCP server adapter was not connected. No stop needed or start failed.")

# Remember to replace placeholder paths and commands with your actual Stdio server details.
# The env parameter in StdioServerParameters can be used to set environment variables for the server process,
# which can be useful for configuring its behavior or providing necessary paths (like PYTHONPATH).
```

---

TITLE: Install uv (macOS/Linux via curl) - Shell
DESCRIPTION: Installs the uv dependency manager and package handler on macOS or Linux systems using curl. This is the recommended first step for setting up your environment.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_1

LANGUAGE: shell
CODE:

```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

TITLE: Get User Input for Guide Creation in Python
DESCRIPTION: Captures the guide topic and audience level from user input. Includes validation to ensure the audience level is one of the accepted values (beginner, intermediate, advanced).

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/guides/flows/first-flow.mdx#_snippet_8

LANGUAGE: python
CODE:

```
class GuideCreatorState(BaseModel):
    topic: str = ""
    audience_level: str = ""
    guide_outline: GuideOutline = None
    sections_content: Dict[str, str] = {}

class GuideCreatorFlow(Flow[GuideCreatorState]):
    """Flow for creating a comprehensive guide on any topic"""

    @start()
    def get_user_input(self):
        """Get input from the user about the guide topic and audience"""
        print("\n=== Create Your Comprehensive Guide ===\n")

        # Get user input
        self.state.topic = input("What topic would you like to create a guide for? ")

        # Get audience level with validation
        while True:
            audience = input("Who is your target audience? (beginner/intermediate/advanced) ").lower()
            if audience in ["beginner", "intermediate", "advanced"]:
                self.state.audience_level = audience
                break
            print("Please enter 'beginner', 'intermediate', or 'advanced'")

        print(f"\nCreating a guide on {self.state.topic} for {self.state.audience_level} audience...\n")
        return self.state
```

---

TITLE: Install CrewAI Basic
DESCRIPTION: Installs the core CrewAI package. This is the primary command for setting up the framework for basic agent automation tasks.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pip install crewai
```

---

TITLE: Start Crew Execution (kickoff)
DESCRIPTION: Demonstrates the basic method to start a crew's workflow using `kickoff()`. This initiates the execution of tasks according to the defined process, allowing the crew to begin its operations.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/concepts/crews.mdx#_snippet_5

LANGUAGE: python
CODE:

```
# Iniciar execução das tasks da crew
result = my_crew.kickoff()
print(result)
```

---

TITLE: Python CrewAI Flow Example
DESCRIPTION: Demonstrates creating a simple CrewAI Flow with two tasks: generating a random city and then generating a fun fact about that city. It utilizes the @start() and @listen() decorators to define the workflow and manage task dependencies. Requires OpenAI API key setup in .env.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/flows.mdx#_snippet_0

LANGUAGE: python
CODE:

```
from crewai.flow.flow import Flow, listen, start
from dotenv import load_dotenv
from litellm import completion


class ExampleFlow(Flow):
    model = "gpt-4o-mini"

    @start()
    def generate_city(self):
        print("Starting flow")
        # Each flow state automatically gets a unique ID
        print(f"Flow State ID: {self.state['id']}")

        response = completion(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": "Return the name of a random city in the world.",
                },
            ],
        )

        random_city = response["choices"][0]["message"]["content"]
        # Store the city in our state
        self.state["city"] = random_city
        print(f"Random City: {random_city}")

        return random_city

    @listen(generate_city)
    def generate_fun_fact(self, random_city):
        response = completion(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": f"Tell me a fun fact about {random_city}",
                },
            ],
        )

        fun_fact = response["choices"][0]["message"]["content"]
        # Store the fun fact in our state
        self.state["fun_fact"] = fun_fact
        return fun_fact


flow = ExampleFlow()
flow.plot()
result = flow.kickoff()

print(f"Generated fun fact: {result}")
```

---

TITLE: Install Weaviate Client (Shell)
DESCRIPTION: Shows how to install the necessary `weaviate-client` package using `uv`. This is a prerequisite for using the WeaviateVectorSearchTool.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/tools/database-data/weaviatevectorsearchtool.mdx#_snippet_0

LANGUAGE: shell
CODE:

```
uv add weaviate-client
```

---

TITLE: Install CrewAI Dependencies
DESCRIPTION: Locks and installs project dependencies using the crewAI CLI. This command ensures all required packages are set up for the project.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/crew/README.md#_snippet_1

LANGUAGE: bash
CODE:

```
crewai install
```

---

TITLE: Install CrewAI Tool
DESCRIPTION: Installs a custom CrewAI tool that has been published, allowing it to be used within your crews.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/tool/README.md#_snippet_3

LANGUAGE: bash
CODE:

```
crewai tool install {{tool_name}}
```

---

TITLE: Install Qdrant Client
DESCRIPTION: Installs the required qdrant-client package using the uv package manager.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/tools/database-data/qdrantvectorsearchtool.mdx#_snippet_0

LANGUAGE: bash
CODE:

```
uv add qdrant-client
```

---

TITLE: Kick off a crew with adapted agents (Langchain OpenAI)
DESCRIPTION: Example demonstrating how to initialize CrewAI agents using specific adapters like OpenAI's agent adapter, integrating tools, and setting up agent roles and goals.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/learn/bring-your-own-agent.mdx#_snippet_13

LANGUAGE: python
CODE:

```
import json
import os
from typing import List

from crewai_tools import SerperDevTool
from src.crewai import Agent, Crew, Task
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from crewai.agents.agent_adapters.langgraph.langgraph_adapter import \
    LangGraphAgentAdapter
from crewai.agents.agent_adapters.openai_agents.openai_adapter import OpenAIAgentAdapter

# CrewAI Agent
code_helper_agent = Agent(
    role="Code Helper",
    goal="Help users solve coding problems effectively and provide clear explanations.",
    backstory="You are an experienced programmer with deep knowledge across multiple programming languages and frameworks. You specialize in solving complex coding challenges and explaining solutions clearly.",
    allow_delegation=False,
    verbose=True,
)
# OpenAI Agent Adapter
link_finder_agent = OpenAIAgentAdapter(
    role="Link Finder",
    goal="Find the most relevant and high-quality resources for coding tasks.",
    backstory="You are a research specialist with a talent for finding the most helpful resources. You're skilled at using search tools to discover documentation, tutorials, and examples that directly address the user's coding needs.",
    tools=[SerperDevTool()],
    allow_delegation=False,
    verbose=True,
)

```

---

TITLE: Run CrewAI Project
DESCRIPTION: Initializes and runs the AI crew. This command starts the agent execution based on the defined configurations.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/crew/README.md#_snippet_2

LANGUAGE: bash
CODE:

```
$ crewai run
```

---

TITLE: CrewAI Zendesk Agent Setup
DESCRIPTION: Demonstrates how to set up a CrewAI agent with Zendesk capabilities using CrewaiEnterpriseTools. This example shows task creation for managing support tickets.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/zendesk.mdx#_snippet_3

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Zendesk tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Zendesk capabilities
zendesk_agent = Agent(
    role="Support Manager",
    goal="Manage customer support tickets and provide excellent customer service",
    backstory="An AI assistant specialized in customer support operations and ticket management.",
    tools=[enterprise_tools]
)

# Task to create a new support ticket
create_ticket_task = Task(
    description="Create a high-priority support ticket for John Smith who is unable to access his account after password reset",
    agent=zendesk_agent,
    expected_output="Support ticket created successfully with ticket ID"
)

# Run the task
crew = Crew(
    agents=[zendesk_agent],
    tasks=[create_ticket_task]
)

crew.kickoff()
```

---

TITLE: Install UV Package Manager
DESCRIPTION: Installs the UV package manager, a fast Python package installer and resolver, used for dependency management in CrewAI projects.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/src/crewai/cli/templates/tool/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install uv
```

---

TITLE: Running the CrewAI Crew
DESCRIPTION: Shows how to instantiate the custom crew class and initiate its execution using the kickoff method. This method starts the agent workflow and can accept initial inputs.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/crews.mdx#_snippet_3

LANGUAGE: python
CODE:

```
YourCrewName().crew().kickoff(inputs={"any": "input here"})
```

---

TITLE: Install AgentOps Library
DESCRIPTION: Instala a biblioteca AgentOps, seja como uma dependência do CrewAI ou como um pacote independente.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/observability/agentops.mdx#_snippet_1

LANGUAGE: bash
CODE:

```
pip install 'crewai[agentops]'

# ou

pip install agentops
```

---

TITLE: Setup Hierarchical Crew with Manager Agent
DESCRIPTION: Demonstrates setting up a CrewAI project with a manager agent that coordinates specialist agents in a hierarchical process. Includes agent definitions, task creation, and crew instantiation.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/collaboration.mdx#_snippet_6

LANGUAGE: python
CODE:

```
from crewai import Agent, Crew, Task, Process

# Manager agent coordinates the team
manager = Agent(
    role="Project Manager",
    goal="Coordinate team efforts and ensure project success",
    backstory="Experienced project manager skilled at delegation and quality control",
    allow_delegation=True,
    verbose=True
)

# Specialist agents
researcher = Agent(
    role="Researcher",
    goal="Provide accurate research and analysis",
    backstory="Expert researcher with deep analytical skills",
    allow_delegation=False,  # Specialists focus on their expertise
    verbose=True
)

writer = Agent(
    role="Writer",
    goal="Create compelling content",
    backstory="Skilled writer who creates engaging content",
    allow_delegation=False,
    verbose=True
)

# Manager-led task
project_task = Task(
    description="Create a comprehensive market analysis report with recommendations",
    expected_output="Executive summary, detailed analysis, and strategic recommendations",
    agent=manager  # Manager will delegate to specialists
)

# Hierarchical crew
crew = Crew(
    agents=[manager, researcher, writer],
    tasks=[project_task],
    process=Process.hierarchical,  # Manager coordinates everything
    manager_llm="gpt-4o",  # Specify LLM for manager
    verbose=True
)
```

---

TITLE: CrewAI: Basic Asana Agent Setup
DESCRIPTION: Demonstrates setting up a CrewAI agent with Asana capabilities using CrewaiEnterpriseTools. This example shows how to initialize the tools and assign them to an agent for project management tasks.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/asana.mdx#_snippet_13

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Asana tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Asana capabilities
asana_agent = Agent(
    role="Project Manager",
    goal="Manage tasks and projects in Asana efficiently",
    backstory="An AI assistant specialized in project management and task coordination.",
    tools=[enterprise_tools]
)

# Task to create a new project
create_project_task = Task(
    description="Create a new project called 'Q1 Marketing Campaign' in the Marketing workspace",
    agent=asana_agent,
    expected_output="Confirmation that the project was created successfully with project ID"
)

# Run the task
crew = Crew(
    agents=[asana_agent],
    tasks=[create_project_task]
)

crew.kickoff()
```

---

TITLE: Kick Off Crew Execution
DESCRIPTION: Initiate the crew's workflow by calling the `kickoff()` method. This starts the execution of defined tasks by the assigned agents.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/__wiki__/Creating-a-Crew-and-kick-it-off.md#_snippet_3

LANGUAGE: python
CODE:

```
# Begin the task execution
tech_crew.kickoff()
```

---

TITLE: Interactive API Testing Workflow with cURL
DESCRIPTION: A step-by-step guide on how to test CrewAI Enterprise API endpoints using cURL examples, by replacing placeholder values with actual credentials and URLs.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/api-reference/introduction.mdx#_snippet_6

LANGUAGE: APIDOC
CODE:

```
1. Copy this cURL example from any endpoint page
2. Replace `your-actual-crew-name.crewai.com` with your real crew URL
3. Replace the Bearer token with your real token from the dashboard
4. Run the request in your terminal or API client
```

---

TITLE: Basic CrewAI Agent Setup with All Stripe Tools
DESCRIPTION: Demonstrates how to initialize `CrewaiEnterpriseTools` with a token to enable all available Stripe functionalities for a CrewAI agent. Includes an example task for creating a new customer.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/stripe.mdx#_snippet_10

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Stripe tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Stripe capabilities
stripe_agent = Agent(
    role="Payment Manager",
    goal="Manage customer payments, subscriptions, and billing operations efficiently",
    backstory="An AI assistant specialized in payment processing and subscription management.",
    tools=[enterprise_tools]
)

# Task to create a new customer
create_customer_task = Task(
    description="Create a new premium customer John Doe with email john.doe@example.com",
    agent=stripe_agent,
    expected_output="Customer created successfully with customer ID"
)

# Run the task
crew = Crew(
    agents=[stripe_agent],
    tasks=[create_customer_task]
)

crew.kickoff()
```

---

TITLE: CrewAI Guide Creator Flow Execution and Visualization
DESCRIPTION: Python functions to initiate the Guide Creator Flow and generate a visualization of its structure. The `kickoff` function runs the main flow, printing completion messages, while the `plot` function generates an HTML visualization. The script includes a standard `if __name__ == '__main__':` block to execute the `kickoff` function when run directly.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/guides/flows/first-flow.mdx#_snippet_11

LANGUAGE: python
CODE:

```
def kickoff():
    """Run the guide creator flow"""
    GuideCreatorFlow().kickoff()
    print("\n=== Flow Complete ===")
    print("Your comprehensive guide is ready in the output directory.")
    print("Open output/complete_guide.md to view it.")

def plot():
    """Generate a visualization of the flow"""
    flow = GuideCreatorFlow()
    flow.plot("guide_creator_flow")
    print("Flow visualization saved to guide_creator_creator_flow.html")

if __name__ == "__main__":
    kickoff()
```

---

TITLE: Navigate and Install CrewAI
DESCRIPTION: Commands to navigate to your project directory and optionally install the CrewAI package. Ensure you are in the root of your project before executing.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/README.md#_snippet_9

LANGUAGE: shell
CODE:

```
cd my_project
crewai install
```

---

TITLE: Install Linkup SDK
DESCRIPTION: Installs the necessary Linkup SDK package using the `uv` package manager. This is a prerequisite for using the `LinkupSearchTool`.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/tools/search-research/linkupsearchtool.mdx#_snippet_0

LANGUAGE: shell
CODE:

```
uv add linkup-sdk
```

---

TITLE: CrewAI kickoff() Basic Usage
DESCRIPTION: Demonstrates the basic usage of the kickoff() method to send a query to an agent and retrieve its raw response. It highlights how to initialize an agent with tools and interact with it directly.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/agents.mdx#_snippet_24

LANGUAGE: python
CODE:

```
from crewai import Agent
from crewai_tools import SerperDevTool

# Create an agent
researcher = Agent(
    role="AI Technology Researcher",
    goal="Research the latest AI developments",
    tools=[SerperDevTool()],
    verbose=True
)

# Use kickoff() to interact directly with the agent
result = researcher.kickoff("What are the latest developments in language models?")

# Access the raw response
print(result.raw)
```

---

TITLE: Python: Basic Salesforce Agent Setup with CrewAI
DESCRIPTION: Demonstrates how to initialize `CrewaiEnterpriseTools` and create a Salesforce-capable agent. It includes an example task for creating a new lead, showcasing a fundamental integration pattern.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/salesforce.mdx#_snippet_34

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Salesforce tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Salesforce capabilities
salesforce_agent = Agent(
    role="CRM Manager",
    goal="Manage customer relationships and sales processes efficiently",
    backstory="An AI assistant specialized in CRM operations and sales automation.",
    tools=[enterprise_tools]
)

# Task to create a new lead
create_lead_task = Task(
    description="Create a new lead for John Doe from Example Corp with email john.doe@example.com",
    agent=salesforce_agent,
    expected_output="Lead created successfully with lead ID"
)

# Run the task
crew = Crew(
    agents=[salesforce_agent],
    tasks=[create_lead_task]
)

crew.kickoff()
```

---

TITLE: Initialize and Use Research Tools
DESCRIPTION: Demonstrates how to import and instantiate various CrewAI tools for web search, code search, and video research. It then shows how to add these tools to an agent's configuration.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/tools/search-research/overview.mdx#_snippet_0

LANGUAGE: python
CODE:

```
from crewai_tools import SerperDevTool, GitHubSearchTool, YoutubeVideoSearchTool, TavilySearchTool, TavilyExtractorTool

# Create research tools
web_search = SerperDevTool()
code_search = GitHubSearchTool()
video_research = YoutubeVideoSearchTool()
tavily_search = TavilySearchTool()
content_extractor = TavilyExtractorTool()

# Add to your agent
agent = Agent(
    role="Research Analyst",
    tools=[web_search, code_search, video_research, tavily_search, content_extractor],
    goal="Gather comprehensive information on any topic"
)
```

---

TITLE: Kickoff with Repository Agents and Structured Output
DESCRIPTION: Demonstrates using the `kickoff()` method with an agent loaded from a repository, including how to specify a structured output format using Pydantic models. It shows accessing both raw and structured results.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/features/agent-repositories.mdx#_snippet_4

LANGUAGE: python
CODE:

```
from crewai import Agent
from pydantic import BaseModel
from typing import List

# Define a structured output format
class MarketAnalysis(BaseModel):
    key_trends: List[str]
    opportunities: List[str]
    recommendation: str

# Load an agent from repository
analyst = Agent(
    from_repository="market-analyst-agent",
    verbose=True
)

# Get a free-form response
result = analyst.kickoff("Analyze the AI market in 2025")
print(result.raw)  # Access the raw response

# Get structured output
structured_result = analyst.kickoff(
    "Provide a structured analysis of the AI market in 2025",
    response_format=MarketAnalysis
)

# Access structured data
print(f"Key Trends: {structured_result.pydantic.key_trends}")
print(f"Recommendation: {structured_result.pydantic.recommendation}")
```

---

TITLE: Check Python Version - Shell
DESCRIPTION: Verifies the currently installed Python version. CrewAI requires Python version 3.10 or higher.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_0

LANGUAGE: shell
CODE:

```
python3 --version
```

---

TITLE: CrewAI CLI Commands for Flow Execution
DESCRIPTION: These bash commands are used to manage and execute CrewAI flows. 'crewai install' installs project dependencies, 'source .venv/bin/activate' activates the virtual environment, and 'crewai flow kickoff' or 'uv run kickoff' starts the defined AI workflow.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/flows.mdx#_snippet_16

LANGUAGE: bash
CODE:

```
crewai install
```

LANGUAGE: bash
CODE:

```
source .venv/bin/activate
```

LANGUAGE: bash
CODE:

```
crewai flow kickoff
```

LANGUAGE: bash
CODE:

```
uv run kickoff
```

---

TITLE: Install Locally
DESCRIPTION: Command to install the project locally from a built distribution file.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/README.md#_snippet_22

LANGUAGE: bash
CODE:

```
pip install dist/*.tar.gz
```

---

TITLE: Basic Shopify Agent Setup with CrewAI
DESCRIPTION: Sets up a basic CrewAI agent with Shopify capabilities using CrewaiEnterpriseTools. This example shows how to initialize the tools and assign them to an agent for managing e-commerce operations, including creating new customers.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/shopify.mdx#_snippet_7

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Shopify tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Shopify capabilities
shopify_agent = Agent(
    role="E-commerce Manager",
    goal="Manage online store operations and customer relationships efficiently",
    backstory="An AI assistant specialized in e-commerce operations and online store management.",
    tools=[enterprise_tools]
)

# Task to create a new customer
create_customer_task = Task(
    description="Create a new VIP customer Jane Smith with email jane.smith@example.com and phone +1-555-0123",
    agent=shopify_agent,
    expected_output="Customer created successfully with customer ID"
)

# Run the task
crew = Crew(
    agents=[shopify_agent],
    tasks=[create_customer_task]
)

crew.kickoff()
```

---

TITLE: Update uv Shell Configuration - Shell
DESCRIPTION: Updates the current shell environment to recognize the uv commands after installation. This is necessary if you encounter 'command not found' errors for uv.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/installation.mdx#_snippet_5

LANGUAGE: shell
CODE:

```
uv tool update-shell
```

---

TITLE: CrewAI Sequential Process Example
DESCRIPTION: Demonstrates how to set up and execute a CrewAI with a sequential process. It includes defining agents, tasks, and configuring the crew for linear task execution. The example highlights the use of `Process.sequential` and accessing type-safe outputs.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/learn/sequential-process.mdx#_snippet_0

LANGUAGE: python
CODE:

```
from crewai import Crew, Process, Agent, Task, TaskOutput, CrewOutput

# Define your agents
researcher = Agent(
  role='Researcher',
  goal='Conduct foundational research',
  backstory='An experienced researcher with a passion for uncovering insights'
)
analyst = Agent(
  role='Data Analyst',
  goal='Analyze research findings',
  backstory='A meticulous analyst with a knack for uncovering patterns'
)
writer = Agent(
  role='Writer',
  goal='Draft the final report',
  backstory='A skilled writer with a talent for crafting compelling narratives'
)

# Define your tasks
research_task = Task(
  description='Gather relevant data...',
  agent=researcher,
  expected_output='Raw Data'
)
analysis_task = Task(
  description='Analyze the data...',
  agent=analyst,
  expected_output='Data Insights'
)
writing_task = Task(
  description='Compose the report...',
  agent=writer,
  expected_output='Final Report'
)

# Form the crew with a sequential process
report_crew = Crew(
  agents=[researcher, analyst, writer],
  tasks=[research_task, analysis_task, writing_task],
  process=Process.sequential
)

# Execute the crew
result = report_crew.kickoff()

# Accessing the type-safe output
task_output: TaskOutput = result.tasks[0].output
crew_output: CrewOutput = result.output

```

---

TITLE: LinkupSearchTool API Documentation
DESCRIPTION: Details the parameters for initializing and running the `LinkupSearchTool`, including constructor arguments and runtime parameters, along with expected return formats for success and error scenarios.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/tools/search-research/linkupsearchtool.mdx#_snippet_3

LANGUAGE: APIDOC
CODE:

```
LinkupSearchTool:
  __init__(api_key: str)
    Parameters:
      - api_key: Your Linkup API key. (Required)

  run(query: str, depth: str = 'standard', output_type: str = 'searchResults')
    Parameters:
      - query: The search term or phrase. (Required)
      - depth: The search depth. Options: 'standard', 'deep'. (Optional, default: 'standard')
      - output_type: The type of output. Options: 'searchResults'. (Optional, default: 'searchResults')
    Returns:
      A JSON object containing search results or an error message.

Return Format (Success):
{
  "success": true,
  "results": [
    {
      "name": "Result Title",
      "url": "https://example.com/result",
      "content": "Content of the result..."
    }
    // Additional results...
  ]
}

Return Format (Error):
{
  "success": false,
  "error": "Error message"
}
```

---

TITLE: CrewAI Execution Example
DESCRIPTION: Demonstrates how to execute a CrewAI crew defined using the Python class structure. It shows the basic method call to start the crew's operation with optional inputs.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/concepts/crews.mdx#_snippet_1

LANGUAGE: python
CODE:

```
YourCrewName().crew().kickoff(inputs={"any": "input here"})
```

---

TITLE: CrewAI Basic Notion Agent Setup
DESCRIPTION: Example Python code demonstrating how to set up a CrewAI agent with Notion capabilities using CrewaiEnterpriseTools. It includes creating an agent, defining a task, and running a crew.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/notion.mdx#_snippet_6

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Notion tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Notion capabilities
notion_agent = Agent(
    role="Documentation Manager",
    goal="Manage documentation and knowledge base in Notion efficiently",
    backstory="An AI assistant specialized in content management and documentation.",
    tools=[enterprise_tools]
)

# Task to create a meeting notes page
create_notes_task = Task(
    description="Create a new meeting notes page in the team database with today's date and agenda items",
    agent=notion_agent,
    expected_output="Meeting notes page created successfully with structured content"
)

# Run the task
crew = Crew(
    agents=[notion_agent],
    tasks=[create_notes_task]
)

crew.kickoff()
```

---

TITLE: Authentication Setup
DESCRIPTION: Configure API keys for LLM providers by setting environment variables. This example shows the correct format for OpenAI and Anthropic API keys.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/llms.mdx#_snippet_37

LANGUAGE: bash
CODE:

```
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

---

TITLE: Agent Integration Example with Data Analyst
DESCRIPTION: A detailed example showing a Data Analyst agent using the CodeInterpreterTool to analyze data with Python. It covers agent setup, tool initialization, and task definition.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/tools/ai-ml/codeinterpretertool.mdx#_snippet_4

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CodeInterpreterTool

# Initialize the tool
code_interpreter = CodeInterpreterTool()

# Define an agent that uses the tool
data_analyst = Agent(
    role="Data Analyst",
    goal="Analyze data using Python code",
    backstory="""You are an expert data analyst who specializes in using Python
    to analyze and visualize data. You can write efficient code to process
    large datasets and extract meaningful insights.""",
    tools=[code_interpreter],
    verbose=True,
)
```

---

TITLE: Install OpenLIT SDK
DESCRIPTION: Instala o SDK Python do OpenLIT usando pip. Este pacote fornece as ferramentas necessárias para integrar o OpenLIT com suas aplicações Python.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/observability/openlit.mdx#_snippet_2

LANGUAGE: shell
CODE:

```
pip install openlit
```

---

TITLE: CrewAI: Basic Notion Agent Setup
DESCRIPTION: Demonstrates how to initialize a CrewAI agent with Notion capabilities by integrating `CrewaiEnterpriseTools`. This example sets up an agent and a task to create meeting notes in Notion.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/enterprise/integrations/notion.mdx#_snippet_16

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew
from crewai_tools import CrewaiEnterpriseTools

# Get enterprise tools (Notion tools will be included)
enterprise_tools = CrewaiEnterpriseTools(
    enterprise_token="your_enterprise_token"
)

# Create an agent with Notion capabilities
notion_agent = Agent(
    role="Documentation Manager",
    goal="Manage documentation and knowledge base in Notion efficiently",
    backstory="An AI assistant specialized in content management and documentation.",
    tools=[enterprise_tools]
)

# Task to create a meeting notes page
create_notes_task = Task(
    description="Create a new meeting notes page in the team database with today's date and agenda items",
    agent=notion_agent,
    expected_output="Meeting notes page created successfully with structured content"
)

# Run the task
crew = Crew(
    agents=[notion_agent],
    tasks=[create_notes_task]
)

crew.kickoff()
```

---

TITLE: Basic Task Execution with CrewAI
DESCRIPTION: Demonstrates the fundamental setup of a CrewAI crew with an agent and a task. This snippet shows how to define a task with a description and an expected output, assign it to an agent, and then initiate the crew's execution using kickoff().

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/enterprise/integrations/box.mdx#_snippet_3

LANGUAGE: python
CODE:

```
from crewai import Agent, Task, Crew

# Assuming box_agent is already defined and configured
# Example placeholder for box_agent:
# box_agent = Agent(role='Box Manager', goal='Manage files in Box', backstory='An AI that organizes Box files.')

# Placeholder for box_agent definition if not provided in context
class MockAgent:
    def __init__(self, role, goal, backstory):
        self.role = role
        self.goal = goal
        self.backstory = backstory

box_agent = MockAgent(role='Box Manager', goal='Manage files in Box', backstory='An AI that organizes Box files.')

create_structure_task = Task(
    description="Create a folder called 'Project Files' in the root directory and upload a document from URL",
    agent=box_agent,
    expected_output="Folder created and file uploaded successfully"
)

crew = Crew(
    agents=[box_agent],
    tasks=[create_structure_task]
)

crew.kickoff()

```

---

TITLE: Start OpenLIT Docker Compose
DESCRIPTION: Inicia os serviços do OpenLIT usando Docker Compose em modo detached. Requer que o Docker esteja instalado e em execução.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/pt-BR/observability/openlit.mdx#_snippet_1

LANGUAGE: shell
CODE:

```
docker compose up -d
```

---

TITLE: Create Multimodal Agent (Python)
DESCRIPTION: This example demonstrates the setup of a multimodal agent in CrewAI, designed to process and analyze both text and visual content. The `multimodal` parameter is set to `True` to enable these capabilities.

SOURCE: https://github.com/crewaiinc/crewai/blob/main/docs/en/concepts/agents.mdx#_snippet_12

LANGUAGE: python
CODE:

```
multimodal_agent = Agent(
    role="Visual Content Analyst",
    goal="Analyze and process both text and visual content",
    backstory="Specialized in multimodal analysis combining text and image understanding",
    multimodal=True,  # Enable multimodal capabilities
    verbose=True
)
```
