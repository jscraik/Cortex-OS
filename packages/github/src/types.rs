use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Core GitHub types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub owner: User,
    pub private: bool,
    pub html_url: String,
    pub clone_url: String,
    pub ssh_url: String,
    pub default_branch: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub pushed_at: Option<String>,
    pub size: u64,
    pub stargazers_count: u64,
    pub watchers_count: u64,
    pub language: Option<String>,
    pub has_issues: bool,
    pub has_projects: bool,
    pub has_wiki: bool,
    pub has_pages: bool,
    pub has_downloads: bool,
    pub archived: bool,
    pub disabled: bool,
    pub visibility: String,
    pub permissions: Option<Permissions>,
}

impl Default for Repository {
    fn default() -> Self {
        Self {
            id: 0,
            name: String::new(),
            full_name: String::new(),
            owner: User::default(),
            private: false,
            html_url: String::new(),
            clone_url: String::new(),
            ssh_url: String::new(),
            default_branch: "main".to_string(),
            description: None,
            created_at: String::new(),
            updated_at: String::new(),
            pushed_at: None,
            size: 0,
            stargazers_count: 0,
            watchers_count: 0,
            language: None,
            has_issues: true,
            has_projects: false,
            has_wiki: false,
            has_pages: false,
            has_downloads: false,
            archived: false,
            disabled: false,
            visibility: "private".to_string(),
            permissions: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: u64,
    pub login: String,
    pub avatar_url: String,
    pub html_url: String,
    #[serde(rename = "type")]
    pub user_type: String,
    pub site_admin: bool,
}

impl Default for User {
    fn default() -> Self {
        Self {
            id: 0,
            login: String::new(),
            avatar_url: String::new(),
            html_url: String::new(),
            user_type: "User".to_string(),
            site_admin: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permissions {
    pub admin: bool,
    pub maintain: Option<bool>,
    pub push: bool,
    pub triage: Option<bool>,
    pub pull: bool,
}

// File operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Content {
    pub name: String,
    pub path: String,
    pub sha: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub content_type: String,
    pub content: Option<String>,
    pub encoding: Option<String>,
    pub download_url: Option<String>,
    pub html_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileUpdateData {
    pub message: String,
    pub content: String,     // Base64 encoded
    pub sha: Option<String>, // Required for updates
    pub branch: Option<String>,
    pub committer: Option<CommitAuthor>,
    pub author: Option<CommitAuthor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitAuthor {
    pub name: String,
    pub email: String,
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileResponse {
    pub content: Content,
    pub commit: Commit,
}

// Branch operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
    pub name: String,
    pub commit: BranchCommit,
    pub protected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchCommit {
    pub sha: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBranchData {
    #[serde(rename = "ref")]
    pub ref_name: String, // refs/heads/branch-name
    pub sha: String,
}

// GitHub Actions types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: u64,
    pub name: String,
    pub path: String,
    pub state: String,
    pub created_at: String,
    pub updated_at: String,
    pub url: String,
    pub html_url: String,
    pub badge_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRun {
    pub id: u64,
    pub name: Option<String>,
    pub head_branch: Option<String>,
    pub head_sha: String,
    pub path: String,
    pub display_title: String,
    pub run_number: u64,
    pub event: String,
    pub status: String,             // queued, in_progress, completed
    pub conclusion: Option<String>, // success, failure, neutral, cancelled, timed_out, action_required, stale
    pub workflow_id: u64,
    pub check_suite_id: u64,
    pub check_suite_node_id: String,
    pub url: String,
    pub html_url: String,
    pub created_at: String,
    pub updated_at: String,
    pub actor: User,
    pub run_attempt: u64,
    pub referenced_workflows: Vec<ReferencedWorkflow>,
    pub run_started_at: Option<String>,
    pub triggering_actor: User,
    pub jobs_url: String,
    pub logs_url: String,
    pub check_suite_url: String,
    pub artifacts_url: String,
    pub cancel_url: String,
    pub rerun_url: String,
    pub previous_attempt_url: Option<String>,
    pub workflow_url: String,
    pub head_commit: Commit,
    pub repository: Repository,
    pub head_repository: Repository,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferencedWorkflow {
    pub path: String,
    pub sha: String,
    #[serde(rename = "ref")]
    pub ref_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDispatchData {
    #[serde(rename = "ref")]
    pub ref_name: String,
    pub inputs: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: u64,
    pub run_id: u64,
    pub workflow_name: Option<String>,
    pub head_branch: Option<String>,
    pub run_url: String,
    pub run_attempt: u64,
    pub node_id: String,
    pub head_sha: String,
    pub url: String,
    pub html_url: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub name: String,
    pub steps: Vec<Step>,
    pub check_run_url: String,
    pub labels: Vec<String>,
    pub runner_id: Option<u64>,
    pub runner_name: Option<String>,
    pub runner_group_id: Option<u64>,
    pub runner_group_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Step {
    pub name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub number: u64,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artifact {
    pub id: u64,
    pub node_id: String,
    pub name: String,
    pub size_in_bytes: u64,
    pub url: String,
    pub archive_download_url: String,
    pub expired: bool,
    pub created_at: String,
    pub updated_at: String,
    pub expires_at: String,
    pub workflow_run: Option<WorkflowRunMinimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRunMinimal {
    pub id: u64,
    pub repository_id: u64,
    pub head_repository_id: Option<u64>,
    pub head_branch: Option<String>,
    pub head_sha: String,
}

// Pull request types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequest {
    pub id: u64,
    pub number: u64,
    pub state: String,
    pub title: String,
    pub body: Option<String>,
    pub user: User,
    pub created_at: String,
    pub updated_at: String,
    pub closed_at: Option<String>,
    pub merged_at: Option<String>,
    pub merge_commit_sha: Option<String>,
    pub assignee: Option<User>,
    pub assignees: Vec<User>,
    pub requested_reviewers: Vec<User>,
    pub requested_teams: Vec<Team>,
    pub labels: Vec<Label>,
    pub milestone: Option<Milestone>,
    pub draft: bool,
    pub head: PullRequestBranch,
    pub base: PullRequestBranch,
    #[serde(rename = "_links")]
    pub links: PullRequestLinks,
    pub author_association: String,
    pub auto_merge: Option<AutoMerge>,
    pub active_lock_reason: Option<String>,
    pub merged: bool,
    pub mergeable: Option<bool>,
    pub rebaseable: Option<bool>,
    pub mergeable_state: String,
    pub merged_by: Option<User>,
    pub comments: u64,
    pub review_comments: u64,
    pub maintainer_can_modify: bool,
    pub commits: u64,
    pub additions: u64,
    pub deletions: u64,
    pub changed_files: u64,
    pub url: String,
    pub html_url: String,
    pub diff_url: String,
    pub patch_url: String,
    pub issue_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestBranch {
    pub label: String,
    #[serde(rename = "ref")]
    pub ref_name: String,
    pub sha: String,
    pub user: User,
    pub repo: Repository,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestLinks {
    #[serde(rename = "self")]
    pub self_link: Link,
    pub html: Link,
    pub issue: Link,
    pub comments: Link,
    pub review_comments: Link,
    pub review_comment: Link,
    pub commits: Link,
    pub statuses: Link,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Link {
    pub href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
    pub id: u64,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub privacy: String,
    pub url: String,
    pub html_url: String,
    pub members_url: String,
    pub repositories_url: String,
    pub permission: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Label {
    pub id: u64,
    pub url: String,
    pub name: String,
    pub color: String,
    pub default: bool,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Milestone {
    pub id: u64,
    pub number: u64,
    pub state: String,
    pub title: String,
    pub description: Option<String>,
    pub creator: User,
    pub open_issues: u64,
    pub closed_issues: u64,
    pub created_at: String,
    pub updated_at: String,
    pub closed_at: Option<String>,
    pub due_on: Option<String>,
    pub url: String,
    pub html_url: String,
    pub labels_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoMerge {
    pub enabled_by: User,
    pub merge_method: String,
    pub commit_title: String,
    pub commit_message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePRData {
    pub title: String,
    pub head: String,
    pub base: String,
    pub body: Option<String>,
    pub maintainer_can_modify: Option<bool>,
    pub draft: Option<bool>,
    pub issue: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePRData {
    pub title: Option<String>,
    pub body: Option<String>,
    pub state: Option<String>,
    pub base: Option<String>,
    pub maintainer_can_modify: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergePRData {
    pub commit_title: Option<String>,
    pub commit_message: Option<String>,
    pub sha: Option<String>,
    pub merge_method: Option<String>, // merge, squash, rebase
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeResult {
    pub sha: String,
    pub merged: bool,
    pub message: String,
}

// Review types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Review {
    pub id: u64,
    pub user: User,
    pub body: Option<String>,
    pub state: String, // PENDING, APPROVED, CHANGES_REQUESTED, COMMENTED
    pub html_url: String,
    pub pull_request_url: String,
    pub commit_id: String,
    pub submitted_at: Option<String>,
    pub author_association: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReviewData {
    pub commit_id: Option<String>,
    pub body: Option<String>,
    pub event: String, // APPROVE, REQUEST_CHANGES, COMMENT
    pub comments: Option<Vec<ReviewComment>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewComment {
    pub path: String,
    pub position: Option<u64>,
    pub body: String,
    pub line: Option<u64>,
    pub side: Option<String>, // LEFT, RIGHT
    pub start_line: Option<u64>,
    pub start_side: Option<String>,
}

// Issue types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Issue {
    pub id: u64,
    pub number: u64,
    pub title: String,
    pub user: User,
    pub labels: Vec<Label>,
    pub state: String,
    pub locked: bool,
    pub assignee: Option<User>,
    pub assignees: Vec<User>,
    pub milestone: Option<Milestone>,
    pub comments: u64,
    pub created_at: String,
    pub updated_at: String,
    pub closed_at: Option<String>,
    pub author_association: String,
    pub active_lock_reason: Option<String>,
    pub body: Option<String>,
    pub closed_by: Option<User>,
    pub html_url: String,
    pub url: String,
    pub comments_url: String,
    pub events_url: String,
    pub labels_url: String,
}

// Comments
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: u64,
    pub url: String,
    pub html_url: String,
    pub body: String,
    pub user: User,
    pub created_at: String,
    pub updated_at: String,
    pub author_association: String,
}

// Commit types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commit {
    pub sha: String,
    pub url: String,
    pub html_url: String,
    pub author: GitUser,
    pub committer: GitUser,
    pub message: String,
    pub tree: Tree,
    pub parents: Vec<CommitParent>,
    pub verification: Verification,
    pub stats: Option<CommitStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitUser {
    pub name: String,
    pub email: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tree {
    pub sha: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitParent {
    pub sha: String,
    pub url: String,
    pub html_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Verification {
    pub verified: bool,
    pub reason: String,
    pub signature: Option<String>,
    pub payload: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitStats {
    pub additions: u64,
    pub deletions: u64,
    pub total: u64,
}

// Event types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub actor: User,
    pub repo: EventRepository,
    pub payload: serde_json::Value,
    pub public: bool,
    pub created_at: String,
    pub org: Option<User>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventRepository {
    pub id: u64,
    pub name: String,
    pub url: String,
}

// API response wrappers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListResponse<T> {
    pub items: Vec<T>,
    pub total_count: Option<u64>,
    pub incomplete_results: Option<bool>,
}

// Pagination
#[derive(Debug, Clone)]
pub struct ListOptions {
    pub page: u64,
    pub per_page: u64,
    pub sort: Option<String>,
    pub direction: Option<String>,
}

impl Default for ListOptions {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 30,
            sort: None,
            direction: None,
        }
    }
}

// Rate limiting
#[derive(Debug, Clone)]
pub struct RateLimitInfo {
    pub limit: u64,
    pub remaining: u64,
    pub reset: u64,
    pub used: u64,
    pub resource: String,
}

// Validation result
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
