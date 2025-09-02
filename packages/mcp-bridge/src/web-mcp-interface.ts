/**
 * @file_path apps/cortex-os/packages/mcp/src/web-mcp-interface.ts
 * @description Web interface for secure MCP server management
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { universalCliHandler } from "./universal-cli-handler.js";

/**
 * Web interface for MCP server management
 * Provides a simple HTTP API for frontend integrations
 */
export class WebMcpInterface {
	/**
	 * Handle MCP server addition via web request
	 */
	async handleAddServer(request: {
		command: string;
		frontend?: string;
		autoApprove?: boolean;
	}): Promise<{
		status: number;
		body: {
			success: boolean;
			message: string;
			data?: unknown;
			requiresConfirmation?: boolean;
			securityLevel?: string;
		};
	}> {
		try {
			const result = await universalCliHandler.processMcpCommand(
				request.command,
				{
					frontend: request.frontend || "web",
					autoApprove: request.autoApprove || false,
					interactive: true,
				},
			);

			return {
				status: result.success ? 200 : result.requiresConfirmation ? 202 : 400,
				body: result,
			};
		} catch (error) {
			return {
				status: 500,
				body: {
					success: false,
					message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			};
		}
	}

	/**
	 * Handle server approval via web request
	 */
	async handleApproveServer(request: {
		command: string;
		frontend?: string;
		force: boolean;
	}): Promise<{
		status: number;
		body: {
			success: boolean;
			message: string;
			data?: unknown;
		};
	}> {
		try {
			const result = await universalCliHandler.approveServer(request.command, {
				frontend: request.frontend || "web",
				force: request.force,
			});

			return {
				status: result.success ? 200 : 400,
				body: result,
			};
		} catch (error) {
			return {
				status: 500,
				body: {
					success: false,
					message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			};
		}
	}

	/**
	 * Check if a server is installed
	 */
	async handleCheckServer(request: { nameOrUrl: string }): Promise<{
		status: number;
		body: {
			success: boolean;
			message: string;
			data?: unknown;
		};
	}> {
		try {
			const result = await universalCliHandler.checkServerInstallation(
				request.nameOrUrl,
			);

			return {
				status: 200,
				body: result,
			};
		} catch (error) {
			return {
				status: 500,
				body: {
					success: false,
					message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			};
		}
	}

	/**
	 * List all configured servers
	 */
	async handleListServers(): Promise<{
		status: number;
		body: {
			success: boolean;
			message: string;
			data?: unknown;
		};
	}> {
		try {
			const result = await universalCliHandler.listServers();
			return {
				status: 200,
				body: result,
			};
		} catch (error) {
			return {
				status: 500,
				body: {
					success: false,
					message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			};
		}
	}

	/**
	 * Remove a server
	 */
	async handleRemoveServer(serverName: string): Promise<{
		status: number;
		body: {
			success: boolean;
			message: string;
		};
	}> {
		try {
			const result = await universalCliHandler.removeServer(serverName);
			return {
				status: result.success ? 200 : 400,
				body: result,
			};
		} catch (error) {
			return {
				status: 500,
				body: {
					success: false,
					message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			};
		}
	}

	/**
	 * Get server status
	 */
	async handleServerStatus(serverName?: string): Promise<{
		status: number;
		body: {
			success: boolean;
			message: string;
			data?: unknown;
		};
	}> {
		try {
			const result = await universalCliHandler.getServerStatus(serverName);
			return {
				status: 200,
				body: result,
			};
		} catch (error) {
			return {
				status: 500,
				body: {
					success: false,
					message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			};
		}
	}

	/**
	 * Generate HTML interface for testing
	 */
	generateTestInterface(): string {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal MCP Manager - Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        .result { margin: 20px 0; padding: 15px; border-radius: 4px; white-space: pre-wrap; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .example { background: #f8f9fa; padding: 10px; border-left: 4px solid #007cba; margin: 10px 0; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>🔒 Universal MCP Manager</h1>
    <p>Secure MCP server management with universal CLI support</p>

    <h2>Add MCP Server</h2>
    <div class="form-group">
        <label for="command">Command:</label>
        <textarea id="command" rows="3" placeholder="Enter MCP command from any CLI format..."></textarea>
        <div class="example">
            <strong>Examples:</strong><br>
            • cortex mcp add --transport http Ref "https://api.ref.tools/mcp?apiKey=ref-e672788111c76ba32bc1"<br>
            • claude mcp add --transport http ref-server https://api.ref.tools/mcp --header "Authorization: Bearer token"<br>
            • gemini mcp add ref-server --url https://api.ref.tools/mcp --key ref-e672788111c76ba32bc1
        </div>
    </div>

    <div class="form-group">
        <label for="frontend">Frontend:</label>
        <select id="frontend">
            <option value="web">Web Interface</option>
            <option value="cortex-cli">Cortex CLI</option>
            <option value="claude">Claude Desktop</option>
            <option value="vs-code">VS Code</option>
            <option value="github-copilot">GitHub Copilot</option>
            <option value="gemini">Gemini CLI</option>
        </select>
    </div>

    <div class="form-group">
        <label>
            <input type="checkbox" id="autoApprove"> Auto-approve (skip security review)
        </label>
    </div>

    <button onclick="addServer()">Add Server</button>
    <button onclick="listServers()">List Servers</button>
    <button onclick="getStatus()">Get Status</button>

    <div id="result"></div>

    <script>
        async function addServer() {
            const command = document.getElementById('command').value;
            const frontend = document.getElementById('frontend').value;
            const autoApprove = document.getElementById('autoApprove').checked;

            if (!command.trim()) {
                showResult('Please enter a command', 'error');
                return;
            }

            try {
                const response = await fetch('/api/mcp/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command, frontend, autoApprove })
                });

                const result = await response.json();

                if (result.requiresConfirmation) {
                    showResult(result.message + '\\n\\nClick "Approve" to proceed with --force', 'warning');
                    showApproveButton(command, frontend);
                } else if (result.success) {
                    showResult(result.message, 'success');
                } else {
                    showResult(result.message, 'error');
                }
            } catch (error) {
                showResult('Network error: ' + error.message, 'error');
            }
        }

        async function approveServer(command, frontend) {
            try {
                const response = await fetch('/api/mcp/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command, frontend, force: true })
                });

                const result = await response.json();

                if (result.success) {
                    showResult(result.message, 'success');
                } else {
                    showResult(result.message, 'error');
                }
            } catch (error) {
                showResult('Network error: ' + error.message, 'error');
            }
        }

        async function listServers() {
            try {
                const response = await fetch('/api/mcp/list');
                const result = await response.json();
                showResult(JSON.stringify(result, null, 2), result.success ? 'success' : 'error');
            } catch (error) {
                showResult('Network error: ' + error.message, 'error');
            }
        }

        async function getStatus() {
            try {
                const response = await fetch('/api/mcp/status');
                const result = await response.json();
                showResult(JSON.stringify(result, null, 2), result.success ? 'success' : 'error');
            } catch (error) {
                showResult('Network error: ' + error.message, 'error');
            }
        }

        function showResult(message, type) {
            const resultDiv = document.getElementById('result');
            resultDiv.className = 'result ' + type;
            resultDiv.textContent = message;
        }

        function showApproveButton(command, frontend) {
            const resultDiv = document.getElementById('result');
            const button = document.createElement('button');
            button.textContent = 'Approve Server';
            button.onclick = () => approveServer(command, frontend);
            button.style.marginTop = '10px';
            resultDiv.appendChild(button);
        }
    </script>
</body>
</html>`;
	}
}

// Export singleton instance
export const webMcpInterface = new WebMcpInterface();
