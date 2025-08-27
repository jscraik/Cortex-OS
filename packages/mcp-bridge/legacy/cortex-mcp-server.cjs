#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

// MCP JSON-RPC implementation
class MCPServer {
  constructor() {
    this.methods = {
      initialize: this.initialize.bind(this),
      "git/status": this.gitStatus.bind(this),
      "git/diff": this.gitDiff.bind(this),
      "git/add": this.gitAdd.bind(this),
      "git/commit": this.gitCommit.bind(this),
      "git/log": this.gitLog.bind(this),
      "cortex/build": this.cortexBuild.bind(this),
      "cortex/test": this.cortexTest.bind(this),
      "cortex/lint": this.cortexLint.bind(this),
      "cortex/structure-validate": this.cortexStructureValidate.bind(this),
    };
  }

  async initialize(params) {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: "cortex-operations",
        version: "1.0.0",
      },
    };
  }

  async gitStatus(params) {
    try {
      const result = execSync("git status --porcelain", {
        encoding: "utf8",
        timeout: 10000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async gitDiff(params) {
    try {
      const args = params?.args || ["--cached"];
      const result = execSync(`git diff ${args.join(" ")}`, {
        encoding: "utf8",
        timeout: 10000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async gitAdd(params) {
    try {
      const args = params?.args || ["."];
      const result = execSync(`git add ${args.join(" ")}`, {
        encoding: "utf8",
        timeout: 10000,
      });
      return { success: true, result: "Files added successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async gitCommit(params) {
    try {
      const message = params?.message || "Automated commit via MCP";
      const result = execSync(`git commit -m "${message}"`, {
        encoding: "utf8",
        timeout: 10000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async gitLog(params) {
    try {
      const args = params?.args || ["--oneline", "-10"];
      const result = execSync(`git log ${args.join(" ")}`, {
        encoding: "utf8",
        timeout: 10000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cortexBuild(params) {
    try {
      const result = execSync("pnpm build", {
        encoding: "utf8",
        timeout: 60000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cortexTest(params) {
    try {
      const args = params?.args || [];
      const result = execSync(`pnpm test ${args.join(" ")}`, {
        encoding: "utf8",
        timeout: 60000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cortexLint(params) {
    try {
      const result = execSync("pnpm lint", {
        encoding: "utf8",
        timeout: 30000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cortexStructureValidate(params) {
    try {
      const result = execSync("pnpm structure:validate", {
        encoding: "utf8",
        timeout: 30000,
      });
      return { success: true, result: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    if (!this.methods[method]) {
      return {
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }

    try {
      const result = await this.methods[method](params);
      return {
        id,
        result,
      };
    } catch (error) {
      return {
        id,
        error: {
          code: -32603,
          message: error.message,
        },
      };
    }
  }

  start() {
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", () => {
      const chunk = process.stdin.read();
      if (chunk !== null) {
        const lines = chunk.split("\n").filter((line) => line.trim());
        for (const line of lines) {
          try {
            const request = JSON.parse(line);
            this.handleRequest(request).then((response) => {
              process.stdout.write(JSON.stringify(response) + "\n");
            });
          } catch (error) {
            process.stderr.write(`Invalid JSON: ${error.message}\n`);
          }
        }
      }
    });

    process.stdin.on("end", () => {
      process.exit(0);
    });

    console.error("Cortex MCP Server started - listening on stdin");
  }
}

// Start the server
const server = new MCPServer();
server.start();
