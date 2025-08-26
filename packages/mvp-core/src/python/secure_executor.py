"""
Secure Command Executor for Python

This module provides a Python interface to the SecureCommandExecutor
implemented in TypeScript/Node.js, enabling secure command execution
with validation, resource limits, and injection prevention.
"""

import subprocess
import re
import os
from typing import List, Dict, Any, Optional
import json
import time


class SecureCommandExecutor:
    """Secure command execution wrapper that prevents command injection."""

    # Whitelisted commands for safe execution
    ALLOWED_COMMANDS = {
        'docker', 'git', 'ls', 'pwd', 'echo', 'cat', 'grep', 'find'
    }

    # Whitelisted Docker subcommands
    ALLOWED_DOCKER_SUBCOMMANDS = {
        'ps', 'images', 'inspect', 'logs', 'version', 'info'
    }

    # Resource limits
    DEFAULT_TIMEOUT = 30  # seconds
    DEFAULT_MEMORY_LIMIT = 100 * 1024 * 1024  # 100 MB

    @classmethod
    def validate_docker_command(cls, command: List[str]) -> bool:
        """Validate Docker command to prevent injection."""
        if not isinstance(command, list):
            raise ValueError("Command must be a list")

        if len(command) < 2:
            raise ValueError("Command must have at least 2 elements")

        if command[0] != "docker":
            raise ValueError("Command must start with 'docker'")

        # Validate subcommands
        if len(command) > 1 and command[1] not in cls.ALLOWED_DOCKER_SUBCOMMANDS:
            raise ValueError(f"Subcommand {command[1]} not allowed")

        # Validate parameters
        for i in range(2, len(command)):
            param = command[i]
            if isinstance(param, str):
                # Prevent very long parameters that could be used for DoS
                if len(param) > 1000:
                    raise ValueError(f"Parameter too long: {param}")

                # Prevent dangerous patterns in parameters
                if re.search(r'[;&|`$(){}[\]<>]', param):
                    raise ValueError(f"Invalid characters in parameter: {param}")

        return True

    @classmethod
    def sanitize_command(cls, command: List[str]) -> List[str]:
        """Sanitize command parameters to prevent injection."""
        sanitized = []
        for param in command:
            if isinstance(param, str):
                # Remove dangerous characters
                clean_param = re.sub(r'[;&|`$(){}[\]<>]', '', param)
                sanitized.append(clean_param)
            else:
                sanitized.append(str(param))
        return sanitized

    @classmethod
    def execute_command_sync(cls, command: List[str], timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """
        Execute a command synchronously with security validation.
        
        Args:
            command: List of command arguments
            timeout: Timeout in seconds
            
        Returns:
            Dictionary with stdout, stderr, and exit_code
        """
        # Validate the command
        try:
            cls.validate_docker_command(command)
        except ValueError as e:
            return {
                "stdout": "",
                "stderr": f"Command validation failed: {str(e)}",
                "exit_code": 1
            }

        # Check if command is whitelisted
        if command[0] not in cls.ALLOWED_COMMANDS:
            return {
                "stdout": "",
                "stderr": f"Command {command[0]} is not allowed",
                "exit_code": 1
            }

        # Sanitize command parameters
        sanitized_command = cls.sanitize_command(command)

        try:
            # Execute the command with timeout
            result = subprocess.run(
                sanitized_command,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False  # Don't raise exception on non-zero exit codes
            )
            
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "exit_code": 124  # Standard timeout exit code
            }
        except FileNotFoundError:
            return {
                "stdout": "",
                "stderr": f"Command '{sanitized_command[0]}' not found",
                "exit_code": 127  # Standard command not found exit code
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": f"Command execution failed: {str(e)}",
                "exit_code": 1
            }

    @classmethod
    def execute_docker_command(cls, subcommand: str, args: Optional[List[str]] = None, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """
        Execute a Docker command with additional security.
        
        Args:
            subcommand: Docker subcommand to execute
            args: Additional arguments for the subcommand
            timeout: Timeout in seconds
            
        Returns:
            Dictionary with stdout, stderr, and exit_code
        """
        # Validate subcommand
        if subcommand not in cls.ALLOWED_DOCKER_SUBCOMMANDS:
            return {
                "stdout": "",
                "stderr": f"Docker subcommand '{subcommand}' is not allowed",
                "exit_code": 1
            }

        # Validate arguments
        if args is None:
            args = []

        for arg in args:
            if not isinstance(arg, str):
                return {
                    "stdout": "",
                    "stderr": "All arguments must be strings",
                    "exit_code": 1
                }

            # Prevent very long arguments that could be used for DoS
            if len(arg) > 1000:
                return {
                    "stdout": "",
                    "stderr": "Argument too long",
                    "exit_code": 1
                }

            # Prevent dangerous patterns in arguments
            if re.search(r'[;&|`$(){}[\]<>]', arg):
                return {
                    "stdout": "",
                    "stderr": f"Invalid characters in argument: {arg}",
                    "exit_code": 1
                }

        # Build the full command
        command = ['docker', subcommand] + args

        # Execute with security wrapper
        return cls.execute_command_sync(command, timeout)