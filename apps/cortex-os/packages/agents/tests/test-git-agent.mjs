#!/usr/bin/env node

// Simple test to verify git.commit returns {ok: true}
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Mock zx before importing
const mockExec = () =>
  Promise.resolve({
    stdout: "[main abc1234] Test commit\n 1 file changed, 1 insertion(+)",
    stderr: "",
    exitCode: 0,
  });

// Mock the zx module
const originalConsole = console.log;
console.log = () => {}; // Suppress logs during import

const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "zx") {
    return { $: mockExec };
  }
  return originalRequire.apply(this, arguments);
};

// Now import and test
import("../agents/local/git.js")
  .then(async (gitModule) => {
    console.log = originalConsole; // Restore console

    const { handler } = gitModule;

    const request = {
      action: "git.commit",
      params: {
        message: "Test commit message",
        includeUntracked: true,
      },
      id: "test-commit",
      timestamp: Date.now(),
    };

    try {
      const response = await handler(request);

      console.log("✅ Git Agent Test Results:");
      console.log(`Response ok: ${response.ok}`);
      console.log(`Response:`, JSON.stringify(response, null, 2));

      if (response.ok) {
        console.log("🎉 SUCCESS: git.commit returns {ok: true}");
        console.log(`Commit hash: ${response.result.hash}`);
        console.log(`Commit message: ${response.result.message}`);
      } else {
        console.log("❌ FAILED: git.commit returned {ok: false}");
        console.log(`Error: ${response.error}`);
      }
    } catch (error) {
      console.log("❌ ERROR running git agent:", error.message);
    }
  })
  .catch((error) => {
    console.log("❌ ERROR importing git agent:", error.message);
  });
