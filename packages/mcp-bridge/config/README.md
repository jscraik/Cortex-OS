# Docker MCP Toolkit Integration

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This project is integrated with the Docker Model Context Protocol (MCP) Toolkit. The MCP gateway allows you to run various third-party services as local development containers.

## Getting Started

1.  **Initialize the Catalog:**
    If you haven't already, initialize the MCP catalog to see the available services.

    ```bash
    docker mcp catalog init
    ```

2.  **List Available Servers:**
    To see a list of all available MCP servers (like Notion, Atlassian, etc.), run:

    ```bash
    docker mcp catalog show docker-mcp
    ```

3.  **Enable Servers:**
    Before you can use a server, you need to enable it. For example, to enable Notion and Atlassian:

    ```bash
    docker mcp server enable notion atlassian
    ```

4.  **Configure Servers:**
    Some servers require configuration (like API keys or hostnames). You can configure them using the `docker mcp config write` command. First, read the current configuration to see the structure:

    ```bash
    docker mcp config read
    ```

    Then, write the new configuration. For example:

    ```bash
    docker mcp config write "
    notion:
      auth: \"YOUR_NOTION_TOKEN\"
    atlassian:
      host: \"https://your-domain.atlassian.net\"
      authentication:
        basic:
          email: \"your-email@example.com\"
          apiToken: \"YOUR_API_TOKEN\"
    "
    ```

5.  **Run the Gateway:**
    To start the MCP gateway and all enabled servers, run:

    ```bash
    docker mcp gateway run
    ```

    The gateway will run in the foreground. You can add `&` to run it in the background.

6.  **Verify Servers are Running:**
    You can check the status of the running containers with:
    ```bash
    docker ps
    ```
