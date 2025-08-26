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


def run_docker_command(command):
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return {"stdout": result.stdout, "stderr": ""}
    except subprocess.CalledProcessError as e:
        return {"stdout": e.stdout, "stderr": e.stderr}
    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "Error: 'docker' command not found. Is Docker installed and in your PATH?",
        }


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
    return run_docker_command(["docker", "ps", "-a"])


@app.get("/docker/images")
def docker_list_images():
    return run_docker_command(["docker", "images"])


@app.post("/docker/inspect")
def docker_inspect_container(req: DockerInspectRequest):
    return run_docker_command(["docker", "inspect", req.container_id])


@app.post("/docker/logs")
def docker_get_container_logs(req: DockerLogsRequest):
    return run_docker_command(["docker", "logs", req.container_id])


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

    host = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("MCP_SERVER_PORT", "8765"))
    uvicorn.run(app, host=host, port=port, reload=True)

# © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
