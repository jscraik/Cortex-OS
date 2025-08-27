#!/usr/bin/env python3
"""
file_path: docker/gpl-tools/gpl_service.py
description: GPL Tools HTTP API Service - Isolates GPL-licensed terminal tools behind HTTP boundary
maintainer: @jamiescottcraik
last_updated: 2025-08-05
version: 1.0.0
status: active
ai_generated_by: automated-tooling
ai_provenance_hash: combined-gpl-service-features
"""

import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define a safe base directory for images within the container; require explicit environment variable
safe_image_dir_env = os.environ.get("SAFE_IMAGE_DIR")
if not safe_image_dir_env:
    raise RuntimeError(
        "SAFE_IMAGE_DIR environment variable must be set for secure operation."
    )
SAFE_IMAGE_DIR = Path(safe_image_dir_env).resolve()

# Ensure the safe directory exists
SAFE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="GPL Terminal Tools API",
    version="1.0.0",
    description="Isolated GPL-licensed terminal tools behind HTTP API boundary",
)


class VisualizationRequest(BaseModel):
    tool: str = Field(..., description="Tool name (viu, chafa, timg)")
    imagePath: str = Field(..., description="Path to image file")
    options: Dict[str, Any] = Field(
        default_factory=dict, description="Tool-specific options"
    )

    @validator("tool")
    def validate_tool(cls, v):
        allowed_tools = ["viu", "chafa", "timg"]
        if v not in allowed_tools:
            raise ValueError(f"Tool must be one of: {allowed_tools}")
        return v


def validate_image_path(image_path: str) -> Path:
    """Validate and resolve image path to prevent path traversal attacks"""
    try:
        image_path_obj = Path(image_path)
        # Resolve to absolute path to handle '..' and symlinks
        resolved_image_path = image_path_obj.resolve()

        # Ensure the resolved path is within the safe directory
        if not resolved_image_path.is_relative_to(SAFE_IMAGE_DIR):
            raise HTTPException(
                status_code=400,
                detail="Invalid image path: Path not within allowed directory.",
            )

        # Ensure the file actually exists after validation
        if not resolved_image_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found.")

        return resolved_image_path

    except (OSError, RuntimeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid image path: {e}")


def execute_tool(
    tool: str, image_path: Path, options: Dict[str, Any]
) -> subprocess.CompletedProcess:
    """Execute GPL tool with proper security and error handling"""

    try:
        if tool == "viu":
            cmd = [
                "viu",
                "--transparent",
                "--width",
                str(options.get("width", 80)),
                str(image_path),
            ]

        elif tool == "chafa":
            cmd = [
                "chafa",
                "--format",
                options.get("format", "symbols"),
                "--size",
                f"{options.get('width', 80)}x{options.get('height', 24)}",
                str(image_path),
            ]

        elif tool == "timg":
            cmd = [
                "timg",
                "-g",
                f"{options.get('width', 80)}x{options.get('height', 24)}",
                str(image_path),
            ]
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported tool: {tool}")

        logger.info(f"Executing command: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=SAFE_IMAGE_DIR,  # Run in safe directory
        )

        return result

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Tool execution timeout")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Requested tool not available")
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.post("/visualize")
async def visualize_image(request: VisualizationRequest):
    """Process image with specified GPL tool"""
    logger.info(f"Visualization request: {request.tool} for {request.imagePath}")

    # Validate and resolve image path
    resolved_image_path = validate_image_path(request.imagePath)

    # Execute tool
    result = execute_tool(request.tool, resolved_image_path, request.options)

    if result.returncode != 0:
        logger.error(f"Tool execution failed: {result.stderr}")
        raise HTTPException(
            status_code=500,
            detail=f"Tool execution failed: {result.stderr or 'Unknown error'}",
        )

    return {
        "output": result.stdout,
        "tool": request.tool,
        "options": request.options,
        "success": True,
    }


@app.post("/upload-and-visualize")
async def upload_and_visualize(
    file: UploadFile = File(...),
    tool: str = Form(...),
    width: int = Form(80),
    height: int = Form(24),
    format: str = Form("auto"),
):
    """Upload image file and visualize with GPL tool"""
    logger.info(f"Upload and visualize: {file.filename} with {tool}")

    # Validate tool
    if tool not in ["viu", "chafa", "timg"]:
        raise HTTPException(status_code=400, detail=f"Unsupported tool: {tool}")

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Create temporary file in safe directory
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=Path(file.filename or "image").suffix,
            dir=SAFE_IMAGE_DIR,
        ) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = Path(temp_file.name)

        # Process image
        options = {"width": width, "height": height, "format": format}
        result = execute_tool(tool, temp_path, options)

        # Clean up
        temp_path.unlink()

        if result.returncode != 0:
            raise HTTPException(
                status_code=500, detail=f"Tool execution failed: {result.stderr}"
            )

        return {
            "output": result.stdout,
            "tool": tool,
            "filename": file.filename,
            "options": options,
            "success": True,
        }

    except Exception as e:
        # Clean up on error
        if "temp_path" in locals() and temp_path.exists():
            temp_path.unlink()
        logger.error(f"Upload processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint - verify tool availability and service status"""
    tools = ["viu", "chafa", "timg"]
    available_tools = []
    tool_versions = {}

    for tool in tools:
        try:
            # Try to run tool with --version to check availability
            result = subprocess.run(
                [tool, "--version"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                available_tools.append(tool)
                tool_versions[tool] = result.stdout.strip()
        except (FileNotFoundError, subprocess.TimeoutExpired):
            logger.warning(f"Tool '{tool}' not available")
            continue

    status = "healthy" if available_tools else "unhealthy"

    health_info = {
        "status": status,
        "available_tools": available_tools,
        "tool_versions": tool_versions,
        "safe_image_dir": str(SAFE_IMAGE_DIR),
        "safe_image_dir_exists": SAFE_IMAGE_DIR.exists(),
        "service_version": "1.0.0",
    }

    logger.info(f"Health check: {status}, tools: {available_tools}")

    if status == "unhealthy":
        return JSONResponse(content=health_info, status_code=503)

    return health_info


@app.get("/tools")
async def list_tools():
    """List available GPL tools and their capabilities"""
    tools_info = {
        "viu": {
            "license": "GPL-3.0",
            "description": "Terminal image viewer with sixel/kitty support",
            "formats": ["PNG", "JPEG", "GIF", "WebP"],
            "features": ["sixel", "ansi", "transparency"],
        },
        "chafa": {
            "license": "GPL-3.0",
            "description": "Character art converter with multiple formats",
            "formats": ["PNG", "JPEG", "GIF", "WebP", "SVG"],
            "features": ["symbols", "blocks", "ascii", "kitty-protocol"],
        },
        "timg": {
            "license": "GPL-3.0",
            "description": "Terminal image and video viewer",
            "formats": ["PNG", "JPEG", "GIF", "WebP", "MP4"],
            "features": ["ansi", "unicode", "video-frames"],
        },
    }

    return {
        "tools": tools_info,
        "license_compliance": "GPL-3.0 tools isolated behind HTTP API boundary",
        "integration_type": "service_isolation",
    }


@app.get("/")
async def root():
    """Service information endpoint"""
    return {
        "service": "GPL Terminal Tools API",
        "version": "1.0.0",
        "description": "Isolated GPL-licensed terminal visualization tools",
        "license_compliance": "GPL tools isolated via HTTP API boundary",
        "endpoints": ["/visualize", "/upload-and-visualize", "/health", "/tools"],
        "documentation": "/docs",
    }


if __name__ == "__main__":
    # Ensure safe directory exists
    SAFE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Starting GPL Tools Service with safe directory: {SAFE_IMAGE_DIR}")

    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info", access_log=True)

# © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
