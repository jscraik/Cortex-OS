/**
 * @file Project Management Commands
 * @description Enterprise project management command implementations
 * @split_from enterprise.ts
 */

import type { Command, CommandContext } from "../../cli-core.js";
import { success, error, warning, info } from "../../cli-core.js";
import colors from "chalk";
import { ProjectManager, Project } from "../../../enterprise/project-manager.js";

const { bold, blue, green, yellow, red, cyan, magenta } = colors;

let projectManager: ProjectManager | null = null;

async function getProjectManager(): Promise<ProjectManager> {
  if (!projectManager) {
    projectManager = new ProjectManager();
    await projectManager.initialize();
  }
  return projectManager;
}

export const projectCommands: Command = {
  name: "project",
  description: "Enterprise project management with lifecycle tracking",
  options: [
    {
      name: "verbose",
      short: "v",
      description: "Enable verbose output",
      type: "boolean",
    },
  ],
  action: async (ctx: CommandContext) => {
    const subcommand = ctx.args[0];
    const manager = await getProjectManager();

    switch (subcommand) {
      case "create": {
        const name = ctx.args[1];
        if (!name) {
          error("Usage: project create <name> [options]");
          break;
        }

        try {
          const project = await manager.createProject({
            name,
            description:
              (ctx.flags.description as string) || `Project: ${name}`,
            type: (ctx.flags.type as any) || "custom",
            priority: (ctx.flags.priority as any) || "medium",
            owner: (ctx.flags.owner as string) || "system",
            stakeholders: ctx.flags.stakeholders
              ? (ctx.flags.stakeholders as string).split(",")
              : [],
          });

          success(`Project created: ${project.name}`);
          console.log(`${blue("ID:")} ${project.id}`);
          console.log(`${blue("Type:")} ${project.type}`);
          console.log(`${blue("Priority:")} ${project.priority}`);
          console.log(`${blue("Owner:")} ${project.owner}`);

          if (ctx.flags.verbose) {
            console.log(
              `${blue("Timeline:")} ${project.timeline.plannedStart.toLocaleDateString()} - ${project.timeline.plannedEnd.toLocaleDateString()}`,
            );
            console.log(
              `${blue("Budget:")} ${project.budget.total} ${project.budget.currency}`,
            );
          }
        } catch (err) {
          error(`Failed to create project: ${(err as Error).message}`);
        }
        break;
      }

      case "list": {
        try {
          const filters: any = {};
          if (ctx.flags.status) filters.status = ctx.flags.status;
          if (ctx.flags.type) filters.type = ctx.flags.type;
          if (ctx.flags.priority) filters.priority = ctx.flags.priority;
          if (ctx.flags.owner) filters.owner = ctx.flags.owner;

          const projects = await manager.listProjects(filters);

          if (projects.length === 0) {
            info("No projects found");
            break;
          }

          success(`Found ${projects.length} projects:`);
          console.log();

          for (const project of projects) {
            const statusColor =
              project.status === "active"
                ? green
                : project.status === "completed"
                  ? blue
                  : project.status === "on-hold"
                    ? yellow
                    : red;

            console.log(
              `${bold(project.name)} ${cyan(`(${project.id.substr(0, 8)}...)`)}`,
            );
            console.log(
              `  Status: ${statusColor(project.status)} | Type: ${project.type} | Priority: ${project.priority}`,
            );
            console.log(
              `  Owner: ${project.owner} | Updated: ${project.updatedAt.toLocaleDateString()}`,
            );

            if (ctx.flags.verbose) {
              const progress = manager["calculateProjectProgress"]
                ? await (manager as any).calculateProjectProgress(project)
                : 0;
              console.log(
                `  Progress: ${progress.toFixed(1)}% | Phases: ${project.phases.length}`,
              );
              console.log(
                `  Budget: ${project.budget.spent}/${project.budget.total} ${project.budget.currency}`,
              );
            }
            console.log();
          }
        } catch (err) {
          error(`Failed to list projects: ${(err as Error).message}`);
        }
        break;
      }

      case "show": {
        const projectId = ctx.args[1];
        if (!projectId) {
          error("Usage: project show <project-id>");
          break;
        }

        try {
          const project = await manager.getProject(projectId);
          if (!project) {
            error(`Project not found: ${projectId}`);
            break;
          }

          success(`Project: ${project.name}`);
          console.log();
          console.log(`${blue("ID:")} ${project.id}`);
          console.log(`${blue("Description:")} ${project.description}`);
          console.log(`${blue("Type:")} ${project.type}`);
          console.log(`${blue("Status:")} ${project.status}`);
          console.log(`${blue("Priority:")} ${project.priority}`);
          console.log(`${blue("Owner:")} ${project.owner}`);
          console.log(
            `${blue("Created:")} ${project.createdAt.toLocaleDateString()}`,
          );
          console.log(
            `${blue("Updated:")} ${project.updatedAt.toLocaleDateString()}`,
          );

          console.log(`\n${bold("Timeline:")}`);
          console.log(
            `  Planned: ${project.timeline.plannedStart.toLocaleDateString()} - ${project.timeline.plannedEnd.toLocaleDateString()}`,
          );
          if (project.timeline.actualStart) {
            console.log(
              `  Actual: ${project.timeline.actualStart.toLocaleDateString()} - ${project.timeline.actualEnd?.toLocaleDateString() || "In Progress"}`,
            );
          }

          console.log(`\n${bold("Budget:")}`);
          console.log(
            `  Total: ${project.budget.total} ${project.budget.currency}`,
          );
          console.log(
            `  Spent: ${project.budget.spent} ${project.budget.currency}`,
          );
          console.log(
            `  Remaining: ${project.budget.remaining} ${project.budget.currency}`,
          );

          if (project.phases.length > 0) {
            console.log(`\n${bold("Phases:")}`);
            for (const phase of project.phases) {
              const statusColor =
                phase.status === "completed"
                  ? green
                  : phase.status === "in-progress"
                    ? yellow
                    : phase.status === "blocked"
                      ? red
                      : blue;
              console.log(
                `  ${statusColor(phase.status.padEnd(12))} ${phase.name} (${phase.completionPercentage}%)`,
              );
            }
          }

          if (project.collaboration.teamMembers.length > 0) {
            console.log(`\n${bold("Team Members:")}`);
            for (const member of project.collaboration.teamMembers) {
              console.log(
                `  ${member.name} (${member.role}) - ${member.availability}% available`,
              );
            }
          }
        } catch (err) {
          error(`Failed to show project: ${(err as Error).message}`);
        }
        break;
      }

      case "metrics": {
        try {
          const projectId = ctx.args[1];
          const metrics = await manager.getProjectMetrics(projectId);

          success("Project Metrics:");
          console.log();
          console.log(`${blue("Total Projects:")} ${metrics.totalProjects}`);
          console.log(
            `${blue("Active Projects:")} ${metrics.activeProjects}`,
          );
          console.log(
            `${blue("Completed Projects:")} ${metrics.completedProjects}`,
          );
          console.log(
            `${blue("Average Duration:")} ${metrics.averageProjectDuration.toFixed(1)} days`,
          );
          console.log(
            `${blue("Budget Variance:")} ${(metrics.budgetVariance * 100).toFixed(1)}%`,
          );
          console.log(
            `${blue("Resource Utilization:")} ${(metrics.resourceUtilization * 100).toFixed(1)}%`,
          );
          console.log(
            `${blue("Quality Score:")} ${metrics.qualityScore.toFixed(1)}%`,
          );
        } catch (err) {
          error(`Failed to get metrics: ${(err as Error).message}`);
        }
        break;
      }

      case "report": {
        const projectId = ctx.args[1];
        const reportType = (ctx.args[2] as any) || "status";

        if (!projectId) {
          error("Usage: project report <project-id> [type]");
          break;
        }

        try {
          const report = await manager.generateReport(projectId, reportType);

          success(`Generated ${reportType} report: ${report.title}`);
          console.log();
          console.log(`${blue("Summary:")} ${report.summary}`);
          console.log(
            `${blue("Generated:")} ${report.generatedAt.toLocaleDateString()}`,
          );

          if (ctx.flags.verbose && Object.keys(report.details).length > 0) {
            console.log(`\n${bold("Details:")}`);
            console.log(JSON.stringify(report.details, null, 2));
          }

          if (report.recommendations.length > 0) {
            console.log(`\n${bold("Recommendations:")}`);
            for (const rec of report.recommendations) {
              console.log(`  • ${rec}`);
            }
          }
        } catch (err) {
          error(`Failed to generate report: ${(err as Error).message}`);
        }
        break;
      }

      default: {
        console.log(`${bold("Available subcommands:")}`);
        console.log("  create <name>     Create a new project");
        console.log("  list              List all projects");
        console.log("  show <id>         Show project details");
        console.log("  metrics [id]      Show project metrics");
        console.log("  report <id> [type] Generate project report");
        console.log();
        console.log(`${bold("Examples:")}`);
        console.log(
          `  ${cyan("claude-flow project create")} "E-commerce Platform" --type web-app --priority high`,
        );
        console.log(
          `  ${cyan("claude-flow project list")} --status active --verbose`,
        );
        console.log(
          `  ${cyan("claude-flow project report")} proj-123 financial`,
        );
        break;
      }
    }
  },
};