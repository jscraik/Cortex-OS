/**
 * @file lib/utils.ts
 * @description Utility functions for file operations and process execution
 */

import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

export const execAsync = promisify(exec);

export const fileExists = (filePath: string): boolean => {
	return fs.existsSync(filePath);
};

export const readJsonFile = <T = any>(filePath: string): T => {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		return JSON.parse(content);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			throw new Error(`JSON file not found: ${filePath}`);
		}
		if (error instanceof SyntaxError) {
			throw new Error(`Invalid JSON in file: ${filePath} - ${error.message}`);
		}
		throw new Error(
			`Failed to read JSON file: ${filePath} - ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

export const readFileSync = (filePath: string): string => {
	try {
		return fs.readFileSync(filePath, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			throw new Error(`File not found: ${filePath}`);
		}
		throw new Error(
			`Failed to read file: ${filePath} - ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

export const getCurrentWorkingDirectory = (): string => {
	return process.cwd();
};

export const createFilePath = (...segments: string[]): string => {
	return path.join(...segments);
};

export const getRelativePath = (from: string, to: string): string => {
	return path.relative(from, to);
};

export const getBasename = (filePath: string): string => {
	return path.basename(filePath);
};

export const getProjectRoot = (): string => {
	return getCurrentWorkingDirectory();
};

export const hasPackageJson = (projectRoot: string): boolean => {
	return fileExists(createFilePath(projectRoot, "package.json"));
};

export const hasPyprojectToml = (projectRoot: string): boolean => {
	return fileExists(createFilePath(projectRoot, "pyproject.toml"));
};

export const truncateString = (str: string, maxLength: number): string => {
	return str.length > maxLength ? str.slice(-maxLength) : str;
};

export const getCurrentTimestamp = (): string => {
	return new Date().toISOString();
};

let evidenceCounter = 0;

export const generateEvidenceId = (prefix: string): string => {
	const timestamp = Date.now();
	const counter = ++evidenceCounter;
	return `${prefix}-${timestamp}-${counter}`;
};
