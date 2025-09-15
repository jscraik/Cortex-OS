#!/usr/bin/env python3
"""
Simple standalone MCP server that doesn't rely on relative imports.
"""

import logging
import os
import signal
import sys
from datetime import datetime
from types import FrameType

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/Users/jamiecraik/.Cortex-OS/logs/mcp-server-python.log"),
    ],
)
logger = logging.getLogger(__name__)

logger.info(f"Starting MCP Server at {datetime.now()}")
logger.info(f"Python version: {sys.version}")
logger.info(f"Python path: {sys.path}")
logger.info(f"Environment variables: {dict(os.environ)}")

# Add the MCP directory to the Python path
MCP_DIR = "/Users/jamiecraik/.Cortex-OS/packages/mcp"
sys.path.insert(0, MCP_DIR)
logger.info(f"Added {MCP_DIR} to Python path")

# Import required modules after setting up the path
try:
    import uvicorn
    from fastapi import FastAPI

    logger.info("Successfully imported FastAPI and Uvicorn")
except ImportError as e:
    logger.error(f"Error importing required modules: {e}")
    logger.error("Make sure uvicorn and fastapi are installed")
    sys.exit(1)

# Create a simple FastAPI app
app = FastAPI()


@app.get("/")
async def root():
    return {"message": "MCP Server is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/tools")
async def get_tools():
    # Return a simple list of tools for now
    return {
        "tools": [
            {
                "name": "tdd_coach.analyze_test_coverage",
                "description": "Analyze test coverage for the current project",
            },
            {
                "name": "tdd_coach.generate_test",
                "description": "Generate a test for a specific function or class",
            },
            {
                "name": "tdd_coach.refactor_test",
                "description": "Refactor existing tests to improve quality",
            },
            {
                "name": "tdd_coach.validate_tdd_flow",
                "description": "Validate that the TDD flow is being followed correctly",
            },
            {
                "name": "tdd_coach.coach_recommendation",
                "description": "Get coaching recommendations for TDD practices",
            },
        ]
    }


# Signal handlers for graceful shutdown
running = True


def signal_handler(signum: int, _frame: FrameType | None) -> None:
    global running
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    running = False


if __name__ == "__main__":
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    logger.info("Starting MCP Server (fixed port 3024)...")
    logger.info("Server will be available at http://0.0.0.0:3024")
    logger.info("Local access: http://127.0.0.1:3024")
    logger.info("External access via tunnel: https://cortex-mcp.brainwav.io")

    print("Starting MCP Server (fixed port 3024)...")
    print("Server will be available at http://0.0.0.0:3024")
    print("Local access: http://127.0.0.1:3024")

    try:
        # Run the server with better configuration
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=3024,  # Fixed MCP port
            log_level="info",
            access_log=True,
            loop="asyncio",
        )
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)
    finally:
        logger.info("MCP Server shutdown complete")
