# Introduction

`cortex-mcp-bridge` solves the gap between local MCP clients and remote HTTP services. It reads JSON lines from standard input, forwards them as HTTP POST requests, and can subscribe to Server-Sent Events to feed responses back to the client. The bridge provides lightweight flow control so that high-volume streams remain reliable.
