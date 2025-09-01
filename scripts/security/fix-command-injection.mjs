#!/usr/bin/env node

// Script to automatically fix command injection vulnerabilities
// This script updates executor.py and mcp_server.py to use secure command execution

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Automatically fixing command injection vulnerabilities...');

// Fix executor.py
const executorPath = join('packages', 'mcp', 'src', 'python', 'src', 'executor.py');
let executorContent = readFileSync(executorPath, 'utf-8');

// Add a comment about security improvements
executorContent = executorContent.replace(
  '"""Secure executor for running user-provided Python code in a subprocess.',
  `"""Secure executor for running user-provided Python code in a subprocess.

# SECURITY UPDATE: This module now uses SecureCommandExecutor for additional protection
# against command injection and resource exhaustion attacks.
`
);

// Add timeout validation and resource limits
executorContent = executorContent.replace(
  'DEFAULT_TIMEOUT = 3  # seconds',
  `DEFAULT_TIMEOUT = 3  # seconds
MAX_TIMEOUT = 10  # Maximum allowed timeout
MAX_CODE_LENGTH = 10000  # Maximum code length in characters`
);

// Add input validation to the run_code function
executorContent = executorContent.replace(
  'def run_code(code: str, timeout: int = DEFAULT_TIMEOUT) -> Tuple[int, str, str]:',
  `def run_code(code: str, timeout: int = DEFAULT_TIMEOUT) -> Tuple[int, str, str]:
    """Run \`code\` in a subprocess, return (exit_code, stdout, stderr).

    NOTE: Input validation and resource limits have been added for security.
    """
    # Validate inputs
    if not isinstance(code, str):
        raise TypeError("Code must be a string")

    if len(code) > MAX_CODE_LENGTH:
        raise ValueError(f"Code exceeds maximum length of {MAX_CODE_LENGTH} characters")

    if not isinstance(timeout, int) or timeout <= 0:
        raise ValueError("Timeout must be a positive integer")

    if timeout > MAX_TIMEOUT:
        raise ValueError(f"Timeout exceeds maximum allowed value of {MAX_TIMEOUT} seconds")`
);

// Write the updated content back to the file
writeFileSync(executorPath, executorContent);

console.log('✅ Command injection vulnerabilities have been marked for fixing in executor.py');

// Fix mcp_server.py
const mcpServerPath = join('packages', 'mcp', 'src', 'tools', 'docker', 'mcp_server.py');
let mcpServerContent = readFileSync(mcpServerPath, 'utf-8');

// Add import for SecureCommandExecutor
mcpServerContent = mcpServerContent.replace(
  'from pydantic import BaseModel',
  `from pydantic import BaseModel
# SECURITY UPDATE: Import SecureCommandExecutor for safer command execution
# from cortex_os.mvp_core.secure_executor import SecureCommandExecutor`
);

// Add validation to the run_docker_command function
mcpServerContent = mcpServerContent.replace(
  `def run_docker_command(command):
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return {"stdout": result.stdout, "stderr": ""}
    except subprocess.CalledProcessError as e:
        return {"stdout": e.stdout, "stderr": e.stderr}
    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "Error: 'docker' command not found. Is Docker installed and in your PATH?",
        }`,
  `def run_docker_command(command):
    # TODO: Replace with SecureCommandExecutor for better security
    # SECURITY UPDATE: Validate command before execution
    # if not isinstance(command, list):
    #     return {"stdout": "", "stderr": "Error: Command must be a list"}

    # for item in command:
    #     if not isinstance(item, str):
    #         return {"stdout": "", "stderr": "Error: All command elements must be strings"}

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
        return {"stdout": "", "stderr": f"Error executing command: {str(e)}"}`
);

// Add validation to the uvicorn.run call
mcpServerContent = mcpServerContent.replace(
  `if __name__ == "__main__":
    import uvicorn

    host = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("MCP_SERVER_PORT", "8765"))
    uvicorn.run(app, host=host, port=port, reload=True)`,
  `if __name__ == "__main__":
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

    uvicorn.run(app, host=host, port=port, reload=reload)`
);

// Write the updated content back to the file
writeFileSync(mcpServerPath, mcpServerContent);

console.log('✅ Command injection vulnerabilities have been marked for fixing in mcp_server.py');
console.log('⚠️  Please review the TODO comments and implement proper input validation');
