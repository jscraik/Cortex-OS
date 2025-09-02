/**
 * Scan operations - functional approach
 * Broken down from large handleScanCommand method
 */

import type { EmitterWebhookEvent } from "@octokit/webhooks";
import { runSemgrepScan, type SecurityScanResult } from "./semgrep-scanner.js";

export interface ScanRequest {
	owner: string;
	repo: string;
	sha: string;
	issueNumber: number;
	userId: string;
}

export const validateScanRequest = (
	payload:
		| EmitterWebhookEvent<"issue_comment.created">["payload"]
		| EmitterWebhookEvent<"pull_request_review_comment.created">["payload"],
): ScanRequest => {
	const repo = payload.repository;
	const ownerLogin = repo.owner?.login;

	if (!ownerLogin) {
		throw new Error("Repository owner.login not available");
	}

	let issueNumber: number | undefined;
	if ("issue" in payload && payload.issue) {
		issueNumber = payload.issue.number;
	}

	if (!issueNumber) {
		throw new Error("No issue number found in payload");
	}

	const sha =
		payload.pull_request?.head?.sha ||
		payload.repository.default_branch ||
		"HEAD";

	const userId = payload.comment.user?.login;
	if (!userId) {
		throw new Error("No user login found in payload");
	}

	return {
		owner: ownerLogin,
		repo: repo.name,
		sha,
		issueNumber,
		userId,
	};
};

export const executeScan = async (
	request: ScanRequest,
): Promise<SecurityScanResult[]> => {
	console.warn(`🔍 ${request.userId} requested security scan`);
	console.log(`Scanning ${request.owner}/${request.repo} at ${request.sha}`);

	return runSemgrepScan(request.owner, request.repo, request.sha);
};

export const shouldCreateCheckRun = (
	payload:
		| EmitterWebhookEvent<"issue_comment.created">["payload"]
		| EmitterWebhookEvent<"pull_request_review_comment.created">["payload"],
): boolean => {
	// Only create check runs for PR comments, not regular issues
	return "pull_request" in payload && payload.pull_request !== null;
};
