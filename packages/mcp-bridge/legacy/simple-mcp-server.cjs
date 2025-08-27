#!/usr/bin/env node

const express = require("express");
const { execSync } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 7100;

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "cortex-mcp-server",
    version: "1.0.0",
  });
});

// Git operations handler
app.post("/git/:operation", async (req, res) => {
  const { operation } = req.params;
  const { args = [], cwd = process.cwd() } = req.body;

  try {
    let result;

    switch (operation) {
      case "status":
        result = execSync("git status --porcelain", {
          cwd,
          encoding: "utf8",
          timeout: 10000,
        });
        break;

      case "diff":
        const diffArgs = args.length ? args.join(" ") : "--cached";
        result = execSync(`git diff ${diffArgs}`, {
          cwd,
          encoding: "utf8",
          timeout: 10000,
        });
        break;

      case "add":
        const addArgs = args.length ? args.join(" ") : ".";
        result = execSync(`git add ${addArgs}`, {
          cwd,
          encoding: "utf8",
          timeout: 10000,
        });
        break;

      case "commit":
        const message = args[0] || "Automated commit via MCP";
        result = execSync("git", ["commit", "-m", message], {
          cwd,
          encoding: "utf8",
          timeout: 10000,
        });
        break;

      case "log":
        const logArgs = args.length ? args.join(" ") : "--oneline -10";
        result = execSync(`git log ${logArgs}`, {
          cwd,
          encoding: "utf8",
          timeout: 10000,
        });
        break;

      default:
        return res.status(400).json({
          error: "Unsupported git operation",
          supported: ["status", "diff", "add", "commit", "log"],
        });
    }

    res.json({
      success: true,
      operation,
      result: result.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Git ${operation} error:`, error.message);

    res.status(500).json({
      success: false,
      operation,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Cortex-specific operations
app.post("/cortex/:operation", async (req, res) => {
  const { operation } = req.params;
  const { args = [], cwd = process.cwd() } = req.body;

  try {
    let result;

    switch (operation) {
      case "build":
        result = execSync("pnpm build", {
          cwd,
          encoding: "utf8",
          timeout: 60000,
        });
        break;

      case "test":
        const testArgs = args.length ? args.join(" ") : "";
        result = execSync(`pnpm test ${testArgs}`, {
          cwd,
          encoding: "utf8",
          timeout: 60000,
        });
        break;

      case "lint":
        result = execSync("pnpm lint", {
          cwd,
          encoding: "utf8",
          timeout: 30000,
        });
        break;

      case "structure-validate":
        result = execSync("pnpm structure:validate", {
          cwd,
          encoding: "utf8",
          timeout: 30000,
        });
        break;

      default:
        return res.status(400).json({
          error: "Unsupported cortex operation",
          supported: ["build", "test", "lint", "structure-validate"],
        });
    }

    res.json({
      success: true,
      operation,
      result: result.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Cortex ${operation} error:`, error.message);

    res.status(500).json({
      success: false,
      operation,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// File operations
app.post("/files/:operation", async (req, res) => {
  const { operation } = req.params;
  const { path: filePath, content, cwd = process.cwd() } = req.body;

  if (!filePath) {
    return res.status(400).json({
      error: "File path is required",
    });
  }

  try {
    const fs = require("fs");
    const fullPath = path.resolve(cwd, filePath);

    let result;

    switch (operation) {
      case "read":
        result = fs.readFileSync(fullPath, "utf8");
        break;

      case "write":
        if (!content) {
          return res.status(400).json({
            error: "Content is required for write operations",
          });
        }
        fs.writeFileSync(fullPath, content, "utf8");
        result = "File written successfully";
        break;

      case "exists":
        result = fs.existsSync(fullPath);
        break;

      default:
        return res.status(400).json({
          error: "Unsupported file operation",
          supported: ["read", "write", "exists"],
        });
    }

    res.json({
      success: true,
      operation,
      path: filePath,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`File ${operation} error:`, error.message);

    res.status(500).json({
      success: false,
      operation,
      path: filePath,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cortex MCP Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(
    `🔧 Git operations: POST http://localhost:${PORT}/git/:operation`,
  );
  console.log(
    `⚙️  Cortex operations: POST http://localhost:${PORT}/cortex/:operation`,
  );
  console.log(
    `📁 File operations: POST http://localhost:${PORT}/files/:operation`,
  );
});
