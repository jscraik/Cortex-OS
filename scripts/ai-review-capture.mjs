import * as core from '@actions/core';
import * as github from '@actions/github';
import { request } from 'undici';
import { ActionPoints, ActionPoint } from './review.schema.js';
import { tryParseStructured, parseHeuristics } from './ai-review-parser.js';

const token = process.env.GITHUB_TOKEN;
const octokit = github.getOctokit(token);

const allow = (process.env.ALLOWLIST_BOT_LOGINS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase());
const useGhModels = process.env.USE_GH_MODELS === 'true';

const ctx = github.context;
const repo = ctx.repo;

function isAllowed(author) {
  if (!allow.length) return true;
  return allow.includes(String(author || '').toLowerCase());
}

function commentPayload() {
  const e = ctx.payload;
  if (e.review)
    return {
      body: e.review.body || '',
      html_url: e.review.html_url,
      path: undefined,
      pr: e.pull_request?.number,
    };
  if (e.comment && e.comment.pull_request_review_id) {
    return {
      body: e.comment.body || '',
      html_url: e.comment.html_url,
      path: e.comment.path,
      pr: e.pull_request?.number || e.issue?.number,
    };
  }
  if (e.comment && e.issue?.pull_request) {
    return {
      body: e.comment.body || '',
      html_url: e.comment.html_url,
      path: undefined,
      pr: e.issue.number,
    };
  }
  return null;
}

async function ghModelsToActions(text, pr, url) {
  const model = process.env.GH_MODELS_MODEL || 'auto';
  const prompt = `
You are a strict parser. Convert the review text to JSON ActionPoints schema.
Return ONLY JSON. Use categories: security,a11y,perf,correctness,style,docs,test. 
Generate stable task_id. Add evidence_url if present.
PR:${pr} URL:${url}
TEXT:
${text}
`;
  let data;
  try {
    const res = await request('https://api.github.com/inference/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-GitHub-Api-Version': '2023-10-01',
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res || res.status < 200 || res.status >= 300) {
      core.error(`GitHub Models API request failed with status ${res?.status}`);
      return null;
    }
    try {
      data = await res.body.json();
    } catch (err) {
      core.error(`Failed to parse JSON from GitHub Models API response: ${err}`);
      return null;
    }
  } catch (err) {
    core.error(`Error during GitHub Models API request: ${err}`);
    return null;
  }
  const content =
    data?.choices?.[0]?.message?.content?.[0]?.text ?? data?.choices?.[0]?.message?.content;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function upsertIssue(pr, items, sourceUrl) {
  const title = `AI Action Points for PR #${pr}`;
  const search = await octokit.rest.search.issuesAndPullRequests({
    q: `repo:${repo.owner}/${repo.repo} "${title}" in:title type:issue state:open`,
  });
  const body = renderIssueBody(pr, items, sourceUrl);
  if (search.data.items.length) {
    const issue = search.data.items[0];
    await octokit.rest.issues.update({ ...repo, issue_number: issue.number, body });
    return issue.number;
  }
  const { data } = await octokit.rest.issues.create({
    ...repo,
    title,
    body,
    labels: ['from:ai-review'],
  });
  return data.number;
}

function renderIssueBody(pr, items, sourceUrl) {
  const list = items
    .map(
      (i) =>
        `- [ ] ${i.title} ${i.file ? `(**${i.file}**)` : ''} ${i.evidence_url ? `([evidence](${i.evidence_url}))` : ''}  \n  • severity:${i.severity || 'minor'} • category:${i.category || 'correctness'} • id:${i.task_id}`,
    )
    .join('\n');
  return `Automated capture from AI review comments.\n\nPR: #${pr}\nSource: ${sourceUrl}\n\n### Checklist\n${list}\n\n> Do not edit IDs. The bot de-duplicates by task_id.`;
}

function uniqById(items) {
  const seen = new Set();
  const out = [];
  for (const i of items) {
    if (!seen.has(i.task_id)) {
      seen.add(i.task_id);
      out.push(i);
    }
  }
  return out;
}

(async () => {
  const author = ctx.payload?.sender?.login;
  if (!isAllowed(author)) {
    core.info(`author ${author} not allowed`);
    return;
  }

  const c = commentPayload();
  if (!c) {
    core.info('no comment payload');
    return;
  }
  let structured = tryParseStructured(c.body);
  if (!structured || !structured.items?.length) {
    if (useGhModels) structured = await ghModelsToActions(c.body, c.pr, c.html_url);
    if (!structured || !structured.items?.length)
      structured = parseHeuristics(c.body, c.path, c.html_url, c.pr);
  }

  const parsed = ActionPoints.safeParse(structured);
  if (!parsed.success || !parsed.data.items.length) {
    core.info('no action points');
    return;
  }
  const items = uniqById(parsed.data.items);
  const issueNo = await upsertIssue(parsed.data.pr_number, items, parsed.data.source_comment_url);

  // PR summary comment
  const md = `Captured **${items.length}** action point(s) → #${issueNo}`;
  await octokit.rest.issues.createComment({
    ...repo,
    issue_number: parsed.data.pr_number,
    body: md,
  });
})();
