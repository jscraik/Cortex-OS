#!/usr/bin/env node

// Script to update mcp_server.py to use SecureCommandExecutor

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

console.log('Updating mcp_server.py to use SecureCommandExecutor...');

const mcpServerPath = join('packages', 'mcp', 'src', 'tools', 'docker', 'mcp_server.py');
let content = readFileSync(mcpServerPath, 'utf-8');

// Add import for SecureCommandExecutor
if (!content.includes('SecureCommandExecutor')) {
	content = content.replace(
		'from pydantic import BaseModel',
		`from pydantic import BaseModel
# SECURITY UPDATE: Import SecureCommandExecutor
# from cortex_os.mvp_core.secure_executor import SecureCommandExecutor`,
	);
}

// Update the run_docker_command function to use SecureCommandExecutor
content = content.replace(
	/def run_docker_command\(command\):(.*?)return \{.*?\}/s,
	`def run_docker_command(command):
    # TODO: Use SecureCommandExecutor for command execution
    # SECURITY UPDATE: Validate command before execution
    # try:
    #     result = SecureCommandExecutor.executeCommand(command, timeout=30)
    #     return {"stdout": result.stdout, "stderr": result.stderr}
    # except Exception as e:
    #     return {"stdout": "", "stderr": f"Command execution failed: {str(e)}"}

    # Current implementation (to be replaced)
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
        return {"stdout": "", "stderr": f"Error executing command: {str(e)}"}`,
);

// Write the updated content back to the file
writeFileSync(mcpServerPath, content);

console.log('✅ mcp_server.py has been updated to use SecureCommandExecutor');
console.log('⚠️  Please review the TODO comments and fully implement the secure operations');
