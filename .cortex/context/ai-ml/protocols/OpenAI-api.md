========================
CODE SNIPPETS
========================

TITLE: OpenAI Get Started
DESCRIPTION: Guides for new users to get started with the OpenAI platform, including an overview, quickstart, models, pricing, and available libraries.

SOURCE: <https://platform.openai.com/docs/quickstart_api-mode=responses>

LANGUAGE: APIDOC
CODE:

```
Overview:
  https://platform.openai.com/docs/overview

Quickstart:
  https://platform.openai.com/docs/quickstart

Models:
  https://platform.openai.com/docs/models

Pricing:
  https://platform.openai.com/docs/pricing

Libraries:
  https://platform.openai.com/docs/libraries
```

---

TITLE: OpenAI Get Started
DESCRIPTION: Guides for new users to get started with the OpenAI platform, including an overview, quickstart, models, pricing, and available libraries.

SOURCE: <https://platform.openai.com/docs/guides/tools-remote-mcp>

LANGUAGE: APIDOC
CODE:

```
Overview:
  https://platform.openai.com/docs/overview

Quickstart:
  https://platform.openai.com/docs/quickstart

Models:
  https://platform.openai.com/docs/models

Pricing:
  https://platform.openai.com/docs/pricing

Libraries:
  https://platform.openai.com/docs/libraries
```

---

TITLE: OpenAI Get Started
DESCRIPTION: Guides for new users to get started with the OpenAI platform, including an overview, quickstart, models, pricing, and available libraries.

SOURCE: <https://platform.openai.com/docs/models/gpt-4o-mini-realtime>

LANGUAGE: APIDOC
CODE:

```
Overview:
  https://platform.openai.com/docs/overview

Quickstart:
  https://platform.openai.com/docs/quickstart

Models:
  https://platform.openai.com/docs/models

Pricing:
  https://platform.openai.com/docs/pricing

Libraries:
  https://platform.openai.com/docs/libraries
```

---

TITLE: OpenAI Get Started
DESCRIPTION: Guides for getting started with the OpenAI platform, including overview, quickstart, models, pricing, and libraries.

SOURCE: <https://platform.openai.com/docs/guides/optimizing-llm-accuracy>

LANGUAGE: Overview
CODE:

```
https://platform.openai.com/docs/overview
```

LANGUAGE: Quickstart
CODE:

```
https://platform.openai.com/docs/quickstart
```

LANGUAGE: Models
CODE:

```
https://platform.openai.com/docs/models
```

LANGUAGE: Pricing
CODE:

```
https://platform.openai.com/docs/pricing
```

LANGUAGE: Libraries
CODE:

```
https://platform.openai.com/docs/libraries
```

---

TITLE: OpenAI Platform Quickstart
DESCRIPTION: A guide to getting started quickly with the OpenAI platform.

SOURCE: <https://platform.openai.com/docs/guides/your-data>

LANGUAGE: APIDOC
CODE:

```
https://platform.openai.com/docs/quickstart
```

---

TITLE: OpenAI Get Started
DESCRIPTION: Guides for new users to get started with the OpenAI platform, including an overview, quickstart, models, pricing, and available libraries.

SOURCE: <https://platform.openai.com/docs/models>

LANGUAGE: APIDOC
CODE:

```
Overview:
  https://platform.openai.com/docs/overview

Quickstart:
  https://platform.openai.com/docs/quickstart

Models:
  https://platform.openai.com/docs/models

Pricing:
  https://platform.openai.com/docs/pricing

Libraries:
  https://platform.openai.com/docs/libraries
```

---

TITLE: OpenAI Platform - Overview
DESCRIPTION: An overview of the OpenAI platform, its capabilities, and getting started guide.

SOURCE: <https://platform.openai.com/docs/guides/prompting>

LANGUAGE: APIDOC
CODE:

```
Overview
https://platform.openai.com/docs/overview
```

---

TITLE: Setup Script Example
DESCRIPTION: This bash script demonstrates installing a type checker and project dependencies using pip and poetry, and pnpm.

SOURCE: <https://platform.openai.com/docs/codex/overview>

LANGUAGE: bash
CODE:

```
1
2
3
4
5
# Install type checkerpip install pyright
# Install dependenciespoetry install --with testpnpm install
```

---

TITLE: OpenAI Platform - Quickstart
DESCRIPTION: A quickstart guide to begin using the OpenAI platform.

SOURCE: <https://platform.openai.com/docs/guides/prompting>

LANGUAGE: APIDOC
CODE:

```
Quickstart
https://platform.openai.com/docs/quickstart
```

---

TITLE: Assistants File Search Quickstart Example
DESCRIPTION: A quickstart example demonstrating how to create an assistant capable of answering questions about companies' financial statements using the File Search feature.

SOURCE: <https://platform.openai.com/docs/assistants/tools/file-search>

LANGUAGE: APIDOC
CODE:

```
Quickstart Example:
  Use Case: Answering questions about companies' financial statements.
  Setup: Create an assistant that utilizes the File Search feature to access financial document data.
```

---

TITLE: Assistants API Overview and Quickstart
DESCRIPTION: Provides an introduction to the Assistants API, its core concepts, and a quickstart guide to get users up and running with basic functionalities.

SOURCE: <https://platform.openai.com/docs/assistants/whats-new>

LANGUAGE: APIDOC
CODE:

```
Assistants API:
  Overview: https://platform.openai.com/docs/assistants/overview
  Quickstart: https://platform.openai.com/docs/assistants/quickstart
```

---

TITLE: Assistants API Quickstart
DESCRIPTION: A step-by-step guide to creating an assistant using the Assistants API. This documentation outlines the process for setting up and utilizing assistants for various tasks.

SOURCE: <https://platform.openai.com/docs/assistants/quickstart>

LANGUAGE: APIDOC
CODE:

```
Assistants API Quickstart:
  A step-by-step guide to creating an assistant.
  Based on feedback from the Assistants API beta, key improvements have been incorporated into the Responses API.
  A deprecation plan will be announced later this year, with a target sunset date in the first half of 2026.
  Learn more: https://platform.openai.com/docs/guides/responses-vs-chat-completions
```

---

TITLE: Example Request: Get Organization Costs
DESCRIPTION: Example cURL command to fetch organization costs, specifying a start time and a limit.

SOURCE: <https://platform.openai.com/docs/api-reference/webhook_events/eval/run/succeeded>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/costs?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Request: Get Images Usage
DESCRIPTION: Example cURL command to fetch image usage data, specifying a start time and a limit.

SOURCE: <https://platform.openai.com/docs/api-reference/responses_streaming/response/mcp_call>

LANGUAGE: shell
CODE:

```
curl "https://api.openai.com/v1/organization/usage/images?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Request: Get Images Usage
DESCRIPTION: Example cURL command to fetch image usage data, specifying a start time and a limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/response/audio/delta>

LANGUAGE: bash
CODE:

```
curl "https://api.openai.com/v1/organization/usage/images?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Request: Get Moderations Usage
DESCRIPTION: Example cURL command to fetch moderations usage data, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_client_events/conversation/admin-api-keys>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/moderations?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI API Reference - Introduction
DESCRIPTION: Introduction to the OpenAI API reference, covering its structure and how to get started.

SOURCE: <https://platform.openai.com/docs/guides/prompting>

LANGUAGE: APIDOC
CODE:

```
API reference
https://platform.openai.com/docs/api-reference/introduction
```

---

TITLE: OpenAI API Get Organization Costs Example
DESCRIPTION: Example cURL request to retrieve organization costs with specified start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/models/list>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/costs?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Create Project Example
DESCRIPTION: Example of how to create a new project using the OpenAI API.

SOURCE: <https://platform.openai.com/docs/api-reference/usage/audio_transcriptions>

LANGUAGE: bash
CODE:

```
curl -X POST https://api.openai.com/v1/organization/projects \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Project ABC" }'
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime-server-events/input_audio_buffer/speech_started>

LANGUAGE: bash
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: Get Images Usage Request Example
DESCRIPTION: Example cURL command to fetch image usage data for an organization, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/vector_stores_file_batches/createBatch>

LANGUAGE: bash
CODE:

```
curl "https://api.openai.com/v1/organization/usage/images?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Request: Get Moderations Usage
DESCRIPTION: An example cURL command to retrieve moderations usage data from the OpenAI API, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/run_steps/getRunStep>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/moderations?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI Run and Scale
DESCRIPTION: Guides on managing and scaling applications using OpenAI, covering conversation state, background mode, streaming responses, webhooks, and file inputs.

SOURCE: <https://platform.openai.com/docs/quickstart_api-mode=responses>

LANGUAGE: APIDOC
CODE:

```
Conversation state:
  https://platform.openai.com/docs/guides/conversation-state

Background mode:
  https://platform.openai.com/docs/guides/background

Streaming responses:
  https://platform.openai.com/docs/guides/streaming-responses

Webhooks:
  https://platform.openai.com/docs/guides/webhooks

File inputs:
  https://platform.openai.com/docs/guides/pdf-files
```

---

TITLE: Get Vector Stores Usage Example Request
DESCRIPTION: Example cURL command to fetch vector stores usage data, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/responses_streaming/response/refusal>

LANGUAGE: Shell
CODE:

```
curl "https://api.openai.com/v1/organization/usage/vector_stores?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Create Project Example
DESCRIPTION: Example of how to create a new project using the OpenAI API with a cURL command.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/input_audio_buffer/speech_started>

LANGUAGE: bash
CODE:

```
curl -X POST https://api.openai.com/v1/organization/projects \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Project ABC" }'
```

---

TITLE: Example Request: Get Embeddings Usage
DESCRIPTION: An example cURL command to request embeddings usage data from the OpenAI API, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/responses_streaming/response/code_interpreter_call/in_progress>

LANGUAGE: bash
CODE:

```
curl "https://api.openai.com/v1/organization/usage/embeddings?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI Going Live Guides
DESCRIPTION: Best practices and guidance for deploying applications using OpenAI models, covering production readiness, latency, cost, and accuracy optimization.

SOURCE: <https://platform.openai.com/docs/guides/realtime-conversations>

LANGUAGE: APIDOC
CODE:

```
Production Best Practices:
  https://platform.openai.com/docs/guides/production-best-practices

Latency Optimization:
  (No specific URL provided in text)

Cost Optimization:
  (No specific URL provided in text)
```

---

TITLE: OpenAI API Request Example - Get Costs
DESCRIPTION: Example cURL command to request cost data from the OpenAI API, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_sessions/session_object>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/costs?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Request: Get Code Interpreter Sessions
DESCRIPTION: Example cURL request to fetch code interpreter sessions usage, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/response/audio_transcript>

LANGUAGE: shell
CODE:

```
curl "https://api.openai.com/v1/organization/usage/code_interpreter_sessions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI Going Live
DESCRIPTION: Best practices and considerations for deploying applications using OpenAI in production, including latency, cost, accuracy optimization, and safety.

SOURCE: <https://platform.openai.com/docs/quickstart_api-mode=responses>

LANGUAGE: APIDOC
CODE:

```
Production best practices:
  https://platform.openai.com/docs/guides/production-best-practices

Latency optimization:
  (No specific URL provided in the text, but mentioned as a concept)

Cost optimization:
  (No specific URL provided in the text, but mentioned as a concept)

Accuracy optimization:
  https://platform.openai.com/docs/guides/optimizing-llm-accuracy

Safety:
  (No specific URL provided in the text, but mentioned as a concept)
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/certificates/activateOrganizationCertificates>

LANGUAGE: bash
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: Example Request: Get Code Interpreter Sessions
DESCRIPTION: Example cURL command to fetch code interpreter sessions usage, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/response/audio>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/code_interpreter_sessions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Get Vector Stores Usage Example Request
DESCRIPTION: Example cURL command to fetch vector stores usage data, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/certificates/listProjectCertificates>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/vector_stores?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI Reasoning API Documentation
DESCRIPTION: Documentation for the OpenAI Reasoning API, covering getting started, how reasoning works, summaries, prompting advice, and use case examples.

SOURCE: <https://platform.openai.com/docs/guides/reasoning>

LANGUAGE: APIDOC
CODE:

```
OpenAI Reasoning API:

Overview:
  Provides capabilities for advanced reasoning tasks.

Key Sections:
  - Get started: Information on initiating use of reasoning features.
  - How reasoning works: Explains the underlying mechanisms of the reasoning models.
  - Reasoning summaries: Details on generating and utilizing summaries from reasoning processes.
  - Advice on prompting: Best practices for crafting effective prompts for reasoning models.
  - Use case examples: Practical applications and examples of reasoning models in action.

Related Resources:
  - Cookbook: https://cookbook.openai.com
  - Specific Use Cases:
    - Using reasoning for data validation: https://cookbook.openai.com/examples/o1/using_reasoning_for_data_validation
    - Using reasoning for routine generation: https://cookbook.openai.com/examples/o1/using_reasoning_for_routine_generation
```

---

TITLE: OpenAI Platform Going Live
DESCRIPTION: Guidance on deploying applications, including production best practices, latency optimization, and cost optimization.

SOURCE: <https://platform.openai.com/docs/guides/evals>

LANGUAGE: APIDOC
CODE:

```
Production best practices: https://platform.openai.com/docs/guides/production-best-practices
```

---

TITLE: OpenAI Platform - Webhooks Guide
DESCRIPTION: Guide on setting up and using webhooks with the OpenAI platform.

SOURCE: <https://platform.openai.com/docs/guides/prompting>

LANGUAGE: APIDOC
CODE:

```
Webhooks
https://platform.openai.com/docs/guides/webhooks
```

---

TITLE: Get Vector Stores Usage Example Request
DESCRIPTION: Example cURL command to fetch vector stores usage data, specifying a start time and a limit for the buckets.

SOURCE: <https://platform.openai.com/docs/api-reference/usage>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/vector_stores?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Response: Create Project
DESCRIPTION: Example JSON response after successfully creating a project.

SOURCE: <https://platform.openai.com/docs/api-reference/run-steps/step-object>

LANGUAGE: json
CODE:

```
{
"id": "proj_abc",
"object": "organization.project",
"name": "Project ABC",
"created_at": 1711471533,
"archived_at": null,
"status": "active"}
```

---

TITLE: Example Request: Get Audio Transcriptions Usage
DESCRIPTION: An example cURL command to fetch audio transcriptions usage data from the OpenAI API, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/webhook_events/eval/run/failed>

LANGUAGE: bash
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_transcriptions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Example (Python)
DESCRIPTION: Example Python code using the OpenAI SDK to list run steps.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/input_audio_buffer/speech_started>

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

---

TITLE: Get Vector Stores Usage Example Request
DESCRIPTION: Example cURL command to fetch vector store usage data for the organization, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/usage/audio_transcriptions_object>

LANGUAGE: shell
CODE:

```
curl "https://api.openai.com/v1/organization/usage/vector_stores?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Install OpenAI SDK (Python)
DESCRIPTION: Installs the official OpenAI SDK for Python using pip, the Python package installer.

SOURCE: <https://platform.openai.com/docs/libraries>

LANGUAGE: bash
CODE:

```
pip install openai
```

---

TITLE: OpenAI Prompting and Agents
DESCRIPTION: Information on prompting techniques, reasoning, and building agents, including voice agents and SDKs for agents.

SOURCE: <https://platform.openai.com/docs/quickstart_api-mode=responses>

LANGUAGE: APIDOC
CODE:

```
Prompting:
  (No specific URL provided in the text, but mentioned as a concept)

Reasoning:
  (No specific URL provided in the text, but mentioned as a concept)

Agents:
  (No specific URL provided in the text, but mentioned as a concept)

Building agents:
  https://platform.openai.com/docs/guides/agents

Voice agents:
  https://platform.openai.com/docs/guides/voice-agents
```

---

TITLE: Example Request: Get Moderations Usage
DESCRIPTION: An example cURL command to fetch moderation usage data from the OpenAI API, specifying a start time and a limit for the buckets.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/session>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/moderations?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Provides example requests for listing run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/certificates/activateProjectCertificates>

LANGUAGE: curl
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: Python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: Node.js
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: Example Request: Get Code Interpreter Sessions Usage
DESCRIPTION: Example cURL command to fetch code interpreter sessions usage, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/evals/get>

LANGUAGE: shell
CODE:

```
curl "https://api.openai.com/v1/organization/usage/code_interpreter_sessions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI API Request Example - Get Costs
DESCRIPTION: Provides an example of how to make a cURL request to the OpenAI API to retrieve organization costs, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/output_audio_buffer/started>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/costs?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Example (Node.js)
DESCRIPTION: Example Node.js code using the OpenAI SDK to list run steps.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/input_audio_buffer/speech_started>

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: Example Request: Get Moderations Usage
DESCRIPTION: Provides an example cURL command to request moderations usage data from the OpenAI API, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/evals/create>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/moderations?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Provides examples for listing run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/project-service-accounts/object>

LANGUAGE: bash
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Provides examples for listing run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/vector_stores_file_batches/createBatch>

LANGUAGE: bash
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: Example Request: Get Audio Transcriptions Usage
DESCRIPTION: An example cURL command to request audio transcription usage data from the OpenAI API, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/vector_stores_files/listFiles>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_transcriptions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Create OpenAI Batch - Examples
DESCRIPTION: Examples demonstrating how to create an OpenAI batch using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/run-steps/getRunStep>

LANGUAGE: cURL
CODE:

```
curl https://api.openai.com/v1/batches \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input_file_id": "file-abc123",
    "endpoint": "/v1/chat/completions",
    "completion_window": "24h"
  }'
```

LANGUAGE: Python
CODE:

```
from openai import OpenAI
client = OpenAI()
client.batches.create(
  input_file_id="file-abc123",
  endpoint="/v1/chat/completions",
  completion_window="24h")
```

LANGUAGE: Node.js
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const batch = await openai.batches.create({
input_file_id: "file-abc123",
endpoint: "/v1/chat/completions",
completion_window: "24h"
  });
console.log(batch);
}
main();
```

---

TITLE: Example Request: Get Code Interpreter Sessions
DESCRIPTION: Example cURL command to fetch code interpreter sessions usage, specifying a start time and a limit of 1 bucket.

SOURCE: <https://platform.openai.com/docs/api-reference/runs/object>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/code_interpreter_sessions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Create Project Example
DESCRIPTION: Example of how to create a new project using the OpenAI API with a curl command.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/input_audio_buffer/committed>

LANGUAGE: bash
CODE:

```
curl -X POST https://api.openai.com/v1/organization/projects \
  -H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
      "name": "Project ABC"
  }'
```

---

TITLE: Example Request: Get Audio Transcriptions Usage
DESCRIPTION: An example cURL command to fetch audio transcriptions usage data from the OpenAI API, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/session>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_transcriptions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Request: Get Audio Speeches Usage
DESCRIPTION: An example cURL command to request audio speeches usage data from the OpenAI API, specifying a start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/response/text>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_speeches?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/input_audio_buffer>

LANGUAGE: curl
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/computer-use>

LANGUAGE: curl
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: Python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: Node.js
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
async function main() {
  const runStep = await openai.beta.threads.runs.steps.list(
    "run_abc123",
    { thread_id: "thread_abc123" }
  );
  console.log(runStep);
}
main();
```

---

TITLE: OpenAI API Key and SDK Configuration
DESCRIPTION: Guides on how to configure your OpenAI API key and install official SDKs for various programming languages. This section also covers Azure OpenAI libraries and community-maintained libraries.

SOURCE: <https://platform.openai.com/docs/libraries>

LANGUAGE: APIDOC
CODE:

```
Configure an API key:
https://platform.openai.com/docs/libraries#create-and-export-an-api-key

Install an SDK:
https://platform.openai.com/docs/libraries#install-an-official-sdk

Azure libraries:
https://platform.openai.com/docs/libraries#azure-openai-libraries

Community libraries:
https://platform.openai.com/docs/libraries#community-libraries

Other OpenAI repositories:
https://platform.openai.com/docs/libraries#other-openai-repositories
```

---

TITLE: Example Request: Get Audio Speeches Usage
DESCRIPTION: An example cURL command to fetch audio speeches usage data from the OpenAI API, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/conversation/item/input_audio_transcription/completed>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_speeches?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/images_streaming/admin-api-keys>

LANGUAGE: bash
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: OpenAI Platform - Going Live
DESCRIPTION: Guidance on deploying OpenAI models into production, covering best practices, latency, cost, and accuracy optimization.

SOURCE: <https://platform.openai.com/docs/models/o3-pro>

LANGUAGE: APIDOC
CODE:

```
Going Live:
  - Production Best Practices: Recommendations for deploying models.
  - Latency Optimization: Strategies to reduce response times.
  - Cost Optimization: Managing costs associated with model usage.
  - Accuracy Optimization: Improving the precision of model outputs.
  - Safety: Ensuring responsible and safe deployment.
```

---

TITLE: Example Request: Get Audio Transcriptions Usage
DESCRIPTION: An example cURL command to fetch audio transcriptions usage data from the OpenAI API, specifying start time and limit.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_client_events/conversation/item/delete>

LANGUAGE: bash
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_transcriptions?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Example Request: Get Moderations Usage
DESCRIPTION: Provides an example cURL command to retrieve Moderations usage data from the OpenAI API, specifying start time and limit parameters.

SOURCE: <https://platform.openai.com/docs/api-reference/audio/create-transcription>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/moderations?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI Run and Scale Guides
DESCRIPTION: Documentation on managing and scaling applications on the OpenAI platform, covering conversation state, background mode, streaming, webhooks, and file inputs.

SOURCE: <https://platform.openai.com/docs/guides/realtime-conversations>

LANGUAGE: APIDOC
CODE:

```
Conversation State:
  https://platform.openai.com/docs/guides/conversation-state

Background Mode:
  https://platform.openai.com/docs/guides/background

Streaming Responses:
  https://platform.openai.com/docs/guides/streaming-responses

Webhooks:
  https://platform.openai.com/docs/guides/webhooks

File Inputs:
  https://platform.openai.com/docs/guides/pdf-files
```

---

TITLE: Example Request: Get Audio Speeches Usage
DESCRIPTION: An example cURL command to request audio speeches usage data from the OpenAI API, specifying a start time and a limit for the results.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/conversation/item/input_audio_transcription/failed>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_speeches?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: OpenAI Run and Scale Guides
DESCRIPTION: Guides on managing and scaling applications built with OpenAI, covering conversation state, background mode, streaming responses, and webhooks.

SOURCE: <https://platform.openai.com/docs/guides/priority-processing>

LANGUAGE: APIDOC
CODE:

```
Conversation state:
  https://platform.openai.com/docs/guides/conversation-state

Background mode:
  https://platform.openai.com/docs/guides/background

Streaming responses:
  https://platform.openai.com/docs/guides/streaming-responses

Webhooks:
  https://platform.openai.com/docs/guides/webhooks

File inputs (PDFs):
  https://platform.openai.com/docs/guides/pdf-files
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime-client-events/input_audio_buffer/append>

LANGUAGE: curl
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: javascript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```

---

TITLE: Example Request: Get Audio Speeches Usage
DESCRIPTION: An example cURL command to request audio speeches usage data from the OpenAI API, specifying a start time and a limit for the buckets.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime-server-events/response/audio/delta>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_speeches?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: Get Vector Stores Usage Request Example
DESCRIPTION: Example cURL command to fetch vector store usage data for a specific start time and limit, including authorization and content type headers.

SOURCE: <https://platform.openai.com/docs/api-reference/responses_streaming/response/incomplete>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/vector_stores?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples demonstrating how to list run steps using cURL, Python, and JavaScript.

SOURCE: <https://platform.openai.com/docs/api-reference/fine-tuning/resume>

LANGUAGE: cURL
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: Python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: JavaScript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
async function main() {
  const runStep = await openai.beta.threads.runs.steps.list(
    "run_abc123",
    { thread_id: "thread_abc123" }
  );
  console.log(runStep);
}
main();
```

---

TITLE: OpenAI API: Get Audio Speeches Usage Request Example
DESCRIPTION: Example cURL request to fetch audio speeches usage data from the OpenAI API, specifying a start time and a limit for the results.

SOURCE: <https://platform.openai.com/docs/api-reference/assistants>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/usage/audio_speeches?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and Node.js.

SOURCE: <https://platform.openai.com/docs/api-reference/assistants/createAssistant>

LANGUAGE: cURL
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: Python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: Node.js
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
async function main() {
  const runStep = await openai.beta.threads.runs.steps.list(
    "run_abc123",
    { thread_id: "thread_abc123" }
  );
  console.log(runStep);
}
main();
```

---

TITLE: Assistant Object Example
DESCRIPTION: Demonstrates the structure of an assistant object, including its ID, creation timestamp, name, model, instructions, tools, and configuration parameters like top_p and temperature.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_server_events/input_audio_buffer/speech_started>

LANGUAGE: json
CODE:

```
{
"id": "asst_abc123",
"object": "assistant",
"created_at": 1698984975,
"name": "Math Tutor",
"description": null,
"model": "gpt-4o",
"instructions": "You are a personal math tutor. When asked a question, write and run Python code to answer the question.",
"tools": [
    {
"type": "code_interpreter"
    }
  ],
"metadata": {},
"top_p": 1.0,
"temperature": 1.0,
"response_format": "auto"
}
```

---

TITLE: Example Request: Get Organization Costs
DESCRIPTION: Demonstrates how to fetch organization costs using a cURL command, specifying a start time and a limit for the results.

SOURCE: <https://platform.openai.com/docs/api-reference/responses_streaming/response/created>

LANGUAGE: curl
CODE:

```
curl "https://api.openai.com/v1/organization/costs?start_time=1730419200&limit=1" \
-H "Authorization: Bearer $OPENAI_ADMIN_KEY" \
-H "Content-Type: application/json"
```

---

TITLE: List Run Steps Examples
DESCRIPTION: Examples of how to list run steps using cURL, Python, and JavaScript.

SOURCE: <https://platform.openai.com/docs/api-reference/realtime_client_events/input_audio_buffer>

LANGUAGE: cURL
CODE:

```
curl https://api.openai.com/v1/threads/thread_abc123/runs/run_abc123/steps \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2"
```

LANGUAGE: Python
CODE:

```
from openai import OpenAI
client = OpenAI()
run_steps = client.beta.threads.runs.steps.list(
    thread_id="thread_abc123",
    run_id="run_abc123")
print(run_steps)
```

LANGUAGE: JavaScript
CODE:

```
import OpenAI from"openai";
const openai = new OpenAI();
asyncfunctionmain() {
const runStep = await openai.beta.threads.runs.steps.list(
"run_abc123",
    { thread_id: "thread_abc123" }
  );
console.log(runStep);
}
main();
```
