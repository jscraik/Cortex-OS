/**
 * Claude instance management commands
 */
import { promises as fs } from "node:fs";

import chalk from "chalk";
import { Command } from "commander";
import { spawn } from "node:child_process";
import { generateId } from "../../utils/helpers.js";
import { PermissionEngine } from "@cortex-os/core";

export const claudeCommand = new Command()
  .name("claude")
  .description("Manage Claude instances")
  .action(() => {
    claudeCommand.help();
  });

// Spawn command
claudeCommand
  .command("spawn")
  .description("Spawn a new Claude instance with specific configuration")
  .arguments("<task>")
  .option(
    "-t, --tools <tools>",
    "Allowed tools (comma-separated)",
    "View,Edit,Replace,GlobTool,GrepTool,LS,Bash",
  )
  .option("--no-permissions", "Use --dangerously-skip-permissions flag")
  .option("-c, --config <config>", "MCP config file path")
  .option(
    "-m, --mode <mode>",
    "Development mode (full, backend-only, frontend-only, api-only)",
    "full",
  )
  .option("--parallel", "Enable parallel execution with BatchTool")
  .option("--research", "Enable web research with WebFetchTool")
  .option("--coverage <coverage>", "Test coverage target", "80")
  .option(
    "--commit <frequency>",
    "Commit frequency (phase, feature, manual)",
    "phase",
  )
  .option("-v, --verbose", "Enable verbose output")
  .option("--dry-run", "Show what would be executed without running")
  .action(async (task: string, options: any) => {
    try {
      const instanceId = generateId("claude");

      // Build allowed tools list
      let tools = options.tools;
      if (options.parallel && !tools.includes("BatchTool")) {
        tools += ",BatchTool,dispatch_agent";
      }
      if (options.research && !tools.includes("WebFetchTool")) {
        tools += ",WebFetchTool";
      }

      // Build Claude command
      const claudeArgs = [task];
      claudeArgs.push("--allowedTools", tools);

      if (options.noPermissions) {
        claudeArgs.push("--dangerously-skip-permissions");
      }

      if (options.config) {
        claudeArgs.push("--mcp-config", options.config);
      }

      if (options.verbose) {
        claudeArgs.push("--verbose");
      }

      if (options.dryRun) {
        console.log(chalk.yellow("DRY RUN - Would execute:"));
        console.log(chalk.gray(`claude ${claudeArgs.join(" ")}`));
        console.log("\nConfiguration:");
        console.log(`  Instance ID: ${instanceId}`);
        console.log(`  Task: ${task}`);
        console.log(`  Tools: ${tools}`);
        console.log(`  Mode: ${options.mode}`);
        console.log(`  Coverage: ${parseInt(options.coverage)}%`);
        console.log(`  Commit: ${options.commit}`);
        return;
      }

      const description = `claude ${claudeArgs.join(" ")}`;
      const { executed } = await PermissionEngine.guardShell(
        description,
        async () => {
          console.log(chalk.green(`Spawning Claude instance: ${instanceId}`));
          console.log(chalk.gray(`Task: ${task}`));
          console.log(chalk.gray(`Tools: ${tools}`));
          const child = spawn("claude", claudeArgs, {
            stdio: "inherit",
            env: {
              ...process.env,
              CLAUDE_INSTANCE_ID: instanceId,
              CLAUDE_FLOW_MODE: options.mode,
              CLAUDE_FLOW_COVERAGE: parseInt(options.coverage).toString(),
              CLAUDE_FLOW_COMMIT: options.commit,
            },
          });
          return await new Promise<number>((resolve, reject) => {
            child.on("error", (err) => reject(err));
            child.on("exit", (code) => resolve(code ?? 1));
          });
        },
      );

      if (!executed) return;
    } catch (error) {
      console.error(
        chalk.red("Failed to spawn Claude:"),
        (error as Error).message,
      );
    }
  });

// Batch command
claudeCommand
  .command("batch")
  .description("Spawn multiple Claude instances from workflow")
  .arguments("<workflow-file>")
  .option("--dry-run", "Show what would be executed without running")
  .action(async (workflowFile: string, options: any) => {
    try {
      const content = await fs.readFile(workflowFile, "utf-8");
      const workflow = JSON.parse(content);

      console.log(chalk.green("Loading workflow:"), workflow.name || "Unnamed");
      console.log(chalk.gray(`Tasks: ${workflow.tasks?.length || 0}`));

      if (!workflow.tasks || workflow.tasks.length === 0) {
        console.log(chalk.yellow("No tasks found in workflow"));
        return;
      }

      for (const task of workflow.tasks) {
        const claudeArgs = [task.description || task.name];

        // Add tools
        if (task.tools) {
          claudeArgs.push(
            "--allowedTools",
            Array.isArray(task.tools) ? task.tools.join(",") : task.tools,
          );
        }

        // Add flags
        if (task.skipPermissions) {
          claudeArgs.push("--dangerously-skip-permissions");
        }

        if (task.config) {
          claudeArgs.push("--mcp-config", task.config);
        }

        if (options.dryRun) {
          console.log(
            chalk.yellow(`\nDRY RUN - Task: ${task.name || task.id}`),
          );
          console.log(chalk.gray(`claude ${claudeArgs.join(" ")}`));
        } else {
          const description = `claude ${claudeArgs.join(" ")}`;
          const { executed } = await PermissionEngine.guardShell(
            description,
            async () => {
              console.log(
                chalk.blue(
                  `\nSpawning Claude for task: ${task.name || task.id}`,
                ),
              );
              const child = spawn("claude", claudeArgs, {
                stdio: "inherit",
                env: {
                  ...process.env,
                  CLAUDE_TASK_ID: task.id || generateId("task"),
                  CLAUDE_TASK_TYPE: task.type || "general",
                },
              });
              if (!workflow.parallel) {
                await new Promise((resolve) => child.on("exit", resolve));
              }
              return 0;
            },
          );
          if (!executed) continue;
        }
      }

      if (!options.dryRun && workflow.parallel) {
        console.log(
          chalk.green("\nAll Claude instances spawned in parallel mode"),
        );
      }
    } catch (error) {
      console.error(
        chalk.red("Failed to process workflow:"),
        (error as Error).message,
      );
    }
  });
