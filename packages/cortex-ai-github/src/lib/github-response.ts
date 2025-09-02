/**
 * GitHub Response Handler
 * Posts AI analysis results back to GitHub
 */

import { Octokit } from "@octokit/rest";
import type { AITaskResult, GitHubContext } from "../types/github-models.js";

export const postResultToGitHub = async (
	result: AITaskResult,
	context: GitHubContext,
	githubToken: string,
): Promise<void> => {
	const octokit = new Octokit({ auth: githubToken });

	const comment = formatResultComment(result);

	if (context.pr) {
		// Post to PR
		await octokit.rest.issues.createComment({
			owner: context.owner,
			repo: context.repo,
			issue_number: context.pr.number,
			body: comment,
		});
	} else if (context.issue) {
		// Post to issue
		await octokit.rest.issues.createComment({
			owner: context.owner,
			repo: context.repo,
			issue_number: context.issue.number,
			body: comment,
		});
	}
};

const formatResultComment = (result: AITaskResult): string => {
	const { taskType, status, result: analysisResult } = result;

	if (status === "error") {
		return `## 🚨 ${taskType.replace(/_/g, " ")} Failed

Error: ${result.error || "Unknown error occurred"}

Please try again or contact support.`;
	}

	return `## 🤖 ${taskType.replace(/_/g, " ")} Results

**Summary:** ${analysisResult.summary}

**Confidence:** ${Math.round(analysisResult.confidence * 100)}%

**Recommendations:**
${analysisResult.recommendations.map((rec) => `- ${rec}`).join("\n")}

---
*Analysis completed in ${result.executionTime}ms using ${result.model}*`;
};
