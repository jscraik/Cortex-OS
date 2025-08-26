/**
 * @file Audit Management Commands
 * @description Enterprise audit logging and compliance command implementations
 * @split_from enterprise.ts
 */

import type { Command, CommandContext } from "../../cli-core.js";
import { success, error, warning, info } from "../../cli-core.js";
import colors from "chalk";
import { AuditManager } from "../../../enterprise/audit-manager.js";

const { bold, blue, green, yellow, red, cyan, magenta } = colors;

let auditManager: AuditManager | null = null;

async function getAuditManager(): Promise<AuditManager> {
  if (!auditManager) {
    auditManager = new AuditManager();
    await auditManager.initialize();
  }
  return auditManager;
}

export const auditCommands: Command = {
  name: "audit",
  description: "Enterprise-grade audit logging and compliance reporting",
  options: [
    {
      name: "framework",
      short: "f",
      description: "Compliance framework (SOC2, GDPR, HIPAA, PCI-DSS)",
      type: "string",
    },
    {
      name: "timerange",
      short: "t",
      description: "Time range for audit (1d, 7d, 30d, 90d)",
      type: "string",
    },
    {
      name: "export",
      short: "e",
      description: "Export format (json, csv, pdf)",
      type: "string",
    },
  ],
  action: async (ctx: CommandContext) => {
    const subcommand = ctx.args[0];
    const manager = await getAuditManager();

    switch (subcommand) {
      case "log": {
        const eventType = ctx.args[1];
        const action = ctx.args[2];

        if (!eventType || !action) {
          error(
            "Usage: audit log <event-type> <action> --resource <resource>",
          );
          break;
        }

        try {
          const entry = await manager.logAuditEvent({
            eventType,
            category: (ctx.flags.category as any) || "system-change",
            severity: (ctx.flags.severity as any) || "medium",
            userId: ctx.flags.user as string,
            resource: {
              type: (ctx.flags.resourceType as string) || "system",
              id: (ctx.flags.resourceId as string) || "unknown",
              name: ctx.flags.resourceName as string,
            },
            action,
            outcome: (ctx.flags.outcome as any) || "success",
            details: ctx.flags.details
              ? JSON.parse(ctx.flags.details as string)
              : {},
            context: {
              source: "cli",
              ipAddress: ctx.flags.ip as string,
              userAgent: ctx.flags.userAgent as string,
            },
            compliance: {
              frameworks: ctx.flags.frameworks
                ? (ctx.flags.frameworks as string).split(",")
                : [],
            },
          });

          success(`Audit event logged: ${entry.eventType}`);
          console.log(`${blue("ID:")} ${entry.id}`);
          console.log(`${blue("Category:")} ${entry.category}`);
          console.log(`${blue("Severity:")} ${entry.severity}`);
          console.log(`${blue("Outcome:")} ${entry.outcome}`);
          console.log(
            `${blue("Timestamp:")} ${entry.timestamp.toISOString()}`,
          );
        } catch (err) {
          error(`Failed to log audit event: ${(err as Error).message}`);
        }
        break;
      }

      case "report": {
        const reportType = (ctx.args[1] as any) || "compliance";

        try {
          const timeRange = (ctx.flags.timerange as string) || "30d";
          const now = new Date();
          let start: Date;

          switch (timeRange) {
            case "1d":
              start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case "7d":
              start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "30d":
              start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case "90d":
              start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            default:
              start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          }

          const report = await manager.generateAuditReport({
            title: `${reportType.toUpperCase()} Audit Report`,
            description: `Automated ${reportType} audit report for ${timeRange}`,
            type: reportType,
            scope: {
              timeRange: { start, end: now },
              systems: ["all"],
              users: ["all"],
              events: ["all"],
              compliance: ctx.flags.framework
                ? [ctx.flags.framework as string]
                : [],
            },
          });

          success(`Audit report generated: ${report.title}`);
          console.log(`${blue("ID:")} ${report.id}`);
          console.log(`${blue("Type:")} ${report.type}`);
          console.log(`${blue("Status:")} ${report.status}`);
          console.log(
            `${blue("Events Analyzed:")} ${report.summary.totalEvents}`,
          );
          console.log(
            `${blue("Critical Findings:")} ${report.summary.criticalFindings}`,
          );
          console.log(
            `${blue("Compliance Score:")} ${report.summary.complianceScore.toFixed(1)}%`,
          );
          console.log(`${blue("Risk Level:")} ${report.summary.riskLevel}`);

          if (report.findings.length > 0 && ctx.flags.verbose) {
            console.log(`\n${bold("Findings:")}`);
            for (const finding of report.findings.slice(0, 5)) {
              console.log(
                `  ${finding.severity.toUpperCase()}: ${finding.title}`,
              );
            }
            if (report.findings.length > 5) {
              console.log(`  ... and ${report.findings.length - 5} more`);
            }
          }

          if (report.recommendations.length > 0) {
            console.log(`\n${bold("Recommendations:")}`);
            for (const rec of report.recommendations.slice(0, 3)) {
              console.log(`  • ${rec.title} (${rec.priority} priority)`);
            }
          }
        } catch (err) {
          error(`Failed to generate audit report: ${(err as Error).message}`);
        }
        break;
      }

      case "export": {
        try {
          const format = (ctx.flags.export as any) || "json";
          const timeRange = (ctx.flags.timerange as string) || "30d";
          const now = new Date();
          let start: Date;

          switch (timeRange) {
            case "1d":
              start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case "7d":
              start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "30d":
              start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case "90d":
              start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            default:
              start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          }

          const filepath = await manager.exportAuditData({
            format,
            scope: {
              timeRange: { start, end: now },
              categories: ctx.flags.categories
                ? (ctx.flags.categories as string).split(",")
                : undefined,
              severity: ctx.flags.severity
                ? (ctx.flags.severity as string).split(",")
                : undefined,
            },
            destination: (ctx.flags.output as string) || "./audit-export",
            encryption: (ctx.flags.encrypt as boolean) || false,
            compression: (ctx.flags.compress as boolean) || false,
          });

          success(`Audit data exported: ${filepath}`);
          console.log(`${blue("Format:")} ${format}`);
          console.log(`${blue("Time Range:")} ${timeRange}`);
          console.log(
            `${blue("Encrypted:")} ${ctx.flags.encrypt ? "Yes" : "No"}`,
          );
          console.log(
            `${blue("Compressed:")} ${ctx.flags.compress ? "Yes" : "No"}`,
          );
        } catch (err) {
          error(`Failed to export audit data: ${(err as Error).message}`);
        }
        break;
      }

      case "verify": {
        try {
          const verification = await manager.verifyAuditIntegrity();

          if (verification.verified) {
            success("Audit integrity verification passed");
          } else {
            error(
              `Audit integrity verification failed: ${verification.issues.length} issues found`,
            );
          }

          console.log(
            `${blue("Total Entries:")} ${verification.summary.totalEntries}`,
          );
          console.log(
            `${blue("Verified Entries:")} ${verification.summary.verifiedEntries}`,
          );
          console.log(
            `${blue("Corrupted Entries:")} ${verification.summary.corruptedEntries}`,
          );
          console.log(
            `${blue("Missing Entries:")} ${verification.summary.missingEntries}`,
          );

          if (verification.issues.length > 0 && ctx.flags.verbose) {
            console.log(`\n${bold("Issues:")}`);
            for (const issue of verification.issues.slice(0, 5)) {
              console.log(
                `  ${issue.severity.toUpperCase()}: ${issue.description}`,
              );
            }
          }
        } catch (err) {
          error(
            `Failed to verify audit integrity: ${(err as Error).message}`,
          );
        }
        break;
      }

      case "metrics": {
        try {
          const timeRange = (ctx.flags.timerange as string) || "30d";
          const now = new Date();
          let start: Date;

          switch (timeRange) {
            case "1d":
              start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case "7d":
              start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "30d":
              start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case "90d":
              start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            default:
              start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          }

          const metrics = await manager.getAuditMetrics({ start, end: now });

          success("Audit Metrics:");
          console.log();

          console.log(`${bold("Volume:")}`);
          console.log(
            `  Total Entries: ${metrics.volume.totalEntries.toLocaleString()}`,
          );
          console.log(
            `  Daily Average: ${metrics.volume.dailyAverage.toFixed(0)}`,
          );
          console.log(`  Peak Hourly: ${metrics.volume.peakHourly}`);

          console.log(`\n${bold("Compliance:")}`);
          console.log(
            `  Overall Score: ${metrics.compliance.overallScore.toFixed(1)}%`,
          );
          console.log(`  Trending: ${metrics.compliance.trending}`);

          console.log(`\n${bold("Integrity:")}`);
          console.log(
            `  Verification Success: ${metrics.integrity.verificationSuccess.toFixed(1)}%`,
          );
          console.log(
            `  Tamper Attempts: ${metrics.integrity.tamperAttempts}`,
          );
          console.log(`  Data Loss: ${metrics.integrity.dataLoss}`);

          console.log(`\n${bold("Security:")}`);
          console.log(
            `  Unauthorized Access: ${metrics.security.unauthorizedAccess}`,
          );
          console.log(
            `  Privileged Actions: ${metrics.security.privilegedActions}`,
          );
          console.log(
            `  Escalated Incidents: ${metrics.security.escalatedIncidents}`,
          );

          if (Object.keys(metrics.volume.byCategory).length > 0) {
            console.log(`\n${bold("By Category:")}`);
            for (const [category, count] of Object.entries(
              metrics.volume.byCategory,
            )) {
              console.log(`  ${category}: ${count.toLocaleString()}`);
            }
          }
        } catch (err) {
          error(`Failed to get audit metrics: ${(err as Error).message}`);
        }
        break;
      }

      default: {
        console.log(`${bold("Available subcommands:")}`);
        console.log("  log <event> <action>  Log an audit event");
        console.log("  report [type]         Generate audit report");
        console.log("  export                Export audit data");
        console.log("  verify                Verify audit integrity");
        console.log("  metrics               Show audit metrics");
        console.log();
        console.log(`${bold("Examples:")}`);
        console.log(
          `  ${cyan("claude-flow audit log")} user_login success --user john.doe --resource user-account`,
        );
        console.log(
          `  ${cyan("claude-flow audit report")} compliance --framework SOC2 --timerange 90d`,
        );
        console.log(
          `  ${cyan("claude-flow audit export")} --format csv --timerange 30d --encrypt`,
        );
        break;
      }
    }
  },
};