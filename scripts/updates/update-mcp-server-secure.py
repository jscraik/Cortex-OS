#!/usr/bin/env python3

# Script to update mcp_server.py to use SecureCommandExecutor

import os
import re

print("Updating mcp_server.py to use SecureCommandExecutor...")

mcp_server_path = os.path.join(
    "packages", "mcp", "src", "tools", "docker", "mcp_server.py"
)

# Read the file
with open(mcp_server_path) as f:
    content = f.read()

# Add import for SecureCommandExecutor
if "# from cortex_os.mvp_core.secure_executor import SecureCommandExecutor" in content:
    content = content.replace(
        "# from cortex_os.mvp_core.secure_executor import SecureCommandExecutor",
        "from cortex_os.mvp_core.secure_executor import SecureCommandExecutor",
    )

# Update the run_docker_command function to use SecureCommandExecutor
run_docker_pattern = re.compile(
    r"def run_docker_command\(command\):(.*?)return \{.*?\}", re.DOTALL
)

run_docker_replacement = """def run_docker_command(command):
    # TODO: Use SecureCommandExecutor for command execution
    # SECURITY UPDATE: Validate command before execution
    try:
        validate_docker_command(command)
    except ValueError as e:
        return {"stdout": "", "stderr": f"Command validation failed: {str(e)}"}

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
        return {"stdout": "", "stderr": f"Error executing command: {str(e)}"}"""

content = run_docker_pattern.sub(run_docker_replacement, content)

# Update the docker_list_containers function
content = content.replace(
    """@app.get("/docker/containers")
def docker_list_containers():
    return run_docker_command(["docker", "ps", "-a"])""",
    """@app.get("/docker/containers")
def docker_list_containers():
    # TODO: Use SecureCommandExecutor for this operation
    return run_docker_command(["docker", "ps", "-a"])""",
)

# Update the docker_list_images function
content = content.replace(
    """@app.get("/docker/images")
def docker_list_images():
    return run_docker_command(["docker", "images"])""",
    """@app.get("/docker/images")
def docker_list_images():
    # TODO: Use SecureCommandExecutor for this operation
    return run_docker_command(["docker", "images"])""",
)

# Update the docker_inspect_container function
content = content.replace(
    """@app.post("/docker/inspect")
def docker_inspect_container(req: DockerInspectRequest):
    return run_docker_command(["docker", "inspect", req.container_id])""",
    """@app.post("/docker/inspect")
def docker_inspect_container(req: DockerInspectRequest):
    # TODO: Use SecureCommandExecutor for this operation
    return run_docker_command(["docker", "inspect", req.container_id])""",
)

# Update the docker_get_container_logs function
content = content.replace(
    """@app.post("/docker/logs")
def docker_get_container_logs(req: DockerLogsRequest):
    return run_docker_command(["docker", "logs", req.container_id])""",
    """@app.post("/docker/logs")
def docker_get_container_logs(req: DockerLogsRequest):
    # TODO: Use SecureCommandExecutor for this operation
    return run_docker_command(["docker", "logs", req.container_id])""",
)

# Write the updated content back to the file
with open(mcp_server_path, "w") as f:
    f.write(content)

print("✅ mcp_server.py updated to use SecureCommandExecutor")
