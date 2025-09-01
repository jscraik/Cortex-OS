# Database Files

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains SQLite database files used by the Cortex-OS application.

## Contents

- `ai.sqlite` - Database for AI-related operations and storage
- `default.sqlite` - Default database for general application data

## Usage

These database files are used by the application for persistent storage. They should not be edited manually.

## Development Notes

- Database migrations should be applied through the application's migration system
- For development, you can make a copy of these files as backups before testing potentially destructive operations
- Database schema changes should be accompanied by appropriate migration scripts
