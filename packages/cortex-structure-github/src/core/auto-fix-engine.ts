/**
 * Auto-Fix Engine for Repository Structure
 * Automatically fixes structural violations when safe to do so
 */

import * as fs from "fs-extra";
import * as path from "path";
import type { StructureViolation } from "./structure-validator.js";

export interface AutoFixResult {
	success: boolean;
	error?: string;
	oldPath: string;
	newPath: string;
	action: "move" | "rename" | "create_directory";
}

export interface AutoFixPlan {
	violations: StructureViolation[];
	fixes: AutoFixAction[];
	riskLevel: "low" | "medium" | "high";
	requiresApproval: boolean;
}

export interface AutoFixAction {
	type: "move_file" | "rename_file" | "create_directory" | "create_file";
	source: string;
	target: string;
	description: string;
	safe: boolean;
}

export class AutoFixEngine {
	private readonly baseDir: string;
	private readonly dryRun: boolean;

	constructor(baseDir: string, dryRun = true) {
		this.baseDir = baseDir;
		this.dryRun = dryRun;
	}

	/**
	 * Generate an auto-fix plan for the given violations
	 */
	generateFixPlan(violations: StructureViolation[]): AutoFixPlan {
		const fixableViolations = violations.filter((v) => v.autoFixable);
		const fixes: AutoFixAction[] = [];

		for (const violation of fixableViolations) {
			const fix = this.createFixAction(violation);
			if (fix) {
				fixes.push(fix);
			}
		}

		const riskLevel = this.assessRiskLevel(fixes);
		const requiresApproval = riskLevel === "high" || fixes.length > 10;

		return {
			violations: fixableViolations,
			fixes,
			riskLevel,
			requiresApproval,
		};
	}

	/**
	 * Execute the auto-fix plan
	 */
	async executeFixPlan(plan: AutoFixPlan): Promise<AutoFixResult[]> {
		const results: AutoFixResult[] = [];

		for (const fix of plan.fixes) {
			try {
				const result = await this.executeFixAction(fix);
				results.push(result);
			} catch (error) {
				results.push({
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
					oldPath: fix.source,
					newPath: fix.target,
					action: this.mapActionToResult(fix.type),
				});
			}
		}

		return results;
	}

	private createFixAction(violation: StructureViolation): AutoFixAction | null {
		if (!violation.suggestedPath) {
			return null;
		}

		const sourceFile = path.join(this.baseDir, violation.file);
		const targetFile = path.join(this.baseDir, violation.suggestedPath);

		// Determine the type of fix needed
		if (violation.type === "misplaced_file") {
			return {
				type: "move_file",
				source: sourceFile,
				target: targetFile,
				description: `Move ${violation.file} to ${violation.suggestedPath}`,
				safe: this.isMoveSafe(sourceFile, targetFile),
			};
		}

		if (violation.type === "naming_violation") {
			return {
				type: "rename_file",
				source: sourceFile,
				target: targetFile,
				description: `Rename ${violation.file} to follow naming convention`,
				safe: this.isRenameSafe(sourceFile, targetFile),
			};
		}

		return null;
	}

	private async executeFixAction(fix: AutoFixAction): Promise<AutoFixResult> {
		if (this.dryRun) {
			return {
				success: true,
				oldPath: fix.source,
				newPath: fix.target,
				action: this.mapActionToResult(fix.type),
			};
		}

		switch (fix.type) {
			case "move_file":
				return await this.moveFile(fix.source, fix.target);

			case "rename_file":
				return await this.renameFile(fix.source, fix.target);

			case "create_directory":
				return await this.createDirectory(fix.target);

			case "create_file":
				return await this.createFile(fix.target, "");

			default:
				throw new Error(`Unsupported fix type: ${fix.type}`);
		}
	}

	private async moveFile(
		source: string,
		target: string,
	): Promise<AutoFixResult> {
		try {
			// Ensure target directory exists
			await fs.ensureDir(path.dirname(target));

			// Move the file
			await fs.move(source, target);

			return {
				success: true,
				oldPath: source,
				newPath: target,
				action: "move",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				oldPath: source,
				newPath: target,
				action: "move",
			};
		}
	}

	private async renameFile(
		source: string,
		target: string,
	): Promise<AutoFixResult> {
		try {
			await fs.rename(source, target);

			return {
				success: true,
				oldPath: source,
				newPath: target,
				action: "rename",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				oldPath: source,
				newPath: target,
				action: "rename",
			};
		}
	}

	private async createDirectory(dirPath: string): Promise<AutoFixResult> {
		try {
			await fs.ensureDir(dirPath);

			return {
				success: true,
				oldPath: "",
				newPath: dirPath,
				action: "create_directory",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				oldPath: "",
				newPath: dirPath,
				action: "create_directory",
			};
		}
	}

	private async createFile(
		filePath: string,
		content: string,
	): Promise<AutoFixResult> {
		try {
			await fs.ensureDir(path.dirname(filePath));
			await fs.writeFile(filePath, content);

			return {
				success: true,
				oldPath: "",
				newPath: filePath,
				action: "create_file",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				oldPath: "",
				newPath: filePath,
				action: "create_directory",
			};
		}
	}

	private isMoveSafe(source: string, target: string): boolean {
		// Basic safety checks
		if (source === target) return false;
		if (fs.existsSync(target)) return false; // Don't overwrite existing files

		// Check if it's a critical file
		const criticalFiles = [
			"package.json",
			"tsconfig.json",
			"README.md",
			".gitignore",
			"LICENSE",
		];

		const fileName = path.basename(source);
		return !criticalFiles.includes(fileName);
	}

	private isRenameSafe(source: string, target: string): boolean {
		return this.isMoveSafe(source, target);
	}

	private assessRiskLevel(fixes: AutoFixAction[]): "low" | "medium" | "high" {
		const unsafeFixes = fixes.filter((f) => !f.safe).length;
		const totalFixes = fixes.length;

		if (unsafeFixes > 0 || totalFixes > 20) {
			return "high";
		}

		if (totalFixes > 5) {
			return "medium";
		}

		return "low";
	}

	private mapActionToResult(
		actionType: string,
	): "move" | "rename" | "create_directory" {
		switch (actionType) {
			case "move_file":
				return "move";
			case "rename_file":
				return "rename";
			case "create_directory":
			case "create_file":
				return "create_directory";
			default:
				return "move";
		}
	}
}
