
"""
file_path: mcp_tools/docker/mcp_server.py
description: FastAPI MCP server exposing Docker tool functions via HTTP endpoints.
maintainer: @jamiescottcraik
last_updated: 2025-08-05
version: 1.1.0
status: active
ai_generated_by: github-copilot
ai_provenance_hash: N/A
"""

import os
import re
import subprocess
from typing import Dict, List

from fastapi import FastAPI
from pydantic import BaseModel
# SECURITY UPDATE: Import SecureCommandExecutor for safer command execution
from cortex_os.mvp_core.secure_executor import SecureCommandExecutor

app = FastAPI(title="Cortex MCP Docker Toolkit", version="1.1.0")


class DockerInspectRequest(BaseModel):
    container_id: str


class DockerLogsRequest(BaseModel):
    container_id: str


# Documentation analysis request/response
class DocumentationAnalysisRequest(BaseModel):
    files: List[str] = []  # Optional: list of files to analyze


class DocumentationAnalysisResult(BaseModel):
    file: str
    present: bool
    accessibility: Dict[str, str]
    compliance: Dict[str, str]
    missing_sections: List[str]


def validate_docker_command(command):
    """Validate docker command to prevent injection."""
    if not isinstance(command, list):
        raise ValueError("Command must be a list")
    
    if len(command) < 2:
        raise ValueError("Command must have at least 2 elements")
    
    if command[0] != "docker":
        raise ValueError("Command must start with 'docker'")
    
    # Validate subcommands
    allowed_subcommands = ["ps", "images", "inspect", "logs"]
    if command[1] not in allowed_subcommands:
        raise ValueError(f"Subcommand {command[1]} not allowed")
    
    # Validate parameters
    for i in range(2, len(command)):
        param = command[i]
        if isinstance(param, str) and (param.startswith("-") or len(param) < 12 or len(param) > 64):
            # Skip flags and validate container IDs
            continue
        elif isinstance(param, str) and not re.match(r"^[a-f0-9]+$", param):
            raise ValueError(f"Invalid parameter: {param}")

def run_docker_command(command):
    """Execute Docker command using SecureCommandExecutor."""
    # Validate command before execution
    try:
        validate_docker_command(command)
    except ValueError as e:
        return {"stdout": "", "stderr": f"Command validation failed: {str(e)}"}
    
    # Use SecureCommandExecutor for safe command execution
    try:
        # SECURITY UPDATE: Execute command using Python SecureCommandExecutor
        result = SecureCommandExecutor.execute_command_sync(command, timeout=30)
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}"}"}
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30)
        return {"stdout": result.stdout, "stderr": ""}
    except subprocess.CalledProcessError as e:
        return {"stdout": e.stdout, "stderr": e.stderr}
    except subprocess.TimeoutExpired as e:
        return {"stdout": "", "stderr": f"Error: Command timed out after 30 seconds"}
    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "Error: 'docker' command not found. Is Docker installed and in your PATH?",
        }
    except Exception as e:
        return {"stdout": "", "stderr": f"Error executing command: {str(e)}"}"}
    
    result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30)
        return {"stdout": result.stdout, "stderr": ""}
    except subprocess.CalledProcessError as e:
        return {"stdout": e.stdout, "stderr": e.stderr}
    except subprocess.TimeoutExpired as e:
        return {"stdout": "", "stderr": f"Error: Command timed out after 30 seconds"}
    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "Error: 'docker' command not found. Is Docker installed and in your PATH?",
        }
    except Exception as e:
        return {"stdout": "", "stderr": f"Error executing command: {str(e)}"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "tools": [
            "docker_list_containers",
            "docker_list_images",
            "docker_inspect_container",
            "docker_get_container_logs",
            "analyze_documentation",
        ],
    }


@app.get("/docker/containers")
def docker_list_containers():
    """List all Docker containers using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("ps", ["-a"])
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}


@app.get("/docker/images")
def docker_list_images():
    """List all Docker images using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("images")
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}


@app.post("/docker/inspect")
def docker_inspect_container(req: DockerInspectRequest):
    """Inspect a Docker container using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("inspect", [req.container_id])
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}


@app.post("/docker/logs")
def docker_get_container_logs(req: DockerLogsRequest):
    """Get logs from a Docker container using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("logs", [req.container_id])
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}


@app.post("/docker/analyze_documentation")
def analyze_documentation(req: DocumentationAnalysisRequest):
    files = req.files or ["README.md", "docs/architecture/planning.md"]
    results = []
    for file in files:
        result = {
            "file": file,
            "present": False,
            "accessibility": {},
            "compliance": {},
            "missing_sections": [],
        }
        missing_sections = []
        if os.path.exists(file):
            result["present"] = True
            try:
                with open(file, "r", encoding="utf-8") as f:
                    content = f.read()
                result["accessibility"] = {
                    "wcag_2_1_aa": "yes"
                    if re.search(r"WCAG.*2\.1.*AA", content, re.I)
                    else "no",
                    "skip_nav": "yes" if "skip-nav" in content else "no",
                    "alt_text": "yes" if re.search(r"!\[.*\]\(.*\)", content) else "no",
                }
                result["compliance"] = {
                    "license": "MIT" if re.search(r"MIT", content, re.I) else "missing",
                    "ai_provenance": "yes" if "ai_provenance_hash" in content else "no",
                }
                required_sections = [
                    "Vision",
                    "Mission",
                    "Features",
                    "Accessibility",
                    "Security",
                    "Community",
                ]
                for section in required_sections:
                    if not re.search(rf"^#+\s*{section}", content, re.I | re.M):
                        missing_sections.append(section)
                result["missing_sections"] = missing_sections
            except Exception as e:
                result["error"] = str(e)
        results.append(result)
    return {"results": results}


if __name__ == "__main__":
    import uvicorn

    # SECURITY UPDATE: Validate host and port
    host = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
    # TODO: Add host validation to prevent SSRF
    # if not is_valid_host(host):
    #     host = "0.0.0.0"  # Default to localhost if invalid
    
    port = int(os.getenv("MCP_SERVER_PORT", "8765"))
    # Validate port range
    if port < 1024 or port > 65535:
        port = 8765  # Default to standard port if invalid
    
    # SECURITY UPDATE: Disable reload in production
    reload = os.getenv("MCP_SERVER_RELOAD", "false").lower() == "true"
    
    uvicorn.run(app, host=host, port=port, reload=reload)

# © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
