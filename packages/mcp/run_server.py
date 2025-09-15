#!/usr/bin/env python3
"""
Simple standalone MCP server that doesn't rely on relative imports.
"""

import sys

# Add the MCP directory to the Python path
MCP_DIR = "/Users/jamiecraik/.Cortex-OS/packages/mcp"
sys.path.insert(0, MCP_DIR)

# Import required modules after setting up the path
try:
    import uvicorn
    from fastapi import FastAPI
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print("Make sure uvicorn and fastapi are installed")
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


if __name__ == "__main__":
    print("Starting MCP Server...")
    print("Server will be available at http://127.0.0.1:3000")

    # Run the server
    uvicorn.run(app, host="127.0.0.1", port=3000, log_level="info")
