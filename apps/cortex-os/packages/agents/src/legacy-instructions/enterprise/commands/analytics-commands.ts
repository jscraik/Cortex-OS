/**
 * @file Analytics Management Commands
 * @description Performance analytics and business intelligence command implementations
 * @split_from enterprise.ts
 */

import type { Command, CommandContext } from "../../cli-core.js";
import { success, error, warning, info } from "../../cli-core.js";
import colors from "chalk";
import { AnalyticsManager } from "../../../enterprise/analytics-manager.js";

const { bold, blue, green, yellow, red, cyan, magenta } = colors;

let analyticsManager: AnalyticsManager | null = null;

async function getAnalyticsManager(): Promise<AnalyticsManager> {
  if (!analyticsManager) {
    analyticsManager = new AnalyticsManager();
    await analyticsManager.initialize();
  }
  return analyticsManager;
}

export const analyticsCommands: Command = {
  name: "analytics",
  description:
    "Performance analytics, usage insights, and predictive optimization",
  options: [
    {
      name: "timerange",
      short: "t",
      description: "Time range for analysis (1h, 24h, 7d, 30d)",
      type: "string",
    },
    {
      name: "format",
      short: "f",
      description: "Output format (json, table, chart)",
      type: "string",
    },
  ],
  action: async (ctx: CommandContext) => {
    const subcommand = ctx.args[0];
    const manager = await getAnalyticsManager();

    switch (subcommand) {
      case "dashboard": {
        const dashboardCmd = ctx.args[1];

        switch (dashboardCmd) {
          case "create": {
            const name = ctx.args[2];
            if (!name) {
              error("Usage: analytics dashboard create <name> --type <type>");
              break;
            }

            try {
              const dashboard = await manager.createDashboard({
                name,
                description:
                  ctx.args.slice(3).join(" ") || `Dashboard: ${name}`,
                type: (ctx.flags.type as any) || "operational",
                widgets: [], // Would be populated based on template
              });

              success(`Dashboard created: ${dashboard.name}`);
              console.log(`${blue("ID:")} ${dashboard.id}`);
              console.log(`${blue("Type:")} ${dashboard.type}`);
              console.log(`${blue("Widgets:")} ${dashboard.widgets.length}`);
            } catch (err) {
              error(`Failed to create dashboard: ${(err as Error).message}`);
            }
            break;
          }

          case "list": {
            // Would implement dashboard listing
            info("Dashboard listing not yet implemented");
            break;
          }

          default: {
            console.log("Available dashboard subcommands: create, list");
            break;
          }
        }
        break;
      }

      case "insights": {
        try {
          const scope: any = {};
          if (ctx.flags.metrics) {
            scope.metrics = (ctx.flags.metrics as string).split(",");
          }
          if (ctx.flags.timerange) {
            const range = ctx.flags.timerange as string;
            const now = new Date();
            let start: Date;

            switch (range) {
              case "1h":
                start = new Date(now.getTime() - 60 * 60 * 1000);
                break;
              case "24h":
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
              case "7d":
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case "30d":
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              default:
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }

            scope.timeRange = { start, end: now };
          }

          const insights = await manager.generateInsights(scope);

          if (insights.length === 0) {
            info("No insights generated");
            break;
          }

          success(`Generated ${insights.length} insights:`);
          console.log();

          for (const insight of insights) {
            const priorityColor =
              insight.priority === "critical"
                ? red
                : insight.priority === "high"
                  ? yellow
                  : insight.priority === "medium"
                    ? blue
                    : green;

            console.log(
              `${bold(insight.title)} ${priorityColor(`[${insight.priority.toUpperCase()}]`)}`,
            );
            console.log(`  ${insight.description}`);
            console.log(
              `  Type: ${insight.type} | Category: ${insight.category} | Confidence: ${insight.confidence}%`,
            );

            if (insight.recommendations.length > 0) {
              console.log(`  Recommendations:`);
              for (const rec of insight.recommendations) {
                console.log(`    • ${rec.action} (${rec.effort} effort)`);
              }
            }
            console.log();
          }
        } catch (err) {
          error(`Failed to generate insights: ${(err as Error).message}`);
        }
        break;
      }

      case "metrics": {
        const metricType = ctx.args[1] || "performance";

        try {
          switch (metricType) {
            case "performance": {
              const metrics = await manager.getPerformanceMetrics();

              success("Performance Metrics:");
              console.log();
              console.log(`${bold("System:")}`);
              console.log(
                `  CPU Usage: ${metrics.system.cpu.usage.toFixed(1)}%`,
              );
              console.log(
                `  Memory Usage: ${metrics.system.memory.usage.toFixed(1)}%`,
              );
              console.log(
                `  Disk Usage: ${metrics.system.disk.usage.toFixed(1)}%`,
              );

              console.log(`\n${bold("Application:")}`);
              console.log(
                `  Response Time: ${metrics.application.responseTime.avg.toFixed(1)}ms (avg)`,
              );
              console.log(
                `  Throughput: ${metrics.application.throughput.requestsPerSecond.toFixed(1)} req/s`,
              );
              console.log(
                `  Error Rate: ${metrics.application.errors.rate.toFixed(2)}%`,
              );
              console.log(
                `  Availability: ${metrics.application.availability.uptime.toFixed(2)}%`,
              );

              console.log(`\n${bold("Database:")}`);
              console.log(
                `  Active Connections: ${metrics.database.connections.active}`,
              );
              console.log(
                `  Avg Query Time: ${metrics.database.queries.avgExecutionTime.toFixed(1)}ms`,
              );
              console.log(
                `  Slow Queries: ${metrics.database.queries.slowQueries}`,
              );
              break;
            }

            case "usage": {
              const metrics = await manager.getUsageMetrics();

              success("Usage Metrics:");
              console.log();
              console.log(`${bold("Users:")}`);
              console.log(`  Total: ${metrics.users.total}`);
              console.log(`  Active: ${metrics.users.active}`);
              console.log(`  New: ${metrics.users.new}`);
              console.log(`  Churn: ${metrics.users.churn}`);

              console.log(`\n${bold("Sessions:")}`);
              console.log(`  Total: ${metrics.sessions.total}`);
              console.log(
                `  Avg Duration: ${(metrics.sessions.duration.avg / 60).toFixed(1)} minutes`,
              );
              console.log(`  Bounce Rate: ${metrics.sessions.bounceRate}%`);

              console.log(`\n${bold("API:")}`);
              console.log(`  Calls: ${metrics.api.calls.toLocaleString()}`);
              console.log(
                `  Unique Consumers: ${metrics.api.uniqueConsumers}`,
              );
              console.log(
                `  Avg Response Time: ${metrics.api.avgResponseTime}ms`,
              );
              console.log(`  Error Rate: ${metrics.api.errorRate}%`);
              break;
            }

            case "business": {
              const metrics = await manager.getBusinessMetrics();

              success("Business Metrics:");
              console.log();
              console.log(`${bold("Revenue:")}`);
              console.log(
                `  Total: $${metrics.revenue.total.toLocaleString()}`,
              );
              console.log(
                `  Recurring: $${metrics.revenue.recurring.toLocaleString()}`,
              );
              console.log(`  Growth: ${metrics.revenue.growth}%`);
              console.log(`  ARPU: $${metrics.revenue.arpu}`);

              console.log(`\n${bold("Customers:")}`);
              console.log(`  Total: ${metrics.customers.total}`);
              console.log(`  New: ${metrics.customers.new}`);
              console.log(`  Churned: ${metrics.customers.churned}`);
              console.log(
                `  Satisfaction: ${metrics.customers.satisfaction}/5`,
              );

              console.log(`\n${bold("Conversion:")}`);
              console.log(`  Leads: ${metrics.conversion.leads}`);
              console.log(`  Qualified: ${metrics.conversion.qualified}`);
              console.log(`  Closed: ${metrics.conversion.closed}`);
              console.log(`  Rate: ${metrics.conversion.rate}%`);
              break;
            }

            default: {
              error(`Unknown metric type: ${metricType}`);
              console.log("Available types: performance, usage, business");
              break;
            }
          }
        } catch (err) {
          error(
            `Failed to get ${metricType} metrics: ${(err as Error).message}`,
          );
        }
        break;
      }

      case "predict": {
        const modelCmd = ctx.args[1];

        switch (modelCmd) {
          case "train": {
            const name = ctx.args[2];
            if (!name) {
              error(
                "Usage: analytics predict train <name> --features <features> --target <target>",
              );
              break;
            }

            try {
              const features = ctx.flags.features
                ? (ctx.flags.features as string).split(",")
                : ["cpu-usage", "memory-usage"];
              const target = (ctx.flags.target as string) || "response-time";

              const model = await manager.trainPredictiveModel({
                name,
                description: `Predictive model: ${name}`,
                type: (ctx.flags.type as any) || "regression",
                algorithm:
                  (ctx.flags.algorithm as string) || "linear-regression",
                features,
                target,
                trainingPeriod: {
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  end: new Date(),
                },
              });

              success(`Predictive model trained: ${model.name}`);
              console.log(`${blue("ID:")} ${model.id}`);
              console.log(`${blue("Type:")} ${model.type}`);
              console.log(`${blue("Algorithm:")} ${model.algorithm}`);
              console.log(
                `${blue("Accuracy:")} ${model.accuracy.toFixed(1)}%`,
              );
              console.log(
                `${blue("Features:")} ${model.features.join(", ")}`,
              );
            } catch (err) {
              error(`Failed to train model: ${(err as Error).message}`);
            }
            break;
          }

          case "predict": {
            const modelId = ctx.args[2];
            if (!modelId) {
              error(
                "Usage: analytics predict predict <model-id> --input <json>",
              );
              break;
            }

            try {
              const input = ctx.flags.input
                ? JSON.parse(ctx.flags.input as string)
                : { "cpu-usage": 50, "memory-usage": 60 };

              const prediction = await manager.makePrediction(modelId, input);

              success(`Prediction made:`);
              console.log(`${blue("Model:")} ${modelId}`);
              console.log(`${blue("Input:")} ${JSON.stringify(input)}`);
              console.log(
                `${blue("Prediction:")} ${JSON.stringify(prediction.prediction)}`,
              );
              console.log(
                `${blue("Confidence:")} ${prediction.confidence.toFixed(1)}%`,
              );
            } catch (err) {
              error(`Failed to make prediction: ${(err as Error).message}`);
            }
            break;
          }

          default: {
            console.log("Available predict subcommands: train, predict");
            break;
          }
        }
        break;
      }

      default: {
        console.log(`${bold("Available subcommands:")}`);
        console.log("  dashboard         Manage analytics dashboards");
        console.log("  insights          Generate automated insights");
        console.log(
          "  metrics <type>    Show metrics (performance, usage, business)",
        );
        console.log(
          "  predict           Predictive modeling and forecasting",
        );
        console.log();
        console.log(`${bold("Examples:")}`);
        console.log(
          `  ${cyan("claude-flow analytics insights")} --timerange 7d`,
        );
        console.log(`  ${cyan("claude-flow analytics metrics")} performance`);
        console.log(
          `  ${cyan("claude-flow analytics predict train")} "load-predictor" --features cpu,memory --target response-time`,
        );
        break;
      }
    }
  },
};