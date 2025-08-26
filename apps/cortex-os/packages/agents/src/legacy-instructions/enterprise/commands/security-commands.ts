/**
 * @file Security Management Commands
 * @description Security scanning, compliance, and vulnerability management command implementations
 * @split_from enterprise.ts
 */

import type { Command, CommandContext } from "../../cli-core.js";
import { success, error, warning, info } from "../../cli-core.js";
import colors from "chalk";
import {
  SecurityManager,
  SecurityScan,
} from "../../../enterprise/security-manager.js";

const { bold, blue, green, yellow, red, cyan, magenta } = colors;

let securityManager: SecurityManager | null = null;

async function getSecurityManager(): Promise<SecurityManager> {
  if (!securityManager) {
    securityManager = new SecurityManager();
    await securityManager.initialize();
  }
  return securityManager;
}

export const securityCommands: Command = {
  name: "security",
  description:
    "Security scanning, compliance checking, and vulnerability management",
  options: [
    {
      name: "type",
      short: "t",
      description: "Scan type (vulnerability, compliance, code, infra)",
      type: "string",
    },
    {
      name: "framework",
      short: "f",
      description: "Compliance framework (SOC2, GDPR, HIPAA, PCI-DSS)",
      type: "string",
    },
    {
      name: "severity",
      short: "s",
      description: "Minimum severity level (low, medium, high, critical)",
      type: "string",
    },
    {
      name: "output",
      short: "o",
      description: "Output format (json, sarif, csv)",
      type: "string",
    },
  ],
  action: async (ctx: CommandContext) => {
    const subcommand = ctx.args[0];
    const manager = await getSecurityManager();

    switch (subcommand) {
      case "scan": {
        const name = ctx.args[1];
        const target = ctx.args[2];

        if (!name || !target) {
          error("Usage: security scan <name> <target> --type <type>");
          break;
        }

        try {
          const scan = await manager.createScan({
            name,
            target,
            type: (ctx.flags.type as any) || "vulnerability",
            configuration: {
              depth: (ctx.flags.depth as any) || "standard",
              timeout: parseInt(ctx.flags.timeout as string) || 3600,
              excludePatterns: ctx.flags.exclude
                ? (ctx.flags.exclude as string).split(",")
                : [],
              includeTests: ctx.flags.includeTests === true,
              language: ctx.flags.language as string,
              frameworks: ctx.flags.frameworks
                ? (ctx.flags.frameworks as string).split(",")
                : [],
            },
            compliance: {
              frameworks: ctx.flags.frameworks
                ? (ctx.flags.frameworks as string).split(",")
                : [],
              standards: ["OWASP", "CWE"],
            },
          });

          success(`Security scan created: ${scan.name}`);
          console.log(`${blue("ID:")} ${scan.id}`);
          console.log(`${blue("Type:")} ${scan.type}`);
          console.log(`${blue("Target:")} ${scan.target}`);
          console.log(`${blue("Status:")} ${scan.status}`);

          info("Starting security scan...");
          const results = await manager.executeScan(scan.id);

          if (results.status === "completed") {
            success("Security scan completed");
            console.log();
            console.log(`${blue("Vulnerabilities Found:")} ${results.vulnerabilities.length}`);
            console.log(`${blue("Critical:")} ${results.summary.critical}`);
            console.log(`${blue("High:")} ${results.summary.high}`);
            console.log(`${blue("Medium:")} ${results.summary.medium}`);
            console.log(`${blue("Low:")} ${results.summary.low}`);

            if (results.vulnerabilities.length > 0 && !ctx.flags.quiet) {
              console.log(`\n${bold("Top Vulnerabilities:")}`);
              const topVulns = results.vulnerabilities
                .filter(v => v.severity === "critical" || v.severity === "high")
                .slice(0, 5);

              for (const vuln of topVulns) {
                const severityColor = vuln.severity === "critical" ? red : vuln.severity === "high" ? yellow : blue;
                console.log(`  ${severityColor(vuln.severity.toUpperCase())} ${vuln.title}`);
                console.log(`    ${vuln.description}`);
                if (vuln.remediation) {
                  console.log(`    Fix: ${vuln.remediation}`);
                }
                console.log();
              }
            }
          } else {
            error(`Security scan failed: ${results.error}`);
          }
        } catch (err) {
          error(`Failed to create security scan: ${(err as Error).message}`);
        }
        break;
      }

      case "incident": {
        const incidentCmd = ctx.args[1];

        switch (incidentCmd) {
          case "create": {
            const title = ctx.args[2];
            if (!title) {
              error("Usage: security incident create <title> --severity <severity>");
              break;
            }

            try {
              const incident = await manager.createIncident({
                title,
                description: ctx.args.slice(3).join(" ") || "Security incident reported",
                severity: (ctx.flags.severity as any) || "medium",
                type: (ctx.flags.type as any) || "security_violation",
                affectedSystems: ctx.flags.systems
                  ? (ctx.flags.systems as string).split(",")
                  : [],
                reportedBy: (ctx.flags.reporter as string) || "system",
              });

              success(`Security incident created: ${incident.title}`);
              console.log(`${blue("ID:")} ${incident.id}`);
              console.log(`${blue("Severity:")} ${incident.severity}`);
              console.log(`${blue("Status:")} ${incident.status}`);
              console.log(`${blue("Created:")} ${incident.createdAt.toLocaleDateString()}`);
            } catch (err) {
              error(`Failed to create incident: ${(err as Error).message}`);
            }
            break;
          }

          case "list": {
            try {
              const filters: any = {};
              if (ctx.flags.severity) filters.severity = ctx.flags.severity;
              if (ctx.flags.status) filters.status = ctx.flags.status;

              const incidents = await manager.listIncidents(filters);

              if (incidents.length === 0) {
                info("No security incidents found");
                break;
              }

              success(`Found ${incidents.length} security incidents:`);
              console.log();

              for (const incident of incidents) {
                const severityColor =
                  incident.severity === "critical"
                    ? red
                    : incident.severity === "high"
                      ? yellow
                      : incident.severity === "medium"
                        ? blue
                        : green;

                console.log(
                  `${bold(incident.title)} ${cyan(`(${incident.id.substr(0, 8)}...)`)}`,
                );
                console.log(
                  `  Severity: ${severityColor(incident.severity)} | Status: ${incident.status}`,
                );
                console.log(
                  `  Created: ${incident.createdAt.toLocaleDateString()} | Reporter: ${incident.reportedBy}`,
                );
                console.log();
              }
            } catch (err) {
              error(`Failed to list incidents: ${(err as Error).message}`);
            }
            break;
          }

          case "resolve": {
            const incidentId = ctx.args[2];
            const resolution = ctx.args.slice(3).join(" ");

            if (!incidentId) {
              error("Usage: security incident resolve <incident-id> [resolution]");
              break;
            }

            try {
              await manager.resolveIncident(incidentId, resolution || "Resolved via CLI");
              success(`Security incident resolved: ${incidentId}`);
            } catch (err) {
              error(`Failed to resolve incident: ${(err as Error).message}`);
            }
            break;
          }

          default: {
            console.log("Available incident subcommands: create, list, resolve");
            break;
          }
        }
        break;
      }

      case "compliance": {
        const frameworks = ctx.args[1] ? ctx.args[1].split(",") : ["SOC2"];

        try {
          const assessment = await manager.runComplianceAssessment({
            frameworks,
            scope: (ctx.flags.scope as string) || "full",
            includeEvidence: ctx.flags.includeEvidence === true,
          });

          success(`Compliance assessment completed for: ${frameworks.join(", ")}`);
          console.log();

          for (const [framework, result] of Object.entries(assessment.results)) {
            console.log(`${bold(framework.toUpperCase())} Compliance:`);
            console.log(`  Overall Score: ${result.overallScore.toFixed(1)}%`);
            console.log(`  Controls Passed: ${result.controlsPassed}/${result.totalControls}`);
            console.log(`  Findings: ${result.findings.length}`);

            if (result.findings.length > 0) {
              console.log(`\n  ${bold("Key Findings:")}`);
              const criticalFindings = result.findings
                .filter(f => f.severity === "high" || f.severity === "critical")
                .slice(0, 3);

              for (const finding of criticalFindings) {
                const severityColor = finding.severity === "critical" ? red : yellow;
                console.log(`    ${severityColor(finding.severity.toUpperCase())} ${finding.control}`);
                console.log(`      ${finding.description}`);
              }
            }
            console.log();
          }
        } catch (err) {
          error(`Failed to run compliance assessment: ${(err as Error).message}`);
        }
        break;
      }

      case "metrics": {
        try {
          const metrics = await manager.getSecurityMetrics({
            timeRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              end: new Date(),
            },
          });

          success("Security Metrics (Last 30 Days):");
          console.log();
          console.log(`${blue("Total Scans:")} ${metrics.totalScans}`);
          console.log(`${blue("Vulnerabilities Found:")} ${metrics.vulnerabilitiesFound}`);
          console.log(`${blue("Critical Vulnerabilities:")} ${metrics.criticalVulnerabilities}`);
          console.log(`${blue("Incidents Reported:")} ${metrics.incidentsReported}`);
          console.log(`${blue("Incidents Resolved:")} ${metrics.incidentsResolved}`);
          console.log(`${blue("Mean Time to Resolution:")} ${(metrics.meanTimeToResolution / 3600000).toFixed(1)} hours`);
          console.log(`${blue("Compliance Score:")} ${metrics.averageComplianceScore.toFixed(1)}%`);

          if (Object.keys(metrics.vulnerabilityTrends).length > 0) {
            console.log(`\n${bold("Vulnerability Trends:")}`);
            for (const [severity, count] of Object.entries(metrics.vulnerabilityTrends)) {
              console.log(`  ${severity}: ${count} (trend: ${count > 0 ? "↗" : "↘"})`);
            }
          }
        } catch (err) {
          error(`Failed to get security metrics: ${(err as Error).message}`);
        }
        break;
      }

      default: {
        console.log(`${bold("Available subcommands:")}`);
        console.log("  scan <name> <target>     Execute security scan");
        console.log("  incident                 Manage security incidents");
        console.log("  compliance <frameworks>  Run compliance assessment");
        console.log("  metrics                  Show security metrics");
        console.log();
        console.log(`${bold("Examples:")}`);
        console.log(
          `  ${cyan("claude-flow security scan")} "API Audit" ./src --type code --framework OWASP`,
        );
        console.log(
          `  ${cyan("claude-flow security incident create")} "Unauthorized Access" --severity high`,
        );
        console.log(
          `  ${cyan("claude-flow security compliance")} SOC2,GDPR --include-evidence`,
        );
        break;
      }
    }
  },
};