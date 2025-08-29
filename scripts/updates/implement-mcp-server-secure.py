#!/usr/bin/env python3

# Script to fully implement SecureCommandExecutor in mcp_server.py

import os
import re

print("Fully implementing SecureCommandExecutor in mcp_server.py...")

mcp_server_path = os.path.join(
    "packages", "mcp", "src", "tools", "docker", "mcp_server.py"
)

# Read the file
with open(mcp_server_path) as f:
    content = f.read()

# Update the run_docker_command function to use SecureCommandExecutor
run_docker_pattern = re.compile(
    r"def run_docker_command\(command\):(.*?)# TODO: Use SecureCommandExecutor for command execution(.*?)return \{.*?\}",
    re.DOTALL,
)

run_docker_replacement = '''def run_docker_command(command):
    """Execute Docker command using SecureCommandExecutor."""
    # Validate command before execution
    try:
        validate_docker_command(command)
    except ValueError as e:
        return {"stdout": "", "stderr": f"Command validation failed: {str(e)}"}

    # Use SecureCommandExecutor for safe command execution
    try:
        # SECURITY UPDATE: Execute command using SecureCommandExecutor
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor

        # Convert command list to appropriate format for SecureCommandExecutor
        result = SecureCommandExecutor.execute_command_sync(command, timeout=30000)
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}'''

content = run_docker_pattern.sub(run_docker_replacement, content)

# Update the docker_list_containers function to use SecureCommandExecutor directly
content = re.sub(
    r'@app\.get\("/docker/containers"\)\s*def docker_list_containers\(\):\s*# TODO: Use SecureCommandExecutor for this operation\s*return run_docker_command\(\["docker", "ps", "-a"\]\)',
    '''@app.get("/docker/containers")
def docker_list_containers():
    """List all Docker containers using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("ps", ["-a"])
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}''',
    content,
)

# Update the docker_list_images function to use SecureCommandExecutor directly
content = re.sub(
    r'@app\.get\("/docker/images"\)\s*def docker_list_images\(\):\s*# TODO: Use SecureCommandExecutor for this operation\s*return run_docker_command\(\["docker", "images"\]\)',
    '''@app.get("/docker/images")
def docker_list_images():
    """List all Docker images using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("images")
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}''',
    content,
)

# Update the docker_inspect_container function to use SecureCommandExecutor directly
content = re.sub(
    r'@app\.post\("/docker/inspect"\)\s*def docker_inspect_container\(req: DockerInspectRequest\):\s*# TODO: Use SecureCommandExecutor for this operation\s*return run_docker_command\(\["docker", "inspect", req\.container_id\]\)',
    '''@app.post("/docker/inspect")
def docker_inspect_container(req: DockerInspectRequest):
    """Inspect a Docker container using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("inspect", [req.container_id])
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}''',
    content,
)

# Update the docker_get_container_logs function to use SecureCommandExecutor directly
content = re.sub(
    r'@app\.post\("/docker/logs"\)\s*def docker_get_container_logs\(req: DockerLogsRequest\):\s*# TODO: Use SecureCommandExecutor for this operation\s*return run_docker_command\(\["docker", "logs", req\.container_id\]\)',
    '''@app.post("/docker/logs")
def docker_get_container_logs(req: DockerLogsRequest):
    """Get logs from a Docker container using SecureCommandExecutor."""
    # SECURITY UPDATE: Use SecureCommandExecutor directly
    try:
        from cortex_os.mvp_core.secure_executor import SecureCommandExecutor
        result = SecureCommandExecutor.execute_docker_command("logs", [req.container_id])
        return result
    except Exception as e:
        return {"stdout": "", "stderr": f"Secure command execution failed: {str(e)}"}''',
    content,
)

# Write the updated content back to the file
with open(mcp_server_path, "w") as f:
    f.write(content)

print("✅ mcp_server.py fully implemented with SecureCommandExecutor")
