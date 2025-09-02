========================
CODE SNIPPETS
========================

TITLE: Install Grok CLI using npm
DESCRIPTION: Installs the Grok CLI globally on your system using npm. This command makes the 'grok' executable available in your terminal.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gork>

LANGUAGE: bash
CODE:

```
npm install -g @vibe-kit/grok-cli
```

----------------------------------------

TITLE: Launch Grok CLI with a Model
DESCRIPTION: Starts the Grok CLI interactive session, specifying the GLM model to use for conversations or code generation. Replace 'glm-4.5' with your desired model.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gork>

LANGUAGE: bash
CODE:

```
grok --model glm-4.5
```

----------------------------------------

TITLE: Install zai-sdk
DESCRIPTION: Instructions for installing the zai-sdk using pip. You can install the latest version or specify a particular version.

SOURCE: <https://docs.z.ai/guides/llm/glm-4>

LANGUAGE: shell
CODE:

```
# Install latest version
pip install zai-sdk
# Or specify version
pip install zai-sdk==0.0.1
```

----------------------------------------

TITLE: Configure Grok CLI Environment Variables
DESCRIPTION: Sets the necessary environment variables for Grok CLI to connect to Z.AI's API. GROK_BASE_URL specifies the API endpoint, and GROK_API_KEY provides authentication credentials.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gork>

LANGUAGE: bash
CODE:

```
export GROK_BASE_URL="https://api.z.ai/api/paas/v4"
export GROK_API_KEY="your_api_key"
```

----------------------------------------

TITLE: Image-to-Video Generation API Example
DESCRIPTION: Demonstrates how to generate videos from an input image and a text prompt using the Z.AI API. This example includes parameters for image URL, prompt, duration, and resolution.

SOURCE: <https://docs.z.ai/guides/video/vidu-q1>

LANGUAGE: Curl
CODE:

```
curl --location --request POST 'https://api.z.ai/api/paas/v4/videos/generations' \
--header 'Authorization: Bearer {your apikey}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model":"viduq1-image",
    "image_url":"https://example.com/path/to/your/image.jpg",
    "prompt":"Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration":5,
    "size":"1920x1080",
    "movement_amplitude":"auto"
}'
```

----------------------------------------

TITLE: Verify zai-sdk Installation
DESCRIPTION: Python code to verify the installed version of the zai-sdk. This helps confirm that the SDK was installed correctly.

SOURCE: <https://docs.z.ai/guides/llm/glm-4>

LANGUAGE: python
CODE:

```
import zai
print(zai.__version__)
```

----------------------------------------

TITLE: Install Gemini CLI Dependencies
DESCRIPTION: Installs the necessary Node.js dependencies for the Gemini CLI project using npm. Ensure Node.js version 18 or higher is installed prior to running this command.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gemini>

LANGUAGE: shell
CODE:

```
npm install
```

----------------------------------------

TITLE: Make Chat Completion API Call with cURL
DESCRIPTION: Demonstrates how to make a POST request to the Z.ai chat completions API endpoint using cURL. It includes setting headers for content type and authorization, and providing a JSON payload with model selection and message content.

SOURCE: <https://docs.z.ai/guides/overview/quick-start>

LANGUAGE: curl
CODE:

```
curl -X POST "https://api.z.ai/api/paas/v4/chat/completions" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_API_KEY" \
-d '{
    "model": "glm-4.5",
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful AI assistant."
        },
        {
            "role": "user",
            "content": "Hello, please introduce yourself."
        }
    ],
    "temperature": 0.7,
    "top_p": 0.8
}'
```

----------------------------------------

TITLE: Making a Chat Completion API Call with cURL
DESCRIPTION: This example demonstrates how to make a POST request to the Z.ai chat completions API. It requires an API key for authentication and specifies the model, messages, temperature, and top_p parameters for the AI interaction.

SOURCE: <https://docs.z.ai/api-reference/video/cogvideox-3%26vidu>

LANGUAGE: curl
CODE:

```
curl -X POST "https://api.z.ai/api/paas/v4/chat/completions" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_API_KEY" \
-d '{
    "model": "glm-4.5",
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful AI assistant."
        },
        {
            "role": "user",
            "content": "Hello, please introduce yourself."
        }
    ],
    "temperature": 0.7,
    "top_p": 0.8
}'
```

----------------------------------------

TITLE: Verify zai-sdk Installation
DESCRIPTION: Verifies the installation of the zai-sdk by importing the library and printing its version number.

SOURCE: <https://docs.z.ai/guides/video/cogvideox-3>

LANGUAGE: python
CODE:

```
import zai
print(zai.__version__)
```

----------------------------------------

TITLE: Text-to-Video Generation API Example
DESCRIPTION: Demonstrates how to generate videos from text prompts using the Z.AI API. This example shows the structure of a POST request including model, prompt, style, duration, and resolution parameters.

SOURCE: <https://docs.z.ai/guides/video/vidu-q1>

LANGUAGE: Curl
CODE:

```
curl --location --request POST 'https://api.z.ai/api/paas/v4/videos/generations' \
--header 'Authorization: Bearer {your apikey}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "viduq1-text",
    "style": "anime",
    "prompt": "Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration": 5,
    "aspect_ratio": "16:9",
    "size": "1920x1080",
    "movement_amplitude": "auto"
}'
```

----------------------------------------

TITLE: Install zai-sdk
DESCRIPTION: Installs the latest version of the zai-sdk using pip. Alternatively, a specific version can be installed.

SOURCE: <https://docs.z.ai/guides/video/cogvideox-3>

LANGUAGE: python
CODE:

```
# Install latest version
pip install zai-sdk
# Or specify version
pip install zai-sdk==0.0.1
```

----------------------------------------

TITLE: Clone and Navigate Gemini CLI Repository
DESCRIPTION: Clones the customized Gemini CLI repository from GitHub, which is necessary for OpenRouter compatibility. After cloning, it navigates into the cloned directory to prepare for further setup.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gemini>

LANGUAGE: shell
CODE:

```
git clone https://github.com/heartyguy/gemini-cli
cd gemini-cli
```

----------------------------------------

TITLE: Making a Chat Completion API Call with cURL
DESCRIPTION: This example demonstrates how to make a POST request to the Z.ai chat completions API. It requires an API key for authentication and specifies the model, messages, temperature, and top_p parameters for the AI interaction.

SOURCE: <https://docs.z.ai/api-reference/llm/glm-4-32b-0414-128k>

LANGUAGE: curl
CODE:

```
curl -X POST "https://api.z.ai/api/paas/v4/chat/completions" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_API_KEY" \
-d '{
    "model": "glm-4.5",
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful AI assistant."
        },
        {
            "role": "user",
            "content": "Hello, please introduce yourself."
        }
    ],
    "temperature": 0.7,
    "top_p": 0.8
}'
```

----------------------------------------

TITLE: MCP Server Configuration Example
DESCRIPTION: Example JSON configuration for setting up an MCP server, specifically for an SQLite backend, used with the Kilo Code plugin. This configuration defines the command and arguments to run the MCP server.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/kilo>

LANGUAGE: JSON
CODE:

```
{
    "mcpServers": {
        "SQLite": {
            "command": "uv",
            "args": [
                "--directory",
                "parent_of_servers_repo/servers/src/sqlite",
                "run",
                "mcp-server-sqlite",
                "--db-path",
                "~/test.db"
            ]
        }
    }
}
```

----------------------------------------

TITLE: Generate Video with Start/End Frames (Curl)
DESCRIPTION: Curl example for generating a video using specified start and end frames. This demonstrates how to provide multiple image URLs in the payload for frame-based video creation.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: Curl
CODE:

```
curl --location --request POST 'https://api.z.ai/api/paas/v4/videos/generations' \
--header 'Authorization: Bearer {your apikey}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model":"vidu2-start-end",
    "image_url":["https://example.com/path/to/your/image1.jpg","https://example.com/path/to/your/image2.jpg"],
    "prompt":"Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration":4,
    "size":"720x480",
    "movement_amplitude":"auto"
}'
```

----------------------------------------

TITLE: Install Zai SDK
DESCRIPTION: Instructions for installing the Zai SDK using pip. You can install the latest version or specify a particular version.

SOURCE: <https://docs.z.ai/guides/llm/glm-4-32b-0414-128k>

LANGUAGE: shell
CODE:

```
# Install latest version
pip install zai-sdk
# Or specify version
pip install zai-sdk==0.0.1
```

----------------------------------------

TITLE: Generate Video from Image (Python)
DESCRIPTION: Python example using the `requests` library to interact with the Z.ai video generation API. It shows how to construct the request payload and headers for creating a video from an image.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: Python
CODE:

```
import requests

url = "https://api.z.ai/api/paas/v4/videos/generations"
headers = {
    "Authorization": "Bearer {your apikey}",
    "Content-Type": "application/json"
}

payload = {
    "model": "vidu2-image",
    "image_url": "https://example.com/path/to/your/image.jpg",
    "prompt": "Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration": 4,
    "size": "720x480",
    "movement_amplitude": "auto"
}

response = requests.post(url, headers=headers, json=payload)

print(response.status_code)
print(response.json())
```

----------------------------------------

TITLE: Switch to OpenRouter Compatible Branch
DESCRIPTION: Checks out the specific branch within the Gemini CLI repository that provides support for OpenRouter, enabling compatibility with Z.AI's GLM models.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gemini>

LANGUAGE: shell
CODE:

```
git checkout feature/openrouter-support
```

----------------------------------------

TITLE: Verify Zai SDK Installation
DESCRIPTION: A simple Python script to verify that the Zai SDK has been installed correctly by printing its version number.

SOURCE: <https://docs.z.ai/guides/llm/glm-4-32b-0414-128k>

LANGUAGE: python
CODE:

```
import zai
print(zai.__version__)
```

----------------------------------------

TITLE: GLM-4.5 Chat Completion with Thinking Mode
DESCRIPTION: Python code demonstrating how to use the ZaiClient to create chat completions with the GLM-4.5 model. It shows how to enable 'Deep Thinking Mode' and stream responses, including example user and assistant messages.

SOURCE: <https://docs.z.ai/guides/llm/glm-4>

LANGUAGE: python
CODE:

```
from zai import ZaiClient
client = ZaiClient(api_key="your-api-key")  # Your API Key
response = client.chat.completions.create(
    model="glm-4.5",
    messages=[
        {"role": "user", "content": "As a marketing expert, please create an attractive slogan for my product."},
        {"role": "assistant", "content": "Sure, to craft a compelling slogan, please tell me more about your product."},
        {"role": "user", "content": "Z.AI Open Platform"}
    ],
    thinking={
        "type": "enabled",    # Optional: "disabled" or "enabled", default is "enabled"
    },
    stream=True,
    max_tokens=4096,
    temperature=0.7
)
for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end='')
```

----------------------------------------

TITLE: Zai Chat Completion Example
DESCRIPTION: Demonstrates how to initialize the ZaiClient with an API key and make a chat completion request to a specified model, such as GLM-4.5.

SOURCE: <https://docs.z.ai/guides/llm/glm-4-32b-0414-128k>

LANGUAGE: python
CODE:

```
from zai import ZaiClient
# Initialize the client
client = ZaiClient(api_key="your-api-key")
# Create a chat completion request
response = client.chat.completions.create(
    model="glm-4-32b-0414-128k",
    messages=[
        {"role": "user", "content": "As a marketing expert, please create an attractive slogan for my product."}
    ]
)
# Get the response
print(response.choices[0].message.content)
```

----------------------------------------

TITLE: Configure Environment Variables for Claude Code
DESCRIPTION: These commands set up the necessary environment variables for Claude Code to connect to Z.AI's API. Method 1 uses a script for automated setup, while Method 2 involves manual export commands for the API base URL and authentication token.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/claude>

LANGUAGE: shell
CODE:

```
curl -O "http://bigmodel-us3-prod-marketplace.cn-wlcb.ufileos.com/1753683755292-30b3431f487b4cc1863e57a81d78e289.sh?ufileattname=claude_code_prod_zai.sh"

```

LANGUAGE: shell
CODE:

```
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN={YOUR_API_KEY}

```

----------------------------------------

TITLE: Configure Z.AI API Key
DESCRIPTION: Sets the OPENROUTER_API_KEY environment variable with your personal API key. This key is required for authentication when accessing Z.AI's GLM models.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gemini>

LANGUAGE: shell
CODE:

```
export OPENROUTER_API_KEY="your_api_key"
```

----------------------------------------

TITLE: Generate Video with Start/End Frames (Python)
DESCRIPTION: Python script to generate a video using start and end frames via the Z.ai API. It illustrates passing an array of image URLs for the `image_url` parameter.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: Python
CODE:

```
import requests

url = "https://api.z.ai/api/paas/v4/videos/generations"
headers = {
    "Authorization": "Bearer {your apikey}",
    "Content-Type": "application/json"
}

payload = {
    "model": "vidu2-start-end",
    "image_url": [
        "https://example.com/path/to/your/image1.jpg",
        "https://example.com/path/to/your/image2.jpg"
    ],
    "prompt": "Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration": 4,
    "size": "720x480",
    "movement_amplitude": "auto"
}

response = requests.post(url, headers=headers, json=payload)

print(response.status_code)
print(response.json())
```

----------------------------------------

TITLE: Language API: Chat Completions
DESCRIPTION: Endpoint for interacting with the Language API to get chat completions. This is a POST request.

SOURCE: <https://docs.z.ai/api-reference/video/get-video-status>

LANGUAGE: APIDOC
CODE:

```
POST /chat-completion

Description:
  Endpoint for chat completions.

Method:
  POST

Example Link:
  https://docs.z.ai/api-reference/llm/chat-completion
```

----------------------------------------

TITLE: Generate Video from Image (Curl)
DESCRIPTION: Example using Curl to send a POST request to the Z.ai API for generating a video from a single image. This demonstrates the request structure, headers, and JSON payload for the image-to-video functionality.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: Curl
CODE:

```
curl --location --request POST 'https://api.z.ai/api/paas/v4/videos/generations' \
--header 'Authorization: Bearer {your apikey}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model":"vidu2-image",
    "image_url":"https://example.com/path/to/your/image.jpg",
    "prompt":"Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration":4,
    "size":"720x480",
    "movement_amplitude":"auto" 
}'
```

----------------------------------------

TITLE: Special Effects Video Templates
DESCRIPTION: Details of popular special effects video templates available, including their prompts and example inputs/outputs. These templates allow users to generate professional-grade special effects videos from a single image.

SOURCE: <https://docs.z.ai/guides/agents/video-template>

LANGUAGE: markdown
CODE:

```
Templates | Prompt | Example Input | Example Output  
---|---|---|---
french_kiss | The two figures in the painting gradually draw closer, then passionately kiss, alternating between deep and intense moments. |  |   
bodyshake | Video content: The character performs a rhythmic dance sequence in an indoor setting. She first sways her hips, then turns to the other side, briefly shaking her hips in a playful manner. Her movements are fluid and confident, consistently emphasizing body rhythm and expressiveness. Requirements: Movement Level: High |  |   
sexy_me | The woman’s attire undergoes a seamless transformation, her original clothing smoothly transitioning into a fashionable bikini. In the final moment, she confidently places her hands on her hips, exuding elegance and poise. |  |   
```

----------------------------------------

TITLE: Configure Z.AI API Base URL
DESCRIPTION: Sets the OPENROUTER_BASE_URL environment variable to point to Z.AI's API endpoint. This is crucial for the CLI to communicate with Z.AI's services.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/gemini>

LANGUAGE: shell
CODE:

```
export OPENROUTER_BASE_URL="https://api.z.ai/api/paas/v4"
```

----------------------------------------

TITLE: Chat Completions API - cURL Request
DESCRIPTION: Example cURL command to make a POST request to the Chat Completions API. It demonstrates setting headers for authorization and content type, and includes a JSON payload with the model and user messages.

SOURCE: <https://docs.z.ai/api-reference>

LANGUAGE: cURL
CODE:

```
curl --request POST \
  --url https://api.z.ai/api/paas/v4/chat/completions \
  --header 'Accept-Language: <accept-language>' \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{ \
  "model": "glm-4.5", \
  "messages": [ \
    { \
      "role": "user", \
      "content": "What opportunities and challenges will the Chinese large model industry face in 2025?" \
    } \
  ]' \

```

----------------------------------------

TITLE: Video Generation API: Retrieve Video Status
DESCRIPTION: This entry details the GET request to retrieve the status of a generated video. It is part of the Video Generation API offering.

SOURCE: <https://docs.z.ai/api-reference/agents/agent>

LANGUAGE: APIDOC
CODE:

```
GET /api/reference/video/get-video-status

Description:
  Retrieves the status of a video generation process.
```

----------------------------------------

TITLE: Z.ai Video Generation API Endpoint
DESCRIPTION: This entry details the POST request to the Z.ai API for video generation. It specifies the endpoint, required headers, and a sample JSON payload. The payload includes parameters for model selection, image URLs, descriptive prompts, video duration, resolution, and movement amplitude, enabling the creation of videos with specific start and end frame characteristics.

SOURCE: <https://docs.z.ai/guides/video/vidu-q1>

LANGUAGE: APIDOC
CODE:

```
POST /api/paas/v4/videos/generations

Description:
  Initiates a video generation process using specified parameters.

Headers:
  Authorization: Bearer {your apikey} (Required)
  Content-Type: application/json (Required)

Request Body:
  {
    "model": "string",          // Specifies the video generation model (e.g., "viduq1-start-end")
    "image_url": ["string"],    // Array of URLs pointing to input images
    "prompt": "string",         // Text description for the video content
    "duration": integer,          // Desired video duration in seconds
    "size": "string",           // Video resolution (e.g., "1920x1080")
    "movement_amplitude": "string" // Controls the intensity of movement (e.g., "auto")
  }

Example Usage (curl):
  curl --location --request POST 'https://api.z.ai/api/paas/v4/videos/generations' \
  --header 'Authorization: Bearer {your apikey}' \
  --header 'Content-Type: application/json' \
  --data-raw '{ 
      "model":"viduq1-start-end",
      "image_url":["https://example.com/path/to/your/image.jpg","https://example.com/path/to/your/image1.jpg"],
      "prompt":"Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
      "duration":5,
      "size":"1920x1080",
      "movement_amplitude":"auto"
  }'

Notes:
  - Ensure your API key is valid and correctly formatted in the Authorization header.
  - The 'model' parameter should correspond to available video generation models.
  - Image URLs must be publicly accessible.
```

----------------------------------------

TITLE: Chat Completions API - Response Structure
DESCRIPTION: Example JSON structure for a successful response from the Chat Completions API. It includes fields for message ID, request ID, creation timestamp, model details, choices, usage statistics, and web search results.

SOURCE: <https://docs.z.ai/api-reference>

LANGUAGE: json
CODE:

```
{ \
  "id": "<string>", \
  "request_id": "<string>", \
  "created": 123, \
  "model": "<string>", \
  "choices": [ \
    { \
      "index": 123, \
      "message": { \
        "role": "assistant", \
        "content": "<string>", \
        "tool_calls": [ \
          { \
            "function": { \
              "name": "<string>", \
              "arguments": {} \
            }, \
            "id": "<string>", \
            "type": "<string>" \
          } \
        ] \
      }, \
      "finish_reason": "<string>" \
    } \
  ], \
  "usage": { \
    "prompt_tokens": 123, \
    "completion_tokens": 123, \
    "total_tokens": 123, \
    "total_calls": 123 \
  }, \
  "web_search": [ \
    { \
      "title": "<string>", \
      "content": "<string>", \
      "link": "<string>", \
      "media": "<string>", \
      "icon": "<string>", \
      "refer": "<string>", \
      "publish_date": "<string>" \
    } \
  ] \
}
```

----------------------------------------

TITLE: GLM-4.5 Web Development Capabilities
DESCRIPTION: Details the coding skills of GLM-4.5 for web development tasks, including intelligent code generation, real-time code completion, and automated bug fixing. It supports major programming languages and focuses on generating high-quality, scalable code based on natural language instructions.

SOURCE: <https://docs.z.ai/guides/llm/glm-4>

LANGUAGE: APIDOC
CODE:

```
GLM-4.5_WebDevelopment:
  CoreCapability: Coding Skills
  Features:
    - Intelligent code generation
    - Real-time code completion
    - Automated bug fixing
  SupportedLanguages:
    - Python
    - JavaScript
    - Java
  Description: Generates well-structured, scalable, high-quality code based on natural language instructions, focusing on real-world development needs.
  UseCases:
    - Complete refactoring-level tasks within 1 hour
    - Generate full product prototypes in 5 minutes
```

----------------------------------------

TITLE: GLM-4.5 Execution Modes
DESCRIPTION: Details the execution modes for GLM-4.5 and GLM-4.5-Air models, including Thinking Mode and Non-Thinking Mode. These modes are controlled via the `thinking.type` parameter, which accepts 'enabled' or 'disabled' settings. Dynamic thinking is enabled by default for complex reasoning and tool usage.

SOURCE: <https://docs.z.ai/guides/llm/glm-4>

LANGUAGE: APIDOC
CODE:

```
GLM-4.5 Execution Modes:

- **Thinking Mode**:
  - Description: Optimized for complex reasoning, tool usage, and advanced analysis.
  - Control: Enabled via `thinking.type=enabled`.

- **Non-Thinking Mode**:
  - Description: Provides instant responses, suitable for simpler queries.
  - Control: Enabled via `thinking.type=disabled`.

- **Dynamic Thinking**:
  - Description: Automatically switches between modes based on query complexity.
  - Default: Enabled by default.

- **Parameter**: `thinking.type`
  - Description: Controls the execution mode of the model.
  - Allowed Values: `enabled`, `disabled`
  - Example Usage:
    - `thinking.type: enabled`
    - `thinking.type: disabled`

- **Related Capabilities**:
  - Deep Thinking: Enhances reasoning and analysis capabilities.
  - Streaming Output: Supports real-time responses for improved user interaction.
```

----------------------------------------

TITLE: Generate and Retrieve Video with ZaiClient
DESCRIPTION: Demonstrates how to use the ZaiClient to generate videos using the cogvideox-3 model. It includes parameters for model, prompt, quality, audio inclusion, resolution, and frame rate. It also shows how to retrieve the video generation results using the response ID.

SOURCE: <https://docs.z.ai/guides/video/cogvideox-3>

LANGUAGE: python
CODE:

```
from zai import ZaiClient
client = ZaiClient(api_key="your-api-key")
# Generate video
response = client.videos.generations(
    model="cogvideox-3",
    prompt="A cat is playing with a ball.",
    quality="quality",  # Output mode, "quality" for quality priority, "speed" for speed priority
    with_audio=True, # Whether to include audio
    size="1920x1080",  # Video resolution, supports up to 4K (e.g., "3840x2160")
    fps=30,  # Frame rate, can be 30 or 60
)
print(response)
# Get video result
result = client.videos.retrieve_videos_result(id=response.id)
print(result)
```

----------------------------------------

TITLE: Z.AI Video Generation Models & API
DESCRIPTION: Details Z.AI's video generation models, their capabilities, and pricing. It references the video generation API.

SOURCE: <https://docs.z.ai/guides/overview/pricing>

LANGUAGE: APIDOC
CODE:

```
Z.AI Video Generation Models:

Model | Type | Strength | Language | Context/Resolution | API Reference
---|---|---|---|---|---
CogVideoX-3 | Video Generation Model | Significant improvements in image quality, stability, and physical realism simulation | English & Chinese | multiple resolutions | /api-reference/video/cogvideox-3&vidu
ViduQ1 | Video Generation Model | Theatrical quality with seamless temporal flow | English & Chinese | 1080p | /api-reference/video/cogvideox-3&vidu
Vidu2 | Video Generation Model | Fast delivery with smart style preservation | English & Chinese | 720p | /api-reference/video/cogvideox-3&vidu

Video Generation Pricing:

Model/Tool | API Name | Price
---|---|---
CogVideoX-3 | cogvideox-3 | $0.2 / video
ViduQ1-Text | viduq1-text | $0.4 / video
ViduQ1-Image | viduq1-image | $0.4 / video
ViduQ1-Start-End | viduq1-start-end | $0.4 / video
Vidu2-Image | vidu2-image | $0.2 / video
Vidu2-Start-End | vidu2-start-end | $0.2 / video
Vidu2-Reference | vidu2-reference | $0.4 / video

API Reference: https://docs.z.ai/api-reference/video/cogvideox-3&vidu
```

----------------------------------------

TITLE: Z.AI Agents & Pricing
DESCRIPTION: Details Z.AI's agents and their associated pricing structures.

SOURCE: <https://docs.z.ai/guides/overview/pricing>

LANGUAGE: APIDOC
CODE:

```
Z.AI Agents & Pricing:

Agent name | Price
---|---
General-Purpose Translation | $3 / MTok
Popular Special Effects Video Templates | $0.2 / video
```

----------------------------------------

TITLE: Vidu Q1 Model Capabilities and Specifications
DESCRIPTION: Details the Vidu Q1 model's capabilities, including text-to-video and image-to-video generation. It outlines different model versions, their specific functions, output duration, resolution, and pricing. Also includes notes on generated video URL validity.

SOURCE: <https://docs.z.ai/guides/video/vidu-q1>

LANGUAGE: markdown
CODE:

```
## Vidu Q1

Vidu Q1 is the next-generation video generation model from Vidu, designed for high-quality video creation. It consistently outputs 5-second, 24-frame, 1080P video clips. Through advanced optimization of visual clarity, Vidu Q1 delivers significantly enhanced image quality with notable improvements in issues such as hand distortion and frame jitter. The model achieves photorealistic rendering that closely resembles real-world scenes, while maintaining stylistic accuracy in 2D animation. Transitions between the first and last frames are exceptionally smooth, making Vidu Q1 well-suited for demanding creative applications in film, advertising, and animated short productions.

**Model Version** | **Capabilities** | **Duration** | **Resolution** | **Price**  
---|---|---|---|---
viduq1-image | Image-to-Video Generation | 5s | 1080p | $0.4 / video  
viduq1-start-end | Start and End Frame | 5s | 1080p | $0.4 / video  
viduq1-text | Text-to-Video Generation | 5s | 1080p | $0.4 / video  

**Capability Description**
  * **Image-to-Video Generation**: Generate a video by providing a starting frame or both starting and ending frames along with corresponding text descriptions.
  * **Start and End Frame**: Supports input of two images: the first uploaded image is treated as the starting frame, and the second as the ending frame. The model uses these images as input parameters to generate the video.
  * **Text-to-Video Generation**: Generate a video from a text prompt; currently supports both a general style and an anime style optimized for animation.

Note: The URL link for the video generated by the model is valid for one day. Please save it as soon as possible if needed.
```

----------------------------------------

TITLE: Generate Reference-Based Video (Python)
DESCRIPTION: Python script demonstrating reference-based video generation with the Z.ai API. It includes parameters for aspect ratio and audio, using a list of image URLs as input.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: Python
CODE:

```
import requests

url = "https://api.z.ai/api/paas/v4/videos/generations"
headers = {
    "Authorization": "Bearer {your apikey}",
    "Content-Type": "application/json"
}

payload = {
    "model": "vidu2-reference",
    "image_url": [
        "https://example.com/path/to/your/image1.jpg",
        "https://example.com/path/to/your/image2.jpg",
        "https://example.com/path/to/your/image3.jpg"
    ],
    "prompt": "Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration": 4,
    "aspect_ratio": "16:9",
    "size": "720x480",
    "movement_amplitude": "auto",
    "with_audio": True
}

response = requests.post(url, headers=headers, json=payload)

print(response.status_code)
print(response.json())
```

----------------------------------------

TITLE: Z.AI Language Models & Chat Completion API
DESCRIPTION: Details Z.AI's suite of language models, their characteristics, and pricing. It also references the chat completion API for interacting with these models.

SOURCE: <https://docs.z.ai/guides/overview/pricing>

LANGUAGE: APIDOC
CODE:

```
Z.AI Language Models:

Model | Type | Strength | Language | Context/Resolution | API Reference
---|---|---|---|---|---
GLM-4.5 | Language Model | High Performance, Strong Reasoning, More Versatile | English & Chinese | 128K | /api-reference/llm/chat-completion
GLM-4.5-X | Language Model | High Performance, Strong Reasoning, Ultra-Fast Response | English & Chinese | 128K | /api-reference/llm/chat-completion
GLM-4.5-Air | Language Model | Cost-Effective, Lightweight, High Performance | English & Chinese | 128K | /api-reference/llm/chat-completion
GLM-4.5-AirX | Language Model | Lightweight, High Performance, Ultra-Fast Response | English & Chinese | 128K | /api-reference/llm/chat-completion
GLM-4.5-Flash | Language Model | Lightweight, High Performance | English & Chinese | 128K | /api-reference/llm/chat-completion
GLM-4-32B-0414-128K | Language Model | High intelligence at unmatched cost-efficiency | English & Chinese | 128K | /api-reference/llm/chat-completion

LLM Pricing:

Model/Tool | API Name | Input Price | Cached Input Price | Cached Input Storage Price | Output Price
---|---|---|---|---|---
GLM-4.5 | glm-4.5 | $0.6 / MTok | $0.11 / MTok | Limited-time Free | $2.2 / MTok
GLM-4.5-X | glm-4.5-x | $2.2 / MTok | $0.45 / MTok | Limited-time Free | $8.9 / MTok
GLM-4.5-Air | glm-4.5-air | $0.2 / MTok | $0.03 / MTok | Limited-time Free | $1.1 / MTok
GLM-4.5-AirX | glm-4.5-airx | $1.1 / MTok | $0.22 / MTok | Limited-time Free | $4.5 / MTok
GLM-4-Flash | glm-4.5-flash | Free | Free | Free | Free

Model/Tool | API Name | Price
---|---|---
GLM-4-32B-0414-128K | glm-4-32b-0414-128k | $0.1 / MTok

API Reference: https://docs.z.ai/api-reference/llm/chat-completion
```

----------------------------------------

TITLE: Vidu 2 Model Capabilities and Pricing
DESCRIPTION: Details the different versions of the Vidu 2 model, their primary capabilities, supported video duration and resolution, and associated pricing. This information is crucial for understanding the model's features and cost structure when integrating it into applications.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: APIDOC
CODE:

```
Vidu 2 Model Versions:

Model Version: "vidu2-image"
  Capabilities: Image-to-Video Generation
  Duration: Up to 4 seconds
  Resolution: 720p
  Price: $0.2 / video
  Description: Generates a video from a starting frame or both starting and ending frames along with corresponding text descriptions.

Model Version: "vidu2-start-end"
  Capabilities: Start and End Frame
  Duration: Up to 4 seconds
  Resolution: 720p
  Price: $0.2 / video
  Description: Supports input of two images (start and end frames) as parameters to generate the video.

Model Version: "vidu2-reference"
  Capabilities: Reference-based Video Generation
  Duration: Up to 4 seconds
  Resolution: 720p
  Price: $0.4 / video
  Description: Generates a video from a text prompt, supporting both general and anime styles optimized for animation.
```

----------------------------------------

TITLE: Vidu 2 API Documentation Link
DESCRIPTION: Provides a direct link to the official API documentation for Vidu 2 and related video generation models. This resource is essential for developers looking to integrate Vidu 2 capabilities into their projects.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: APIDOC
CODE:

```
API Documentation:
  URL: https://docs.z.ai/api-reference/video/cogvideox-3&vidu
  Description: Learn how to call the API for video generation models including Vidu 2.
```

----------------------------------------

TITLE: Agent API - Create Agent
DESCRIPTION: Documentation for creating and managing agents within the Z.AI platform. Agents are AI entities designed to perform specific tasks or interact with users.

SOURCE: <https://docs.z.ai/api-reference/video/generate-video>

LANGUAGE: APIDOC
CODE:

```
Agent API - Create Agent

POST /api/agents/agent

This endpoint facilitates the creation and management of AI agents. Agents can be configured with specific instructions, tools, and data sources to perform complex tasks.

Request:
  Method: POST
  URL: https://api.z.ai/api/agents/agent
  Headers:
    Authorization: string (required) - Bearer token for authentication.
    Content-Type: application/json (required)
  Body (application/json):
    name: string (required) - The name of the agent.
    instructions: string (required) - The primary instructions for the agent.
    model: string (required) - The AI model to power the agent.
    tools: array (optional) - A list of tools the agent can use (e.g., 'code_interpreter', 'retrieval').
    file_ids: array (optional) - IDs of files uploaded for the agent to access.

Response:
  Content-Type: application/json
  Body:
    id: string - Unique identifier for the created agent.
    object: string - Type of object ('agent').
    created_at: integer - Unix timestamp of agent creation.
    name: string - The name of the agent.
    instructions: string - The agent's instructions.
    model: string - The model used by the agent.
    tools: array - The tools available to the agent.
    file_ids: array - The files associated with the agent.

Related Endpoints:
  - POST /api/agents/file-upload (Upload files for agent processing)
  - POST /api/agents/get-async-result (Retrieve results from agent tasks)
```

----------------------------------------

TITLE: Chat Completions API Reference
DESCRIPTION: Reference for the Language API's Chat Completions endpoint. This section outlines how to interact with Z.AI's language models for conversational AI tasks.

SOURCE: <https://docs.z.ai/api-reference/video/generate-video>

LANGUAGE: APIDOC
CODE:

```
Language API - Chat Completions

POST /api/llm/chat-completion

This endpoint allows users to interact with Z.AI's language models to generate text-based responses, suitable for chatbots and other conversational applications.

Request:
  Method: POST
  URL: https://api.z.ai/api/llm/chat-completion
  Headers:
    Authorization: string (required) - Bearer token for authentication.
    Content-Type: application/json (required)
  Body (application/json):
    model: string (required) - The specific language model to use (e.g., 'claude-3-opus-20240229').
    messages: array (required) - An array of message objects representing the conversation history.
      - role: string (e.g., 'user', 'assistant', 'system')
      - content: string - The message content.
    temperature: number (optional, 0-2) - Controls randomness. Higher values mean more random output.
    max_tokens: integer (optional) - The maximum number of tokens to generate.

Response:
  Content-Type: application/json
  Body:
    id: string - Unique identifier for the response.
    model: string - The model that generated the response.
    choices: array - List of generated response choices.
      - message: object
        - role: string ('assistant')
        - content: string - The generated text.
    usage: object - Token usage statistics.
      - prompt_tokens: integer
      - completion_tokens: integer
      - total_tokens: integer

Related Endpoints:
  - API Reference for other Z.AI services.
```

----------------------------------------

TITLE: Z.AI Web Search Tool
DESCRIPTION: Details the pricing for the Z.AI Web Search tool.

SOURCE: <https://docs.z.ai/guides/overview/pricing>

LANGUAGE: APIDOC
CODE:

```
Z.AI Tools Pricing:

Model/Tool | API Name | Price
---|---|---
Web Search | search_pro_jina | $0.01 / use
```

----------------------------------------

TITLE: Z.AI LLM Chat Completion API
DESCRIPTION: Documentation for the Z.AI LLM Chat Completion API, detailing how to interact with the model for conversational AI tasks. This includes method signatures, parameter descriptions, and expected return values.

SOURCE: <https://docs.z.ai/scenario-example/develop-tools/roo>

LANGUAGE: APIDOC
CODE:

```
POST /api/paas/v4/chat/completions

Description:
  Initiates a chat completion request with the Z.AI GLM model.

Parameters:
  - Authorization: Bearer <YOUR_API_KEY> (Required)
    The API key for authentication.
  - Content-Type: application/json (Required)
    Specifies the request body format.
  - body: object (Required)
    The request payload containing chat messages and model parameters.
    - model: string (Required)
      The name of the model to use (e.g., "glm-4.5").
    - messages: array of objects (Required)
      A list of message objects representing the conversation history.
      Each message object should have:
        - role: string (Required)
          The role of the author ('system', 'user', or 'assistant').
        - content: string (Required)
          The content of the message.
    - stream: boolean (Optional)
      Whether to stream the response chunks.
    - temperature: number (Optional, 0-2)
      Controls randomness. Higher values make output more random.
    - max_tokens: integer (Optional)
      The maximum number of tokens to generate in the completion.

Returns:
  - object:
    - id: string
      Unique identifier for the completion.
    - choices: array of objects
      A list of completion choices.
      Each choice object contains:
        - message: object
          The generated message.
          - role: string
          - content: string
        - finish_reason: string
          The reason the model stopped generating tokens.
    - usage: object
      Token usage statistics.
      - prompt_tokens: integer
      - completion_tokens: integer
      - total_tokens: integer

Example:
  curl -X POST https://api.z.ai/api/paas/v4/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ 
    "model": "glm-4.5", 
    "messages": [{"role": "user", "content": "Hello!"}] 
  }'
```

----------------------------------------

TITLE: Generate Reference-Based Video (Curl)
DESCRIPTION: Curl command for reference-based video generation, allowing multiple input images and additional parameters like aspect ratio and audio. This showcases a more advanced video creation scenario.

SOURCE: <https://docs.z.ai/guides/video/vidu2>

LANGUAGE: Curl
CODE:

```
curl --location --request POST 'https://api.z.ai/api/paas/v4/videos/generations' \
--header 'Authorization: Bearer {your apikey}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model":"vidu2-reference",
    "image_url":["https://example.com/path/to/your/image1.jpg","https://example.com/path/to/your/image2.jpg","https://example.com/path/to/your/image3.jpg"],
    "prompt":"Peter Rabbit drives a small car along the road, his face filled with joy and happiness.",
    "duration":4,
    "aspect_ratio":"16:9",
    "size":"720x480",
    "movement_amplitude":"auto",
    "with_audio":true
}'
```

----------------------------------------

TITLE: Agent API: Create Agent
DESCRIPTION: Endpoint for creating or managing agents. This is a POST request.

SOURCE: <https://docs.z.ai/api-reference/video/get-video-status>

LANGUAGE: APIDOC
CODE:

```
POST /agent

Description:
  Endpoint for agent operations.

Method:
  POST

Example Link:
  https://docs.z.ai/api-reference/agents/agent
```

----------------------------------------

TITLE: CogVideoX-3 Model Specifications
DESCRIPTION: Provides key specifications for the CogVideoX-3 video generation model, including pricing, input modalities, and output modalities. This information is crucial for understanding the model's capabilities and integration requirements.

SOURCE: <https://docs.z.ai/guides/video/cogvideox-3>

LANGUAGE: APIDOC
CODE:

```
CogVideoX-3:
  Description: Features new frame generation capabilities that significantly improve image stability and clarity. Delivers superior performance in handling subjects with significant movement, better adheres to instructions, and provides more realistic simulations. Enhances the rendering of high-definition real-world and 3D-style scenes.
  Specifications:
    Price: $0.2 / video
    Input Modality: Image / Text / Start and End Frame
    Output Modality: Video
  Use Cases:
    - Advertising and Marketing: Generate dynamic ads in multiple styles, supporting scene transitions and realistic lighting rendering.
    - Short Video Creation: Convert single-frame images or text scripts into smooth, naturally animated short videos.
    - Tourism Promotion: Generate immersive tourism short videos with realistic natural landscapes.
    - Film and TV Production: Generate dynamic preview clips, simulating seamless camera movements and realistic physical interactions.
```

----------------------------------------

TITLE: Z.AI Video Generation API Endpoints
DESCRIPTION: This entry lists the available endpoints for the Z.AI Video Generation API. It includes methods for initiating video generation and retrieving the status of video processing.

SOURCE: <https://docs.z.ai/api-reference/llm/chat-completion>

LANGUAGE: APIDOC
CODE:

```
POST /api/video/generate-video
  Description: Initiates the generation of a video.

GET /api/video/get-video-status
  Description: Retrieves the status of a video generation or processing task.
```

----------------------------------------

TITLE: Agent API - File Upload
DESCRIPTION: Documentation for uploading files to the Agent API. This enables agents to process and reference external documents or data.

SOURCE: <https://docs.z.ai/api-reference/video/generate-video>

LANGUAGE: APIDOC
CODE:

```
Agent API - Upload File

POST /api/agents/file-upload

This endpoint is used to upload files that can be processed or referenced by Z.AI agents. It supports various file types relevant to agent operations.

Request:
  Method: POST
  URL: https://api.z.ai/api/agents/file-upload
  Headers:
    Authorization: string (required) - Bearer token for authentication.
    Content-Type: multipart/form-data (required)
  Body (multipart/form-data):
    file: file (required) - The file to upload.
    purpose: string (optional) - The intended use of the file (e.g., 'assistants', 'fine-tune').

Response:
  Content-Type: application/json
  Body:
    id: string - Unique identifier for the uploaded file.
    object: string - Type of object ('file').
    bytes: integer - Size of the file in bytes.
    created_at: integer - Unix timestamp of file creation.
    filename: string - The original name of the file.
    purpose: string - The purpose assigned to the file.

Related Endpoints:
  - POST /api/agents/agent (Create or manage agents)
  - POST /api/agents/get-async-result (Retrieve results from agent tasks)
```
