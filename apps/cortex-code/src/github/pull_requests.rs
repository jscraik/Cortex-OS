use crate::github::{GitHubClient, types::*};
use crate::Result;
use tracing::{debug, info};

/// Pull Request API client for PR and issue management
pub struct PullRequestAPI {
    client: GitHubClient,
}

impl PullRequestAPI {
    pub fn new(client: GitHubClient) -> Self {
        Self { client }
    }

    /// List pull requests
    pub async fn list_pull_requests(
        &self,
        owner: &str,
        repo: &str,
        options: Option<PRListOptions>,
    ) -> Result<Vec<PullRequest>> {
        let mut endpoint = format!("/repos/{}/{}/pulls", owner, repo);
        
        if let Some(opts) = options {
            let mut query_params = vec![
                format!("page={}", opts.page),
                format!("per_page={}", opts.per_page),
            ];
            
            if let Some(state) = &opts.state {
                query_params.push(format!("state={}", state));
            }
            if let Some(head) = &opts.head {
                query_params.push(format!("head={}", head));
            }
            if let Some(base) = &opts.base {
                query_params.push(format!("base={}", base));
            }
            if let Some(sort) = &opts.sort {
                query_params.push(format!("sort={}", sort));
            }
            if let Some(direction) = &opts.direction {
                query_params.push(format!("direction={}", direction));
            }
            
            let query_string = query_params.join("&");
            endpoint = format!("{}?{}", endpoint, query_string);
        }
        
        self.client.get_paginated(&endpoint).await
    }

    /// Get a specific pull request
    pub async fn get_pull_request(&self, owner: &str, repo: &str, number: u64) -> Result<PullRequest> {
        let endpoint = format!("/repos/{}/{}/pulls/{}", owner, repo, number);
        self.client.get(&endpoint).await
    }

    /// Create a pull request
    pub async fn create_pull_request(&self, owner: &str, repo: &str, data: CreatePRData) -> Result<PullRequest> {
        let endpoint = format!("/repos/{}/{}/pulls", owner, repo);
        let pr: PullRequest = self.client.post(&endpoint, Some(data)).await?;
        info!("Created pull request #{} in {}/{}", pr.number, owner, repo);
        Ok(pr)
    }

    /// Update a pull request
    pub async fn update_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        data: UpdatePRData,
    ) -> Result<PullRequest> {
        let endpoint = format!("/repos/{}/{}/pulls/{}", owner, repo, number);
        let pr: PullRequest = self.client.patch(&endpoint, Some(data)).await?;
        info!("Updated pull request #{} in {}/{}", number, owner, repo);
        Ok(pr)
    }

    /// Merge a pull request
    pub async fn merge_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        data: Option<MergePRData>,
    ) -> Result<MergeResult> {
        let endpoint = format!("/repos/{}/{}/pulls/{}/merge", owner, repo, number);
        let result: MergeResult = self.client.put(&endpoint, data).await?;
        info!("Merged pull request #{} in {}/{}", number, owner, repo);
        Ok(result)
    }

    /// List reviews for a pull request
    pub async fn list_reviews(&self, owner: &str, repo: &str, number: u64) -> Result<Vec<Review>> {
        let endpoint = format!("/repos/{}/{}/pulls/{}/reviews", owner, repo, number);
        self.client.get_paginated(&endpoint).await
    }

    /// Create a review
    pub async fn create_review(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        data: CreateReviewData,
    ) -> Result<Review> {
        let endpoint = format!("/repos/{}/{}/pulls/{}/reviews", owner, repo, number);
        let review: Review = self.client.post(&endpoint, Some(data)).await?;
        info!("Created review for pull request #{} in {}/{}", number, owner, repo);
        Ok(review)
    }

    /// List comments on a pull request
    pub async fn list_comments(&self, owner: &str, repo: &str, number: u64) -> Result<Vec<Comment>> {
        let endpoint = format!("/repos/{}/{}/issues/{}/comments", owner, repo, number);
        self.client.get_paginated(&endpoint).await
    }

    /// Create a comment on a pull request
    pub async fn create_comment(&self, owner: &str, repo: &str, number: u64, body: &str) -> Result<Comment> {
        let endpoint = format!("/repos/{}/{}/issues/{}/comments", owner, repo, number);
        let data = serde_json::json!({ "body": body });
        let comment: Comment = self.client.post(&endpoint, Some(data)).await?;
        debug!("Created comment on pull request #{} in {}/{}", number, owner, repo);
        Ok(comment)
    }

    // Issue management

    /// List issues
    pub async fn list_issues(&self, owner: &str, repo: &str, options: Option<IssueListOptions>) -> Result<Vec<Issue>> {
        let mut endpoint = format!("/repos/{}/{}/issues", owner, repo);
        
        if let Some(opts) = options {
            let mut query_params = vec![
                format!("page={}", opts.page),
                format!("per_page={}", opts.per_page),
            ];
            
            if let Some(state) = &opts.state {
                query_params.push(format!("state={}", state));
            }
            if let Some(labels) = &opts.labels {
                query_params.push(format!("labels={}", labels.join(",")));
            }
            if let Some(sort) = &opts.sort {
                query_params.push(format!("sort={}", sort));
            }
            if let Some(direction) = &opts.direction {
                query_params.push(format!("direction={}", direction));
            }
            if let Some(since) = &opts.since {
                query_params.push(format!("since={}", since));
            }
            
            let query_string = query_params.join("&");
            endpoint = format!("{}?{}", endpoint, query_string);
        }
        
        self.client.get_paginated(&endpoint).await
    }

    /// Get a specific issue
    pub async fn get_issue(&self, owner: &str, repo: &str, number: u64) -> Result<Issue> {
        let endpoint = format!("/repos/{}/{}/issues/{}", owner, repo, number);
        self.client.get(&endpoint).await
    }

    /// Create an issue
    pub async fn create_issue(&self, owner: &str, repo: &str, data: CreateIssueData) -> Result<Issue> {
        let endpoint = format!("/repos/{}/{}/issues", owner, repo);
        let issue: Issue = self.client.post(&endpoint, Some(data)).await?;
        info!("Created issue #{} in {}/{}", issue.number, owner, repo);
        Ok(issue)
    }

    /// Update an issue
    pub async fn update_issue(&self, owner: &str, repo: &str, number: u64, data: UpdateIssueData) -> Result<Issue> {
        let endpoint = format!("/repos/{}/{}/issues/{}", owner, repo, number);
        let issue: Issue = self.client.patch(&endpoint, Some(data)).await?;
        info!("Updated issue #{} in {}/{}", number, owner, repo);
        Ok(issue)
    }
}

// Additional types for pull request and issue operations

#[derive(Debug, Clone)]
pub struct PRListOptions {
    pub state: Option<String>, // open, closed, all
    pub head: Option<String>,
    pub base: Option<String>,
    pub sort: Option<String>,
    pub direction: Option<String>,
    pub page: u64,
    pub per_page: u64,
}

impl Default for PRListOptions {
    fn default() -> Self {
        Self {
            state: None,
            head: None,
            base: None,
            sort: None,
            direction: None,
            page: 1,
            per_page: 30,
        }
    }
}

#[derive(Debug, Clone)]
pub struct IssueListOptions {
    pub milestone: Option<String>,
    pub state: Option<String>, // open, closed, all
    pub assignee: Option<String>,
    pub creator: Option<String>,
    pub mentioned: Option<String>,
    pub labels: Option<Vec<String>>,
    pub sort: Option<String>,
    pub direction: Option<String>,
    pub since: Option<String>,
    pub page: u64,
    pub per_page: u64,
}

impl Default for IssueListOptions {
    fn default() -> Self {
        Self {
            milestone: None,
            state: None,
            assignee: None,
            creator: None,
            mentioned: None,
            labels: None,
            sort: None,
            direction: None,
            since: None,
            page: 1,
            per_page: 30,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateIssueData {
    pub title: String,
    pub body: Option<String>,
    pub assignee: Option<String>,
    pub assignees: Option<Vec<String>>,
    pub milestone: Option<u64>,
    pub labels: Option<Vec<String>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateIssueData {
    pub title: Option<String>,
    pub body: Option<String>,
    pub assignee: Option<String>,
    pub assignees: Option<Vec<String>>,
    pub state: Option<String>, // open, closed
    pub milestone: Option<u64>,
    pub labels: Option<Vec<String>>,
}

impl PullRequest {
    /// Check if pull request can be merged
    pub fn can_merge(&self) -> bool {
        self.mergeable.unwrap_or(false) && 
        self.state == "open" && 
        !self.draft
    }
    
    /// Get merge status description
    pub fn get_merge_status(&self) -> String {
        if self.draft {
            "Draft PR".to_string()
        } else if self.state == "closed" {
            if self.merged {
                "Merged".to_string()
            } else {
                "Closed".to_string()
            }
        } else if let Some(mergeable) = self.mergeable {
            if mergeable {
                match self.mergeable_state.as_str() {
                    "clean" => "Ready to merge".to_string(),
                    "unstable" => "Merge conflicts".to_string(),
                    "dirty" => "Failing checks".to_string(),
                    _ => self.mergeable_state.clone(),
                }
            } else {
                "Cannot merge".to_string()
            }
        } else {
            "Checking...".to_string()
        }
    }
    
    /// Get PR age in days
    pub fn age_days(&self) -> Option<i64> {
        self.created_at.parse::<chrono::DateTime<chrono::Utc>>()
            .map(|created| {
                let now = chrono::Utc::now();
                (now - created).num_days()
            })
            .ok()
    }
}

impl Issue {
    /// Check if issue is open
    pub fn is_open(&self) -> bool {
        self.state == "open"
    }
    
    /// Get issue age in days
    pub fn age_days(&self) -> Option<i64> {
        self.created_at.parse::<chrono::DateTime<chrono::Utc>>()
            .map(|created| {
                let now = chrono::Utc::now();
                (now - created).num_days()
            })
            .ok()
    }
    
    /// Check if issue has specific label
    pub fn has_label(&self, label_name: &str) -> bool {
        self.labels.iter().any(|label| label.name == label_name)
    }
    
    /// Get assignee logins
    pub fn get_assignee_logins(&self) -> Vec<&str> {
        self.assignees.iter().map(|user| user.login.as_str()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pr_merge_status() {
        let mut pr = PullRequest::default();
        pr.state = "open".to_string();
        pr.draft = true;
        assert_eq!(pr.get_merge_status(), "Draft PR");
        
        pr.draft = false;
        pr.mergeable = Some(true);
        pr.mergeable_state = "clean".to_string();
        assert_eq!(pr.get_merge_status(), "Ready to merge");
        
        pr.state = "closed".to_string();
        pr.merged = true;
        assert_eq!(pr.get_merge_status(), "Merged");
    }

    #[test]
    fn test_issue_label_check() {
        let mut issue = Issue::default();
        issue.labels = vec![
            Label {
                id: 1,
                name: "bug".to_string(),
                color: "red".to_string(),
                default: false,
                description: None,
                url: "".to_string(),
            }
        ];
        
        assert!(issue.has_label("bug"));
        assert!(!issue.has_label("feature"));
    }
}