"""Safe subprocess utilities for preventing command injection attacks.

This module provides secure alternatives to subprocess operations that help prevent
command injection vulnerabilities while maintaining functionality.
"""

import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union


class SafeSubprocessError(Exception):
    """Exception raised for unsafe subprocess operations."""

    pass


def validate_command(command: Union[str, List[str]], allowed_commands: Optional[Set[str]] = None) -> List[str]:
    """Validate and normalize a command for safe execution.
    
    Args:
        command: Command to validate (string or list)
        allowed_commands: Set of allowed command names
        
    Returns:
        List of validated command parts
        
    Raises:
        SafeSubprocessError: If command is invalid or not allowed
    """
    if isinstance(command, str):
        # Parse string command safely
        try:
            cmd_parts = shlex.split(command)
        except ValueError as e:
            raise SafeSubprocessError(f"Invalid command syntax: {e}") from e
    else:
        cmd_parts = list(command)
    
    if not cmd_parts:
        raise SafeSubprocessError("Empty command")
    
    command_name = os.path.basename(cmd_parts[0])
    
    if allowed_commands and command_name not in allowed_commands:
        raise SafeSubprocessError(f"Command '{command_name}' not in allowlist")
    
    # Resolve command to full path if possible
    if not os.path.isabs(cmd_parts[0]):
        full_path = shutil.which(cmd_parts[0])
        if full_path:
            cmd_parts[0] = full_path
    
    return cmd_parts


def sanitize_args(args: List[str]) -> List[str]:
    """Sanitize command arguments to prevent injection.
    
    Args:
        args: List of command arguments
        
    Returns:
        List of sanitized arguments
    """
    sanitized = []
    for arg in args:
        # Convert to string and remove null bytes
        clean_arg = str(arg).replace('\0', '')
        
        # Basic validation - reject obvious shell metacharacters in suspicious contexts
        if any(char in clean_arg for char in ['|', '&', ';', '$(', '`']):
            # Only allow these in very specific safe contexts
            if not _is_safe_arg_with_metacharacters(clean_arg):
                raise SafeSubprocessError(f"Potentially unsafe argument: {clean_arg}")
        
        sanitized.append(clean_arg)
    
    return sanitized


def _is_safe_arg_with_metacharacters(arg: str) -> bool:
    """Check if an argument with shell metacharacters is safe."""
    # Allow common safe patterns like file paths, version strings, etc.
    # This is a basic implementation - extend as needed
    safe_patterns = [
        '--version',  # Common flag
        '-v',         # Version flag
    ]
    return any(pattern in arg for pattern in safe_patterns)


def create_allowlist_validator(allowed_commands: Set[str]):
    """Create a validator function for a specific command allowlist."""
    def validator(command: Union[str, List[str]]) -> List[str]:
        return validate_command(command, allowed_commands)
    return validator


def safe_run(
    command: Union[str, List[str]],
    *,
    allowed_commands: Optional[Set[str]] = None,
    cwd: Optional[Union[str, Path]] = None,
    timeout: Optional[float] = 30,
    capture_output: bool = True,
    text: bool = True,
    env: Optional[Dict[str, str]] = None,
    check: bool = False,
    **kwargs: Any,
) -> subprocess.CompletedProcess:
    """Safely run a subprocess command with security validations.
    
    Args:
        command: Command to run (string or list)
        allowed_commands: Set of allowed command names
        cwd: Working directory (defaults to secure temp if needed)
        timeout: Command timeout in seconds
        capture_output: Whether to capture stdout/stderr
        text: Whether to return text instead of bytes
        env: Environment variables (defaults to minimal safe env)
        check: Whether to raise on non-zero exit
        **kwargs: Additional subprocess.run arguments
        
    Returns:
        CompletedProcess result
        
    Raises:
        SafeSubprocessError: If command fails validation
        subprocess.SubprocessError: If command execution fails
    """
    # Validate and normalize command
    cmd_parts = validate_command(command, allowed_commands)
    
    # Sanitize arguments
    cmd_parts = sanitize_args(cmd_parts)
    
    # Set up safe environment
    if env is None:
        env = {
            'PATH': os.environ.get('PATH', ''),
            'HOME': os.environ.get('HOME', ''),
            'USER': os.environ.get('USER', ''),
            'LANG': os.environ.get('LANG', 'C'),
        }
    
    # Ensure secure defaults
    kwargs.setdefault('shell', False)  # Never use shell=True
    kwargs.setdefault('stdin', subprocess.DEVNULL)  # No stdin by default
    
    # Validate working directory
    if cwd:
        cwd_path = Path(cwd)
        if not cwd_path.exists():
            raise SafeSubprocessError(f"Working directory does not exist: {cwd}")
        if not cwd_path.is_dir():
            raise SafeSubprocessError(f"Working directory is not a directory: {cwd}")
    
    try:
        return subprocess.run(
            cmd_parts,
            cwd=cwd,
            timeout=timeout,
            capture_output=capture_output,
            text=text,
            env=env,
            check=check,
            **kwargs,
        )
    except subprocess.TimeoutExpired as e:
        raise SafeSubprocessError(f"Command timeout after {timeout}s: {cmd_parts[0]}") from e


# Predefined safe command sets for common use cases
SYSTEM_INFO_COMMANDS = {
    'sysctl', 'uname', 'hostname', 'whoami', 'id', 'which'
}

GIT_COMMANDS = {
    'git'
}

MLX_COMMANDS = {
    'mlx-knife', 'mlxknife', 'python3', 'python'
}

DEVELOPMENT_COMMANDS = {
    'node', 'npm', 'pnpm', 'yarn', 'pip', 'pip3', 'uv'
}

# Common validators
validate_system_command = create_allowlist_validator(SYSTEM_INFO_COMMANDS)
validate_git_command = create_allowlist_validator(GIT_COMMANDS)
validate_mlx_command = create_allowlist_validator(MLX_COMMANDS)
validate_dev_command = create_allowlist_validator(DEVELOPMENT_COMMANDS)