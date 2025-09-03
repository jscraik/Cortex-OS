# Cortex-OS Binary Files

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains executable binary files and command-line utilities for the Cortex-OS project.

## Contents

### Command-Line Interface

- `cortex` - Main Cortex-OS command-line interface executable

### Binary Types

- **CLI Tools** - Command-line interface executables
- **Utility Binaries** - System utility programs
- **Helper Scripts** - Executable helper scripts
- **Platform Binaries** - Platform-specific executables

## Usage

### Cortex CLI

The main Cortex CLI provides access to all Cortex-OS functionality:

```bash
# Make executable (if needed)
chmod +x bin/cortex

# Run Cortex CLI
./bin/cortex --help

# Add to PATH for global access
export PATH="$PWD/bin:$PATH"
cortex --help
```

### Available Commands

The Cortex CLI typically provides:

- **Agent Management** - Create, configure, and manage agents
- **Memory Operations** - Memory storage and retrieval
- **Service Control** - Start, stop, and monitor services
- **Development Tools** - Development and debugging utilities

## Installation

### Local Installation

```bash
# Make binaries executable
chmod +x bin/*

# Add to your shell profile for permanent access
echo 'export PATH="'$PWD'/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Global Installation

```bash
# Copy to system binary directory
sudo cp bin/cortex /usr/local/bin/

# Or create symbolic link
sudo ln -s $PWD/bin/cortex /usr/local/bin/cortex
```

## Development

### Building Binaries

Binaries are typically built from source code in:

- [Applications](/apps/README.md) - Main application source
- [Packages](/packages/README.md) - Core package implementations

### Build Process

```bash
# Build all applications
pnpm build

# Build specific application
pnpm build:cortex-cli

# Copy built binaries to bin/
cp apps/cortex-cli/dist/cortex bin/
```

## Platform Support

### Supported Platforms

- **macOS** - Intel and Apple Silicon
- **Linux** - x86_64 and ARM64
- **Windows** - x86_64 (via WSL recommended)

### Platform-Specific Binaries

Different platforms may have:

- Different executable formats (.exe on Windows)
- Platform-specific optimizations
- Architecture-specific builds

## Security

### Binary Verification

- **Checksums** - Verify binary integrity
- **Code Signing** - Verify binary authenticity
- **Permission Management** - Appropriate file permissions
- **Security Scanning** - Regular security analysis

### Safe Execution

- Run binaries with appropriate permissions
- Verify binary sources before execution
- Use sandboxing when appropriate
- Monitor binary behavior

## Troubleshooting

### Common Issues

- **Permission Denied** - Check file permissions with `chmod +x`
- **Command Not Found** - Ensure binary is in PATH
- **Architecture Mismatch** - Verify binary matches system architecture
- **Library Dependencies** - Check required system libraries

### Debugging

```bash
# Check binary information
file bin/cortex
ldd bin/cortex  # Linux
otool -L bin/cortex  # macOS

# Check permissions
ls -la bin/

# Test execution
./bin/cortex --version
```

## Related Documentation

- [CLI Documentation](/apps/cortex-cli/README.md)
- [Build Process](/docs/)
- [Development Setup](/.github/copilot-instructions.md)
- [Installation Guide](/README.md)
