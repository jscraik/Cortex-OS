========================
CODE SNIPPETS
========================

TITLE: Third-Party Installation (Pinokio.computer)
DESCRIPTION: Information on installing Open WebUI via Pinokio.computer, directing users to the external website for installation and support.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_11>

LANGUAGE: markdown
CODE:

```
### Pinokio.computer Installation

For installation via Pinokio.computer, please visit their website:

[https://pinokio.computer/](https://pinokio.computer/)

Support for this installation method is provided through their website.
```

----------------------------------------

TITLE: Docker Installation Options
DESCRIPTION: Provides instructions for installing Open WebUI using various Docker-related methods. This includes manual Docker setup, Docker Compose, Podman, Podman Kube Play, and Docker Swarm.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
# Manual Docker Setup (Example - actual code would be in ManualDocker.md)
# docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway --name open-webui --restart always ghcr.io/open-webui/open-webui:main

```

LANGUAGE: yaml
CODE:

```
# Docker Compose Setup (Example - actual code would be in DockerCompose.md)
# version: '3.8'
# services:
#   web:
#     image: ghcr.io/open-webui/open-webui:main
#     container_name: open-webui
#     ports:
#       - "3000:8080"
#     volumes:
#       - open-webui-data:/app/backend/data
#     restart: always
# 
# volumes:
#   open-webui-data:

```

LANGUAGE: bash
CODE:

```
# Podman Setup (Example - actual code would be in Podman.md)
# podman run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway --name open-webui --restart always ghcr.io/open-webui/open-webui:main

```

LANGUAGE: yaml
CODE:

```
# Podman Kube Play Setup (Example - actual code would be in PodmanKubePlay.md)
# apiVersion: v1
# kind: Pod
# metadata:
#   name: open-webui
# spec:
#   containers:
#     - name: open-webui
#       image: ghcr.io/open-webui/open-webui:main
#       ports:
#         - containerPort: 8080

```

LANGUAGE: bash
CODE:

```
# Docker Swarm Setup (Example - actual code would be in DockerSwarm.md)
# docker service create --name open-webui -p 3000:8080 --constraint 'node.role==manager' ghcr.io/open-webui/open-webui:main

```

LANGUAGE: bash
CODE:

```
# Docker Updating (Example - actual code would be in DockerUpdating.md)
# docker compose pull && docker compose up -d

```

----------------------------------------

TITLE: Python Development Setup
DESCRIPTION: Information for developers looking to contribute to Open WebUI. It directs users to the 'Advanced Topics' section for detailed development setup guides.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_8>

LANGUAGE: markdown
CODE:

```
For developers who want to contribute, check the Development Guide in [Advanced Topics](/getting-started/advanced-topics).
```

----------------------------------------

TITLE: Third-Party Installation: Pinokio.computer
DESCRIPTION: Information on installing Open WebUI using the Pinokio.computer platform. It directs users to the Pinokio.computer website for detailed instructions and support.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_3>

LANGUAGE: markdown
CODE:

```
### Pinokio.computer Installation

For installation via Pinokio.computer, please visit their website:

[https://pinokio.computer/](https://pinokio.computer/)

Support for this installation method is provided through their website.
```

----------------------------------------

TITLE: Python Installation (uv)
DESCRIPTION: Instructions for installing Open WebUI using Python with 'uv', a fast Python package installer and virtual environment manager.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_5>

LANGUAGE: shell
CODE:

```
# Commands for setting up Python environment with uv.
# Example:
# uv venv
# source .venv/bin/activate
# pip install open-webui
# Refer to the imported Uv.md for specific commands.
```

----------------------------------------

TITLE: Kubernetes Installation (Kustomize)
DESCRIPTION: Instructions for deploying Open WebUI on Kubernetes using Kustomize, a tool that customizes plain Kubernetes objects.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_10>

LANGUAGE: yaml
CODE:

```
# Kustomize configuration files for Open WebUI.
# Refer to the imported Kustomize.md for specific Kustomize commands and file structures.
```

----------------------------------------

TITLE: Python Installation Options
DESCRIPTION: Details on installing Open WebUI using Python environments. This includes setup with uv, Conda, and venv, along with instructions for updating Python installations.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
# uv Installation (Example - actual code would be in Uv.md)
# pip install --upgrade uv
# uv venv
# source .venv/bin/activate
# pip install open-webui

```

LANGUAGE: bash
CODE:

```
# Conda Installation (Example - actual code would be in Conda.md)
# conda create -n open-webui python=3.11
# conda activate open-webui
# pip install open-webui

```

LANGUAGE: bash
CODE:

```
# Venv Installation (Example - actual code would be in Venv.md)
# python -m venv .venv
# source .venv/bin/activate
# pip install open-webui

```

LANGUAGE: bash
CODE:

```
# Python Updating (Example - actual code would be in PythonUpdating.md)
# pip install --upgrade open-webui

```

----------------------------------------

TITLE: Kubernetes Installation with Helm
DESCRIPTION: Instructions for deploying Open WebUI on Kubernetes using Helm. This section covers the Helm chart installation process.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_2>

LANGUAGE: bash
CODE:

```
# Helm Installation (Example - actual code would be in Helm.md)
# helm repo add open-webui https://open-webui.github.io/open-webui/
# helm repo update
# helm install open-webui open-webui/open-webui --namespace open-webui --create-namespace

```

----------------------------------------

TITLE: Python Installation (Venv)
DESCRIPTION: Instructions for installing Open WebUI using Python's built-in virtual environment manager, venv.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_7>

LANGUAGE: shell
CODE:

```
# Commands for setting up Python environment with venv.
# Example:
# python -m venv .venv
# source .venv/bin/activate
# pip install open-webui
# Refer to the imported Venv.md for specific commands.
```

----------------------------------------

TITLE: Kubernetes Installation (Helm)
DESCRIPTION: Instructions for deploying Open WebUI on Kubernetes using Helm, a package manager for Kubernetes that simplifies the deployment of applications.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_9>

LANGUAGE: yaml
CODE:

```
# Helm chart configuration for Open WebUI.
# Refer to the imported Helm.md for specific Helm commands and chart details.
```

----------------------------------------

TITLE: Python Installation (Conda)
DESCRIPTION: Instructions for installing Open WebUI using Python with Conda, a popular package and environment management system.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_6>

LANGUAGE: shell
CODE:

```
# Commands for setting up Python environment with Conda.
# Example:
# conda create -n open-webui python=3.10
# conda activate open-webui
# pip install open-webui
# Refer to the imported Conda.md for specific commands.
```

----------------------------------------

TITLE: Open WebUI Access
DESCRIPTION: Provides the default URLs to access the Open WebUI application after successful installation, depending on the deployment method.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_12>

LANGUAGE: markdown
CODE:

```
After installing, visit:

- [http://localhost:3000](http://localhost:3000) to access Open WebUI.
- or [http://localhost:8080/](http://localhost:8080/) when using a Python deployment.
```

----------------------------------------

TITLE: Docker Swarm Installation
DESCRIPTION: Instructions for deploying Open WebUI on Docker Swarm, a container orchestration tool for managing a cluster of Docker nodes.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_4>

LANGUAGE: shell
CODE:

```
# Docker Swarm deployment commands.
# Example: docker stack deploy -c docker-compose.yml open-webui
# Refer to the imported DockerSwarm.md for specific commands and compose file.
```

----------------------------------------

TITLE: Using Open WebUI with Ollama
DESCRIPTION: Guidance on integrating Open WebUI with Ollama, directing users to a specific guide for managing Ollama instances.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/index.mdx#_snippet_13>

LANGUAGE: markdown
CODE:

```
If you're using Open WebUI with Ollama, be sure to check out our [Starting with Ollama Guide](/getting-started/quick-start/starting-with-ollama) to learn how to manage your Ollama instances with Open WebUI.
```

----------------------------------------

TITLE: Install Frontend Dependencies
DESCRIPTION: Installs the necessary JavaScript packages for the frontend using npm. It may require `--force` for compatibility in some setups.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npm install
# or for compatibility issues:
npm install --force
```

----------------------------------------

TITLE: OpenAIModel Configuration Example
DESCRIPTION: Demonstrates how to configure an OpenAI compatible model within the Open WebUI system, including essential parameters like model name and provider.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/starting-with-functions.mdx#_snippet_0>

LANGUAGE: APIDOC
CODE:

```
OpenAIModel:
  __init__(model_name: str, provider: str = 'openai')
    model_name: The name of the OpenAI model to use
    provider: The provider to use (defaults to 'openai')
```

----------------------------------------

TITLE: Install Backend Dependencies
DESCRIPTION: Installs all necessary Python packages listed in the requirements.txt file using pip. The -U flag ensures the latest compatible versions are installed.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_6>

LANGUAGE: bash
CODE:

```
pip install -r requirements.txt -U
```

----------------------------------------

TITLE: Start Ollama Serve with IPEX-LLM
DESCRIPTION: This command starts the Ollama server, which is accelerated by IPEX-LLM for Intel GPUs. Ensure IPEX-LLM is correctly installed and configured before running this command. The server will listen for LLM requests.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/integrations/ipex_llm.md#_snippet_1>

LANGUAGE: bash
CODE:

```
ollama serve
```

----------------------------------------

TITLE: Start Podman Kube Play
DESCRIPTION: This command initiates the deployment of the Podman pod defined in the specified YAML file. Ensure the YAML file is correctly formatted and accessible in the current directory.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/PodmanKubePlay.md#_snippet_1>

LANGUAGE: bash
CODE:

```
podman kube play ./play.yaml
```

----------------------------------------

TITLE: Start Backend Development Server
DESCRIPTION: Executes the dev.sh script to start the backend development server. This script contains the necessary commands to run the server locally.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_7>

LANGUAGE: bash
CODE:

```
sh dev.sh
```

----------------------------------------

TITLE: Start Open WebUI Server
DESCRIPTION: Starts the Open WebUI server application. This command assumes the virtual environment is activated and Open WebUI is installed.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-python/Venv.md#_snippet_4>

LANGUAGE: bash
CODE:

```
open-webui serve
```

----------------------------------------

TITLE: Start Open WebUI Server
DESCRIPTION: Starts the Open WebUI server process. This command makes the application accessible via your web browser.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-python/Conda.md#_snippet_3>

LANGUAGE: bash
CODE:

```
open-webui serve
```

----------------------------------------

TITLE: Start Open WebUI with pip
DESCRIPTION: Starts the Open WebUI server after installation via pip. This command assumes Open WebUI has been successfully installed.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/intro.mdx#_snippet_10>

LANGUAGE: shell
CODE:

```
open-webui serve
```

----------------------------------------

TITLE: Install Dependencies and Run Filesystem Server
DESCRIPTION: Navigates to the filesystem server directory, installs its Python dependencies using pip, and starts the server using uvicorn. The server will be accessible at <http://localhost:8000>.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/openapi-servers/index.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
# Example: Installing dependencies for a specific server 'filesystem'
cd servers/filesystem
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --reload
```

----------------------------------------

TITLE: Start Frontend Development Server
DESCRIPTION: Launches the frontend development server, making the user interface accessible via a local URL. This process should be kept running during development.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_3>

LANGUAGE: bash
CODE:

```
npm run dev
```

----------------------------------------

TITLE: Start Time Tool Server Locally
DESCRIPTION: Clones the openapi-servers repository, navigates to the time server directory, installs dependencies, and starts the server using uvicorn. This hosts a local OpenAPI server at <http://localhost:8000>.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/openapi-servers/open-webui.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
git clone https://github.com/open-webui/openapi-servers
cd openapi-servers

# Navigate to the time server
cd servers/time

# Install required dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --reload
```

----------------------------------------

TITLE: React Component Import and Usage
DESCRIPTION: Demonstrates importing and using the TopBanners React component. This is typically used in a frontend application to display banners or important announcements.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/index.md#_snippet_0>

LANGUAGE: javascript
CODE:

```
import { TopBanners } from "@site/src/components/TopBanners";

<TopBanners />
```

----------------------------------------

TITLE: Set up and Run openai-edge-tts with Python
DESCRIPTION: Provides a comprehensive guide to running the `openai-edge-tts` service using Python. It includes cloning the repository, setting up a virtual environment, installing dependencies, configuring environment variables via a .env file, and starting the server.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/text-to-speech/openai-edge-tts-integration.md#_snippet_1>

LANGUAGE: bash
CODE:

```
git clone https://github.com/travisvn/openai-edge-tts.git
cd openai-edge-tts
```

LANGUAGE: bash
CODE:

```
# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
venv\Scripts\activate
```

LANGUAGE: bash
CODE:

```
pip install -r requirements.txt
```

LANGUAGE: plaintext
CODE:

```
API_KEY=your_api_key_here
PORT=5050

DEFAULT_VOICE=en-US-AvaNeural
DEFAULT_RESPONSE_FORMAT=mp3
DEFAULT_SPEED=1.0

DEFAULT_LANGUAGE=en-US

REQUIRE_API_KEY=True
REMOVE_FILTER=False
EXPAND_API=True
```

LANGUAGE: bash
CODE:

```
python app/server.py
```

----------------------------------------

TITLE: Install Open WebUI Chart
DESCRIPTION: Installs the Open WebUI application onto your Kubernetes cluster using the previously added Helm chart. This command deploys the necessary resources for Open WebUI.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-kubernetes/Helm.md#_snippet_1>

LANGUAGE: bash
CODE:

```
helm install openwebui open-webui/open-webui
```

----------------------------------------

TITLE: Start and Stop SearXNG for Initial Setup
DESCRIPTION: Temporarily starts the SearXNG Docker container to generate necessary files like uwsgi.ini and settings.yml, then stops it. The 'sleep 10' command allows sufficient time for file generation.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/web-search/searxng.md#_snippet_7>

LANGUAGE: bash
CODE:

```
docker compose up -d ; sleep 10 ; docker compose down
```

----------------------------------------

TITLE: Download Model with Hugging Face Hub
DESCRIPTION: Downloads a specific quantized model variant (1.58-bit) from Hugging Face using the `huggingface_hub` library. Requires `huggingface_hub` and `hf_transfer` to be installed. The `allow_patterns` parameter filters for the desired model files.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/starting-with-llama-cpp.mdx#_snippet_0>

LANGUAGE: python
CODE:

```
# pip install huggingface_hub hf_transfer

from huggingface_hub import snapshot_download

snapshot_download(
    repo_id = "unsloth/DeepSeek-R1-GGUF",
    local_dir = "DeepSeek-R1-GGUF",
    allow_patterns = ["*UD-IQ1_S*"]  # Download only 1.58-bit variant
)
```

----------------------------------------

TITLE: Run Let's Encrypt Script
DESCRIPTION: Executes the previously prepared `enable_letsencrypt.sh` script to obtain and install the SSL certificate for the specified domain.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tab-nginx/LetsEncrypt.md#_snippet_6>

LANGUAGE: bash
CODE:

```
./enable_letsencrypt.sh
```

----------------------------------------

TITLE: Configure Frontend Environment Variables
DESCRIPTION: Copies the example environment file to `.env` for frontend configuration. This file is used to set environment variables for the frontend application.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_1>

LANGUAGE: bash
CODE:

```
cp -RPp .env.example .env
```

----------------------------------------

TITLE: Verifying Development Server Commands
DESCRIPTION: This snippet shows the typical commands used to start the Open WebUI development servers. Ensuring these are running and in watch mode is crucial for hot reload functionality.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_16>

LANGUAGE: bash
CODE:

```
npm run dev
sh dev.sh
```

----------------------------------------

TITLE: Example Pipeline Scaffold
DESCRIPTION: Provides a practical scaffold pipeline to help developers get started with creating their own custom pipelines. It serves as a template for new pipeline development.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/features/index.mdx#_snippet_10>

LANGUAGE: Python
CODE:

```
# Code for example_pipeline_scaffold.py
# This is a scaffold or template for creating new pipelines.
# It includes basic structure and common patterns for pipeline development.
# See: https://github.com/open-webui/pipelines/blob/main/examples/scaffolds/example_pipeline_scaffold.py
```

----------------------------------------

TITLE: Serve Model with Llama.cpp Server
DESCRIPTION: Starts the Llama.cpp server to serve a downloaded GGUF model. Requires the `llama-server` binary. Key parameters include the model path, the port to expose the API on, the context size, and the number of layers to offload to the GPU for performance.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/starting-with-llama-cpp.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
./llama-server \
  --model /your/full/path/to/DeepSeek-R1-UD-IQ1_S-00001-of-00003.gguf \
  --port 10000 \
  --ctx-size 1024 \
  --n-gpu-layers 40
```

----------------------------------------

TITLE: Starting Open WebUI Server
DESCRIPTION: This command initiates the Open WebUI server after it has been installed via `pip`. The server will typically be accessible at `http://localhost:8080`.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/intro.mdx#_snippet_12>

LANGUAGE: bash
CODE:

```
open-webui serve
```

----------------------------------------

TITLE: Start Nginx Docker Service
DESCRIPTION: Starts the Nginx service defined in the Docker Compose file in detached mode.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tab-nginx/LetsEncrypt.md#_snippet_5>

LANGUAGE: bash
CODE:

```
docker compose up -d nginx
```

----------------------------------------

TITLE: Local Development Setup
DESCRIPTION: Instructions for setting up Open WebUI for local development, involving starting the API and then running the frontend development server using npm.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/text-to-speech/chatterbox-tts-api-integration.md#_snippet_5>

LANGUAGE: bash
CODE:

```
# Start the API first (follow earlier instructions)
# Then run the frontend:
cd frontend && npm install && npm run dev
```

----------------------------------------

TITLE: Install uv Runtime Manager
DESCRIPTION: Installs the uv runtime manager using platform-specific commands. This is the first step to manage Python environments for Open WebUI, ensuring a seamless setup.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-python/Uv.md#_snippet_0>

LANGUAGE: bash
CODE:

```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

LANGUAGE: powershell
CODE:

```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

----------------------------------------

TITLE: Backend Terminal Navigation and Environment Setup
DESCRIPTION: Commands to navigate to the backend directory and set up a Conda environment for Python 3.11. This ensures a clean and isolated environment for backend dependencies.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_5>

LANGUAGE: bash
CODE:

```
cd backend
conda create --name open-webui python=3.11
conda activate open-webui
```

----------------------------------------

TITLE: Example RAG Queries
DESCRIPTION: Demonstrates example user queries and expected system responses when using the Open WebUI documentation as a RAG knowledge base. These examples show how the system retrieves relevant information from the documentation to answer user questions.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tips/rag-tutorial.md#_snippet_0>

LANGUAGE: text
CODE:

```
User: "How do I configure environment variables?"
System: "Refer to Section 3.2: Use the `.env` file to manage configurations."
```

LANGUAGE: text
CODE:

```
User: "How do I update Open WebUI using Docker?"
System: "Refer to `docker/updating.md`: Use `docker pull` and restart the container."
```

----------------------------------------

TITLE: Start Pipelines Server
DESCRIPTION: Executes the start script to launch the Pipelines server after manual installation. This makes the Pipelines service available for connection from the Open WebUI client.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/pipelines/index.mdx#_snippet_9>

LANGUAGE: sh
CODE:

```
sh ./start.sh
```

----------------------------------------

TITLE: Start Nginx Service
DESCRIPTION: Command to start the Nginx service using Docker Compose after the configuration and integration steps are completed.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tab-nginx/SelfSigned.md#_snippet_2>

LANGUAGE: bash
CODE:

```
docker compose up -d nginx
```

----------------------------------------

TITLE: Create Docker Data Directories
DESCRIPTION: Creates the necessary directories on the host machine to store persistent data for OpenWebUI, ChromaDB, and Ollama services when using Docker Swarm.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/DockerSwarm.md#_snippet_0>

LANGUAGE: bash
CODE:

```
mkdir -p data/open-webui data/chromadb data/ollama
```

----------------------------------------

TITLE: Install Chatterbox TTS with Python and uv
DESCRIPTION: This snippet details the recommended method for installing the Chatterbox TTS API using uv, a fast Python package installer. It covers cloning the repository, installing dependencies, and starting the API server.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/text-to-speech/chatterbox-tts-api-integration.md#_snippet_0>

LANGUAGE: bash
CODE:

```
# Clone the repository
git clone https://github.com/travisvn/chatterbox-tts-api
cd chatterbox-tts-api

# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies with uv (automatically creates venv)
uv sync

# Copy and customize environment variables
cp .env.example .env

# Start the API with FastAPI
uv run uvicorn app.main:app --host 0.0.0.0 --port 4123
# Or use the main script
uv run main.py
```

----------------------------------------

TITLE: Verify Docker Installation on Ubuntu (Bash)
DESCRIPTION: Runs a simple 'hello-world' container to confirm that Docker is installed and running correctly. This is a standard verification step to ensure the Docker daemon is functioning as expected.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/docker-install.md#_snippet_2>

LANGUAGE: bash
CODE:

```
sudo docker run hello-world
```

----------------------------------------

TITLE: Verify Installation
DESCRIPTION: Checks the status of all pods running in the Kubernetes cluster. This command is used to confirm that the Open WebUI pods have been successfully created and are running.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-kubernetes/Helm.md#_snippet_2>

LANGUAGE: kubectl
CODE:

```
kubectl get pods
```

----------------------------------------

TITLE: Run Open WebUI with uvx
DESCRIPTION: Starts the Open WebUI application using the uvx command. It's crucial to set the DATA_DIR environment variable to preserve data across sessions. This command requires uv to be installed.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-python/Uv.md#_snippet_1>

LANGUAGE: bash
CODE:

```
DATA_DIR=~/.open-webui uvx --python 3.11 open-webui@latest serve
```

LANGUAGE: powershell
CODE:

```
$env:DATA_DIR="C:\\open-webui\\data"; uvx --python 3.11 open-webui@latest serve
```

----------------------------------------

TITLE: Start Docker Compose Services
DESCRIPTION: Command to start the Docker Compose services defined in your `docker-compose.yml` file. The `-d` flag runs the containers in detached mode (in the background).

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/DockerCompose.md#_snippet_1>

LANGUAGE: bash
CODE:

```
docker compose up -d

```

----------------------------------------

TITLE: Manual Update: Start Container
DESCRIPTION: Start a new Open WebUI container using the pulled latest image. This command maps the necessary ports and mounts the persistent data volume.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/DockerUpdating.md#_snippet_3>

LANGUAGE: bash
CODE:

```
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:main
```

----------------------------------------

TITLE: Set up Docker apt repository on Ubuntu (Bash)
DESCRIPTION: Configures the Docker apt repository for Ubuntu, ensuring you can install the latest Docker versions. This involves updating package lists, installing necessary certificates and keys, and adding the Docker repository to your sources.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/docker-install.md#_snippet_0>

LANGUAGE: bash
CODE:

```
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

----------------------------------------

TITLE: OpenAI-Compatible Server Connection URLs
DESCRIPTION: This entry details common API endpoint URLs for connecting various OpenAI-compatible servers to Open WebUI. It includes specific examples for Ollama and Lemonade, and a general format for Dockerized Open WebUI connecting to a host machine.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/starting-with-openai-compatible.mdx#_snippet_0>

LANGUAGE: APIDOC
CODE:

```
OpenAICompatibleServer:
  URL:
    - "http://localhost:11434/v1" # Example for Ollama
    - "http://localhost:8000/api/v0" # Example for Lemonade
    - "http://host.docker.internal:<your-port>/v1" # For Dockerized Open WebUI connecting to host
  APIKey:
    - "Leave blank unless required."
```

----------------------------------------

TITLE: Docker Swarm Stack File with GPU Support
DESCRIPTION: Defines the Docker Swarm services for OpenWebUI, ChromaDB, and Ollama, configured for GPU acceleration. It includes service definitions, volumes, environment variables, ports, and deployment configurations.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/DockerSwarm.md#_snippet_1>

LANGUAGE: yaml
CODE:

```
version: '3.9'

services:
  openWebUI:
    image: ghcr.io/open-webui/open-webui:main
    depends_on:
        - chromadb
        - ollama
    volumes:
      - ./data/open-webui:/app/backend/data
    environment:
      DATA_DIR: /app/backend/data 
      OLLAMA_BASE_URLS: http://ollama:11434
      CHROMA_HTTP_PORT: 8000
      CHROMA_HTTP_HOST: chromadb
      CHROMA_TENANT: default_tenant
      VECTOR_DB: chroma
      WEBUI_NAME: Awesome ChatBot
      CORS_ALLOW_ORIGIN: "*" # This is the current Default, will need to change before going live
      RAG_EMBEDDING_ENGINE: ollama
      RAG_EMBEDDING_MODEL: nomic-embed-text-v1.5
      RAG_EMBEDDING_MODEL_TRUST_REMOTE_CODE: "True"
    ports:
      - target: 8080
        published: 8080
        mode: overlay
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3

  chromadb:
    hostname: chromadb
    image: chromadb/chroma:0.5.15
    volumes:
      - ./data/chromadb:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - ALLOW_RESET=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
    ports: 
      - target: 8000
        published: 8000
        mode: overlay
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
    healthcheck: 
      test: ["CMD-SHELL", "curl localhost:8000/api/v1/heartbeat || exit 1"]
      interval: 10s
      retries: 2
      start_period: 5s
      timeout: 10s

  ollama:
    image: ollama/ollama:latest
    hostname: ollama
    ports:
      - target: 11434
        published: 11434
        mode: overlay
    deploy:
      resources:
        reservations:
          generic_resources:
            - discrete_resource_spec:
                kind: "NVIDIA-GPU"
                value: 0
      replicas: 1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
    volumes:
      - ./data/ollama:/root/.ollama

```

----------------------------------------

TITLE: MCP to OpenAPI Bridge Quick Start
DESCRIPTION: Demonstrates how to quickly set up and run the MCP-to-OpenAPI bridge to expose existing MCP-based tools as OpenAPI-compatible APIs. This allows seamless integration with Open WebUI and OpenAPI-based agents.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/openapi-servers/faq.mdx#_snippet_1>

LANGUAGE: bash
CODE:

```
uvx mcpo --port 8000 -- uvx mcp-server-time --local-timezone=America/New_York
```

----------------------------------------

TITLE: Open WebUI Docker Compose Configuration
DESCRIPTION: An example `docker-compose.yml` file for deploying Open WebUI. It defines the service, image, port mapping, and volume for persistent data storage.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/DockerCompose.md#_snippet_0>

LANGUAGE: yaml
CODE:

```
services:
  openwebui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - "3000:8080"
    volumes:
      - open-webui:/app/backend/data
volumes:
  open-webui:

```

----------------------------------------

TITLE: Quick Start: Run openai-edge-tts with Docker
DESCRIPTION: Starts the `openai-edge-tts` service as a detached Docker container, exposing it on port 5050. This is the simplest method to get the service running with default configurations.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/text-to-speech/openai-edge-tts-integration.md#_snippet_0>

LANGUAGE: bash
CODE:

```
docker run -d -p 5050:5050 travisvn/openai-edge-tts:latest
```

----------------------------------------

TITLE: Certbot Script for Let's Encrypt
DESCRIPTION: A bash script to automate obtaining and installing Let's Encrypt SSL certificates using Certbot with Nginx integration. It checks for Certbot installation and reloads Nginx upon completion.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tab-nginx/LetsEncrypt.md#_snippet_2>

LANGUAGE: bash
CODE:

```
#!/bin/bash

# Description: Simplified script to obtain and install Let's Encrypt SSL certificates using Certbot.

DOMAIN="your_domain_or_IP"
EMAIL="your_email@example.com"

# Install Certbot if not installed
if ! command -v certbot &> /dev/null;
    then
        echo "Certbot not found. Installing..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
fi

# Obtain SSL certificate
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"

# Reload Nginx to apply changes
sudo systemctl reload nginx

echo "Let's Encrypt SSL certificate has been installed and Nginx reloaded."
```

----------------------------------------

TITLE: Example Role Configuration
DESCRIPTION: This YAML snippet demonstrates how to define roles for your models. The 'chat' and 'edit' roles are common starting points for enabling model interactions and modifications.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/integrations/continue-dev.md#_snippet_9>

LANGUAGE: yaml
CODE:

```
roles:
  - chat
  - edit
```

----------------------------------------

TITLE: Clone Open WebUI Repository
DESCRIPTION: Clones the Open WebUI repository from GitHub and navigates into the project directory. This is the first step in setting up the local development environment.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_0>

LANGUAGE: bash
CODE:

```
git clone https://github.com/open-webui/open-webui.git
cd open-webui
```

----------------------------------------

TITLE: Pull Open WebUI Docker Image
DESCRIPTION: Pulls the latest Open WebUI Docker image from the GitHub Container Registry. This is the first step before running the container.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/ManualDocker.md#_snippet_0>

LANGUAGE: bash
CODE:

```
docker pull ghcr.io/open-webui/open-webui:main
```

----------------------------------------

TITLE: Install Open WebUI via Pip
DESCRIPTION: Installs Open WebUI using pip, streamlining the process for new users and making it accessible.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/features/index.mdx#_snippet_11>

LANGUAGE: bash
CODE:

```
pip install open-webui
```

----------------------------------------

TITLE: Install Docker Engine on Ubuntu (Bash)
DESCRIPTION: Installs the Docker Engine, CLI, and container runtime on Ubuntu after the repository has been set up. This command ensures you have the core Docker components needed to run containers.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/docker-install.md#_snippet_1>

LANGUAGE: bash
CODE:

```
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

----------------------------------------

TITLE: Starting Nginx Server (Bash)
DESCRIPTION: This command starts the Nginx web server. If Nginx is already running, this command will attempt to start a new instance, which might lead to port conflicts. It's typically used for the initial startup.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tab-nginx/Windows.md#_snippet_5>

LANGUAGE: bash
CODE:

```
nginx
```

----------------------------------------

TITLE: Open WebUI API Documentation
DESCRIPTION: Provides the URL to access the automatically generated API documentation for the Open WebUI backend. This documentation details available endpoints, request/response formats, and usage examples.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/development.md#_snippet_8>

LANGUAGE: APIDOC
CODE:

```
Access API Documentation:
  URL: http://localhost:8080/docs

Description:
  This documentation outlines all available API endpoints for the Open WebUI backend.
  It includes details on:
  - HTTP methods (GET, POST, PUT, DELETE, etc.)
  - Endpoint paths
  - Request parameters (query, path, body)
  - Request and response schemas (JSON structure)
  - Authentication methods
  - Error codes and messages

Usage:
  Use this documentation to understand how to interact with the backend programmatically, 
  for example, when building custom integrations or testing API functionality.
```

----------------------------------------

TITLE: Run Open WebUI Container (Default)
DESCRIPTION: Runs the Open WebUI container with default settings. It maps port 3000 to 8080 and uses a named volume for persistent data storage.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/ManualDocker.md#_snippet_1>

LANGUAGE: bash
CODE:

```
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:main
```

----------------------------------------

TITLE: Run Docling Docker Container
DESCRIPTION: Starts the Docling-serve Docker container, mapping port 5001 and enabling its UI. This is the primary command to get Docling running for integration.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/features/document-extraction/docling.md#_snippet_0>

LANGUAGE: bash
CODE:

```
docker run -p 5001:5001 -e DOCLING_SERVE_ENABLE_UI=true quay.io/docling-project/docling-serve
```

----------------------------------------

TITLE: Deploy Docker Swarm Stack
DESCRIPTION: Command to deploy the defined Docker Swarm services using the `docker stack deploy` command. It specifies the stack file (`docker-stack.yaml`) and assigns a name (`super-awesome-ai`) to the stack.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/DockerSwarm.md#_snippet_3>

LANGUAGE: bash
CODE:

```
docker stack deploy -c docker-stack.yaml -d super-awesome-ai
```

----------------------------------------

TITLE: Create Nginx Directories
DESCRIPTION: Creates the necessary directories for Nginx configuration files and SSL certificates on the server.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tab-nginx/LetsEncrypt.md#_snippet_0>

LANGUAGE: bash
CODE:

```
mkdir -p conf.d ssl
```

----------------------------------------

TITLE: Example: Llama.cpp Server Command with Specific Path
DESCRIPTION: An example of the Llama.cpp server command with a concrete directory path for the model, demonstrating how to replace placeholders like `/[your-directory]/` with actual file system locations.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/integrations/deepseekr1-dynamic.md#_snippet_3>

LANGUAGE: bash
CODE:

```
./llama-server \
    --model /Users/tim/Documents/workspace/DeepSeek-R1-GGUF/DeepSeek-R1-UD-IQ1_S/DeepSeek-R1-UD-IQ1_S-00001-of-00003.gguf \
    --port 10000 \
    --ctx-size 1024 \
    --n-gpu-layers 40
```

----------------------------------------

TITLE: Run Open WebUI with External Ollama Server
DESCRIPTION: Connects the Open WebUI container to an Ollama server running on a different host. This is configured by setting the OLLAMA_BASE_URL environment variable.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/ManualDocker.md#_snippet_4>

LANGUAGE: bash
CODE:

```
docker run -d -p 3000:8080 -e OLLAMA_BASE_URL=https://example.com -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main
```

----------------------------------------

TITLE: Install Docker on Ubuntu
DESCRIPTION: Installs Docker CE, CLI, containerd.io, buildx plugin, and compose plugin on Ubuntu using apt-get.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/https-caddy.md#_snippet_0>

LANGUAGE: bash
CODE:

```
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-compose
```

----------------------------------------

TITLE: Run Open WebUI with uv
DESCRIPTION: Starts the Open WebUI application using the 'uv' runtime manager. It's crucial to set the DATA_DIR environment variable to prevent data loss. Examples are provided for macOS/Linux and Windows.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/intro.mdx#_snippet_8>

LANGUAGE: bash
CODE:

```
DATA_DIR=~/.open-webui uvx --python 3.11 open-webui@latest serve
```

LANGUAGE: powershell
CODE:

```
$env:DATA_DIR="C:\\open-webui\\data"; uvx --python 3.11 open-webui@latest serve
```

----------------------------------------

TITLE: Clone and Install Pipelines
DESCRIPTION: Steps to manually install Open WebUI Pipelines by cloning the repository, navigating into the directory, and installing required Python dependencies using pip.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/pipelines/index.mdx#_snippet_8>

LANGUAGE: sh
CODE:

```
git clone https://github.com/open-webui/pipelines.git
cd pipelines
pip install -r requirements.txt
```

----------------------------------------

TITLE: Test Docusaurus Locally
DESCRIPTION: Provides essential commands to test Docusaurus site changes locally before deployment. It includes installing dependencies and building the site for production.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tips/contributing-tutorial.md#_snippet_2>

LANGUAGE: bash
CODE:

```
npm install
npm run build
```

----------------------------------------

TITLE: Install Open WebUI with pip
DESCRIPTION: Installs the Open WebUI package into the active Python virtual environment using pip. This command fetches and installs the latest stable version.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-python/Venv.md#_snippet_3>

LANGUAGE: bash
CODE:

```
pip install open-webui
```

----------------------------------------

TITLE: Install and Run mcpo Proxy (uv)
DESCRIPTION: This snippet demonstrates how to install and run the mcpo proxy server using 'uvx' for faster startup. It specifies the port and the command for the MCP server to run behind the proxy.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/openapi-servers/mcp.mdx#_snippet_0>

LANGUAGE: bash
CODE:

```
uvx mcpo --port 8000 -- your_mcp_server_command
```

----------------------------------------

TITLE: Make Script Executable
DESCRIPTION: Sets the execute permission for the `enable_letsencrypt.sh` script, allowing it to be run from the command line.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tab-nginx/LetsEncrypt.md#_snippet_3>

LANGUAGE: bash
CODE:

```
chmod +x enable_letsencrypt.sh
```

----------------------------------------

TITLE: Serving DeepSeek-R1 Model with Llama.cpp (Example)
DESCRIPTION: This is a specific example of the `llama-server` command, demonstrating how to serve the DeepSeek-R1 model from a user's workspace. It sets the server to listen on port 10000, with a context size of 1024 tokens, and offloads 40 layers to the GPU for optimized performance.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/integrations/deepseekr1-dynamic.md#_snippet_4>

LANGUAGE: bash
CODE:

```
./llama-server \
    --model /Users/tim/Documents/workspace/DeepSeek-R1-GGUF/DeepSeek-R1-UD-IQ1_S/DeepSeek-R1-UD-IQ1_S-00001-of-00003.gguf \
    --port 10000 \
    --ctx-size 1024 \
    --n-gpu-layers 40
```

----------------------------------------

TITLE: Run Open WebUI Container with GPU Support
DESCRIPTION: Runs the Open WebUI container with Nvidia GPU support enabled. This is achieved by adding the `--gpus all` flag to the docker run command.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/tab-docker/ManualDocker.md#_snippet_2>

LANGUAGE: bash
CODE:

```
docker run -d -p 3000:8080 --gpus all -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:cuda
```

----------------------------------------

TITLE: Unified API Endpoint Example
DESCRIPTION: Demonstrates importing the new unified `chat_completion` function from `open_webui.main` and the direct successor `generate_chat_completion` from `open_webui.utils.chat`.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/features/plugin/migration/index.mdx#_snippet_0>

LANGUAGE: python
CODE:

```
# Full API flow with parsing (new function):
from open_webui.main import chat_completion

# Lightweight, direct POST request (direct successor):
from open_webui.utils.chat import generate_chat_completion
```

----------------------------------------

TITLE: Docker Compose Direct Host Bind Example
DESCRIPTION: An example of configuring Docker Compose with direct host filesystem binds for Ollama and Open-WebUI. This method maps specific host directories to container volumes for data persistence.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/maintenance/backups.md#_snippet_3>

LANGUAGE: yaml
CODE:

```
services:
  ollama:
    container_name: ollama
    image: ollama/ollama:${OLLAMA_DOCKER_TAG-latest}
    volumes:
      - /opt/ollama:/root/.ollama
  open-webui:
    container_name: open-webui
    image: ghcr.io/open-webui/open-webui:${WEBUI_DOCKER_TAG-main}
    volumes:
      - /opt/open-webui:/app/backend/data
```

----------------------------------------

TITLE: Start Keycloak with HTTPS
DESCRIPTION: Command to start Keycloak with HTTPS enabled, requiring a keystore file and password. This is recommended for production environments.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/features/sso/keycloak.mdx#_snippet_2>

LANGUAGE: bash
CODE:

```
bin/kc.sh start --https-port=9090 \
  --https-key-store=keystore.jks \
  --https-key-store-password=<password>
```

----------------------------------------

TITLE: OpenAI API Connection Configuration
DESCRIPTION: Details on how to configure Open WebUI to connect with OpenAI or any OpenAI-compatible API service. This involves specifying the API endpoint URL and providing a valid API key.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/starting-with-openai.mdx#_snippet_0>

LANGUAGE: APIDOC
CODE:

```
OpenAI Connection Settings:
  API URL: The base URL for the OpenAI-compatible API endpoint.
    - Example (OpenAI): https://api.openai.com/v1
    - Example (Azure OpenAI): https://YOUR_RESOURCE_NAME.openai.azure.com/
    - Example (LocalAI): http://localhost:8080/v1
  API Key: Your authentication token for the API service.
    - Required for all connections.
    - Store securely; Open WebUI handles credential management.

Usage:
1. Navigate to ⚙️ Admin Settings in Open WebUI.
2. Go to Connections > OpenAI > Manage.
3. Click ➕ Add New Connection.
4. Fill in the API URL and API Key fields.
5. Click Save ✅.
```

----------------------------------------

TITLE: Install uv Runtime Manager
DESCRIPTION: Installs the 'uv' runtime manager, a recommended tool for simplifying Python environment management. Provides commands for macOS/Linux and Windows.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/intro.mdx#_snippet_7>

LANGUAGE: bash
CODE:

```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

LANGUAGE: powershell
CODE:

```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

----------------------------------------

TITLE: Clone SearXNG Docker Repository
DESCRIPTION: Clones the official SearXNG Docker repository to your local machine. This repository contains the necessary files and configurations to run SearXNG using Docker.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/web-search/searxng.md#_snippet_0>

LANGUAGE: bash
CODE:

```
git clone https://github.com/searxng/searxng-docker.git
```

----------------------------------------

TITLE: Navigate to SearXNG Docker Directory
DESCRIPTION: Changes the current directory to the cloned searxng-docker repository. This is where you will perform subsequent configuration steps.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/web-search/searxng.md#_snippet_1>

LANGUAGE: bash
CODE:

```
cd searxng-docker
```

----------------------------------------

TITLE: Enabling HAProxy Service to Start on Boot (Shell)
DESCRIPTION: This command configures the HAProxy service to automatically start upon system boot using systemd. This ensures that HAProxy is always running after a system restart without manual intervention.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/https-haproxy.md#_snippet_8>

LANGUAGE: Shell
CODE:

```
systemctl enable haproxy
```

----------------------------------------

TITLE: Querying Open WebUI Update Process via Docker with RAG
DESCRIPTION: This example illustrates a user's query regarding updating Open WebUI using Docker. The RAG-enhanced system response provides a concise answer, referencing the specific documentation file and the necessary Docker commands for the update.

SOURCE: <https://github.com/open-webui/docs/blob/main/docs/tutorials/tips/rag-tutorial.md#_snippet_1>

LANGUAGE: text
CODE:

```
User: "How do I update Open WebUI using Docker?"
System: "Refer to `docker/updating.md`: Use `docker pull` and restart the container."
```
