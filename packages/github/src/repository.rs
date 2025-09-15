use crate::a2a_integration::GitHubEventPublisher; // bring trait into scope for publish_* methods
use crate::{types::*, GitHubClient, GitHubResult};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use std::collections::HashMap;
use tracing::{debug, info, warn};

/// Repository API client for file operations, branches, and repository management
pub struct RepositoryAPI {
    client: GitHubClient,
    event_publisher: Option<crate::a2a_integration::GitHubA2APublisher>,
}

/// Optional parameters used when updating repository files
#[derive(Debug, Clone, Copy, Default)]
pub struct FileUpdateOptions<'a> {
    pub sha: Option<&'a str>,
    pub branch: Option<&'a str>,
}

impl<'a> FileUpdateOptions<'a> {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_sha(mut self, sha: &'a str) -> Self {
        self.sha = Some(sha);
        self
    }

    pub fn with_branch(mut self, branch: &'a str) -> Self {
        self.branch = Some(branch);
        self
    }
}

impl RepositoryAPI {
    pub fn new(client: GitHubClient) -> Self {
        Self {
            client,
            event_publisher: None,
        }
    }

    pub fn with_events(
        client: GitHubClient,
        event_publisher: Option<crate::a2a_integration::GitHubA2APublisher>,
    ) -> Self {
        Self {
            client,
            event_publisher,
        }
    }

    /// Get repository information
    pub async fn get_repository(&self, owner: &str, repo: &str) -> GitHubResult<Repository> {
        let endpoint = format!("/repos/{}/{}", owner, repo);
        self.client.get(&endpoint).await
    }

    /// List user's repositories
    pub async fn list_repositories(
        &self,
        options: Option<ListOptions>,
    ) -> GitHubResult<Vec<Repository>> {
        let mut endpoint = "/user/repos".to_string();

        if let Some(opts) = options {
            let query_params = vec![
                format!("page={}", opts.page),
                format!("per_page={}", opts.per_page),
                opts.sort.map(|s| format!("sort={}", s)).unwrap_or_default(),
                opts.direction
                    .map(|d| format!("direction={}", d))
                    .unwrap_or_default(),
            ]
            .into_iter()
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join("&");

            if !query_params.is_empty() {
                endpoint = format!("{}?{}", endpoint, query_params);
            }
        }

        self.client.get_paginated(&endpoint).await
    }

    /// List organization repositories
    pub async fn list_org_repositories(
        &self,
        org: &str,
        options: Option<ListOptions>,
    ) -> GitHubResult<Vec<Repository>> {
        let mut endpoint = format!("/orgs/{}/repos", org);

        if let Some(opts) = options {
            let query_params = vec![
                format!("page={}", opts.page),
                format!("per_page={}", opts.per_page),
                opts.sort.map(|s| format!("sort={}", s)).unwrap_or_default(),
                opts.direction
                    .map(|d| format!("direction={}", d))
                    .unwrap_or_default(),
            ]
            .into_iter()
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join("&");

            if !query_params.is_empty() {
                endpoint = format!("{}?{}", endpoint, query_params);
            }
        }

        self.client.get_paginated(&endpoint).await
    }

    /// Create a new repository
    pub async fn create_repository(&self, data: CreateRepositoryData) -> GitHubResult<Repository> {
        let endpoint = if let Some(org) = &data.org {
            format!("/orgs/{}/repos", org)
        } else {
            "/user/repos".to_string()
        };

        let repo: Repository = self.client.post(&endpoint, Some(data)).await?;

        // Publish repository created event
        if let Some(publisher) = &self.event_publisher {
            let actor = match self.client.get::<crate::types::User>("/user").await {
                Ok(user) => user,
                Err(e) => {
                    warn!("Failed to fetch authenticated user: {:?}", e);
                    crate::types::User::default()
                }
            };
            let event = crate::a2a_integration::RepositoryEvent {
                action: crate::a2a_integration::RepositoryAction::Created,
                repository: repo.clone(),
                actor,
                changes: None,
            };
            if let Err(e) = publisher.publish_repository_event(event).await {
                warn!("Failed to publish repository created event: {:?}", e);
            }
        }

        Ok(repo)
    }

    // File operations

    /// Get file contents
    pub async fn get_contents(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        ref_name: Option<&str>,
    ) -> GitHubResult<Content> {
        let mut endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);

        if let Some(ref_val) = ref_name {
            endpoint = format!("{}?ref={}", endpoint, ref_val);
        }

        let content: Content = self.client.get(&endpoint).await?;
        debug!("Retrieved content for {} in {}/{}", path, owner, repo);
        Ok(content)
    }

    /// Get directory contents
    pub async fn get_directory_contents(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        ref_name: Option<&str>,
    ) -> GitHubResult<Vec<Content>> {
        let mut endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);

        if let Some(ref_val) = ref_name {
            endpoint = format!("{}?ref={}", endpoint, ref_val);
        }

        let contents: Vec<Content> = self.client.get(&endpoint).await?;
        debug!(
            "Retrieved {} items from directory {} in {}/{}",
            contents.len(),
            path,
            owner,
            repo
        );
        Ok(contents)
    }

    /// Create or update a file
    pub async fn create_or_update_file(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        data: FileUpdateData,
    ) -> GitHubResult<FileResponse> {
        let endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);

        let response: FileResponse = self.client.put(&endpoint, Some(data)).await?;
        info!("File {} updated in {}/{}", path, owner, repo);
        Ok(response)
    }

    /// Delete a file
    pub async fn delete_file(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        data: FileDeleteData,
    ) -> GitHubResult<Commit> {
        let endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);
        let response = self
            .client
            .request_raw(reqwest::Method::DELETE, &endpoint, Some(data))
            .await?;
        // Parse response
        let parsed: DeleteFileResponse = serde_json::from_slice(&response.bytes().await?)?;
        info!("File {} deleted from {}/{}", path, owner, repo);
        Ok(parsed.commit)
    }

    /// Get file content as string (decodes base64)
    pub async fn get_file_content_string(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        ref_name: Option<&str>,
    ) -> GitHubResult<String> {
        let content = self.get_contents(owner, repo, path, ref_name).await?;

        if let Some(encoded_content) = content.content {
            if content
                .encoding
                .as_ref()
                .map(|e| e == "base64")
                .unwrap_or(false)
            {
                // Decode base64 content
                let content_str = Self::decode_base64_content(&encoded_content)?;
                Ok(content_str)
            } else {
                Ok(encoded_content)
            }
        } else {
            Err(crate::error::GitHubError::Api(
                "Content not available".to_string(),
            ))
        }
    }

    /// Update file with string content (encodes to base64)
    pub async fn update_file_with_string(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        content: &str,
        message: &str,
        options: FileUpdateOptions<'_>,
    ) -> GitHubResult<FileResponse> {
        let data = Self::build_file_update_payload(content, message, options);

        self.create_or_update_file(owner, repo, path, data).await
    }

    fn decode_base64_content(encoded: &str) -> GitHubResult<String> {
        let sanitized = encoded.replace('\n', "");
        let decoded_bytes = BASE64.decode(sanitized)?;
        Ok(String::from_utf8(decoded_bytes)?)
    }

    fn build_file_update_payload(
        content: &str,
        message: &str,
        options: FileUpdateOptions<'_>,
    ) -> FileUpdateData {
        FileUpdateData {
            message: message.to_string(),
            content: BASE64.encode(content.as_bytes()),
            sha: options.sha.map(str::to_owned),
            branch: options.branch.map(str::to_owned),
            committer: None,
            author: None,
        }
    }

    // Branch operations

    /// List branches
    pub async fn list_branches(&self, owner: &str, repo: &str) -> GitHubResult<Vec<Branch>> {
        let endpoint = format!("/repos/{}/{}/branches", owner, repo);
        self.client.get_paginated(&endpoint).await
    }

    /// Get a specific branch
    pub async fn get_branch(&self, owner: &str, repo: &str, branch: &str) -> GitHubResult<Branch> {
        let endpoint = format!("/repos/{}/{}/branches/{}", owner, repo, branch);
        self.client.get(&endpoint).await
    }

    /// Create a new branch
    pub async fn create_branch(
        &self,
        owner: &str,
        repo: &str,
        data: CreateBranchData,
    ) -> GitHubResult<GitReference> {
        let endpoint = format!("/repos/{}/{}/git/refs", owner, repo);
        let data_for_log = data.clone();
        let response: GitReference = self.client.post(&endpoint, Some(data)).await?;
        info!("Branch created: {}", data_for_log.ref_name);
        Ok(response)
    }

    /// Delete a branch
    pub async fn delete_branch(&self, owner: &str, repo: &str, branch: &str) -> GitHubResult<()> {
        let endpoint = format!("/repos/{}/{}/git/refs/heads/{}", owner, repo, branch);
        self.client.delete(&endpoint).await?;
        info!("Branch deleted: {}", branch);
        Ok(())
    }

    // Commit operations

    /// Get commit information
    pub async fn get_commit(&self, owner: &str, repo: &str, sha: &str) -> GitHubResult<Commit> {
        let endpoint = format!("/repos/{}/{}/commits/{}", owner, repo, sha);
        self.client.get(&endpoint).await
    }

    /// List commits
    pub async fn list_commits(
        &self,
        owner: &str,
        repo: &str,
        options: Option<CommitListOptions>,
    ) -> GitHubResult<Vec<Commit>> {
        let mut endpoint = format!("/repos/{}/{}/commits", owner, repo);

        if let Some(opts) = options {
            let mut query_params = vec![
                format!("page={}", opts.page.unwrap_or(1)),
                format!("per_page={}", opts.per_page.unwrap_or(30)),
            ];

            if let Some(sha) = &opts.sha {
                query_params.push(format!("sha={}", sha));
            }
            if let Some(path) = &opts.path {
                query_params.push(format!("path={}", path));
            }
            if let Some(author) = &opts.author {
                query_params.push(format!("author={}", author));
            }
            if let Some(since) = &opts.since {
                query_params.push(format!("since={}", since));
            }
            if let Some(until) = &opts.until {
                query_params.push(format!("until={}", until));
            }

            let query_string = query_params.join("&");
            endpoint = format!("{}?{}", endpoint, query_string);
        }

        self.client.get_paginated(&endpoint).await
    }

    /// Compare two commits
    pub async fn compare_commits(
        &self,
        owner: &str,
        repo: &str,
        base: &str,
        head: &str,
    ) -> GitHubResult<Comparison> {
        let endpoint = format!("/repos/{}/{}/compare/{}...{}", owner, repo, base, head);
        self.client.get(&endpoint).await
    }

    // Repository settings and metadata

    /// Get repository topics/tags
    pub async fn get_topics(&self, owner: &str, repo: &str) -> GitHubResult<Vec<String>> {
        let endpoint = format!("/repos/{}/{}/topics", owner, repo);
        let response: TopicsResponse = self.client.get(&endpoint).await?;
        Ok(response.names)
    }

    /// Update repository topics/tags
    pub async fn update_topics(
        &self,
        owner: &str,
        repo: &str,
        topics: Vec<String>,
    ) -> GitHubResult<Vec<String>> {
        let endpoint = format!("/repos/{}/{}/topics", owner, repo);
        let data = UpdateTopicsData { names: topics };
        let response: TopicsResponse = self.client.put(&endpoint, Some(data)).await?;
        Ok(response.names)
    }

    /// Get repository languages
    pub async fn get_languages(
        &self,
        owner: &str,
        repo: &str,
    ) -> GitHubResult<HashMap<String, u64>> {
        let endpoint = format!("/repos/{}/{}/languages", owner, repo);
        self.client.get(&endpoint).await
    }

    /// Get repository statistics
    pub async fn get_stats(&self, owner: &str, repo: &str) -> GitHubResult<RepositoryStats> {
        // GitHub doesn't provide a single stats endpoint, so we'll aggregate data
        let repo_info = self.get_repository(owner, repo).await?;
        let languages = self.get_languages(owner, repo).await?;

        Ok(RepositoryStats {
            size: repo_info.size,
            stargazers_count: repo_info.stargazers_count,
            watchers_count: repo_info.watchers_count,
            forks_count: 0,       // Would need to be added to Repository struct
            open_issues_count: 0, // Would need to be added to Repository struct
            languages,
            default_branch: repo_info.default_branch,
            created_at: repo_info.created_at,
            updated_at: repo_info.updated_at,
            pushed_at: repo_info.pushed_at,
        })
    }
}

// Additional types for repository operations

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateRepositoryData {
    pub name: String,
    pub description: Option<String>,
    pub homepage: Option<String>,
    pub private: Option<bool>,
    pub has_issues: Option<bool>,
    pub has_projects: Option<bool>,
    pub has_wiki: Option<bool>,
    pub is_template: Option<bool>,
    pub team_id: Option<u64>,
    pub auto_init: Option<bool>,
    pub gitignore_template: Option<String>,
    pub license_template: Option<String>,
    pub allow_squash_merge: Option<bool>,
    pub allow_merge_commit: Option<bool>,
    pub allow_rebase_merge: Option<bool>,
    pub allow_auto_merge: Option<bool>,
    pub delete_branch_on_merge: Option<bool>,
    pub has_downloads: Option<bool>,
    pub org: Option<String>, // For organization repositories
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileDeleteData {
    pub message: String,
    pub sha: String,
    pub branch: Option<String>,
    pub committer: Option<CommitAuthor>,
    pub author: Option<CommitAuthor>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeleteFileResponse {
    pub content: Option<serde_json::Value>, // null for deletions
    pub commit: Commit,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GitReference {
    #[serde(rename = "ref")]
    pub ref_name: String,
    pub url: String,
    pub object: GitObject,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GitObject {
    pub sha: String,
    #[serde(rename = "type")]
    pub object_type: String,
    pub url: String,
}

#[derive(Debug, Clone)]
pub struct CommitListOptions {
    pub sha: Option<String>,
    pub path: Option<String>,
    pub author: Option<String>,
    pub since: Option<String>,
    pub until: Option<String>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Comparison {
    pub url: String,
    pub html_url: String,
    pub permalink_url: String,
    pub diff_url: String,
    pub patch_url: String,
    pub base_commit: Commit,
    pub merge_base_commit: Commit,
    pub status: String,
    pub ahead_by: u64,
    pub behind_by: u64,
    pub total_commits: u64,
    pub commits: Vec<Commit>,
    pub files: Vec<FileChange>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileChange {
    pub sha: Option<String>,
    pub filename: String,
    pub status: String,
    pub additions: u64,
    pub deletions: u64,
    pub changes: u64,
    pub blob_url: Option<String>,
    pub raw_url: Option<String>,
    pub contents_url: Option<String>,
    pub patch: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TopicsResponse {
    pub names: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateTopicsData {
    pub names: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct RepositoryStats {
    pub size: u64,
    pub stargazers_count: u64,
    pub watchers_count: u64,
    pub forks_count: u64,
    pub open_issues_count: u64,
    pub languages: HashMap<String, u64>,
    pub default_branch: String,
    pub created_at: String,
    pub updated_at: String,
    pub pushed_at: Option<String>,
}

impl Repository {
    /// Helper to get repository stats
    pub async fn get_stats(&self, repo_api: &RepositoryAPI) -> GitHubResult<RepositoryStats> {
        let owner = &self.owner.login;
        let name = &self.name;
        repo_api.get_stats(owner, name).await
    }

    /// Check if repository has certain features enabled
    pub fn has_feature(&self, feature: &str) -> bool {
        match feature {
            "issues" => self.has_issues,
            "projects" => self.has_projects,
            "wiki" => self.has_wiki,
            "pages" => self.has_pages,
            "downloads" => self.has_downloads,
            _ => false,
        }
    }

    /// Get clone URL based on preference
    pub fn get_clone_url(&self, prefer_ssh: bool) -> &str {
        if prefer_ssh {
            &self.ssh_url
        } else {
            &self.clone_url
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_repository_features() {
        let mut repo = Repository::default();
        repo.has_issues = true;
        repo.has_wiki = false;

        assert!(repo.has_feature("issues"));
        assert!(!repo.has_feature("wiki"));
        assert!(!repo.has_feature("unknown"));
    }

    #[test]
    fn test_clone_url_selection() {
        let mut repo = Repository::default();
        repo.clone_url = "https://github.com/user/repo.git".to_string();
        repo.ssh_url = "git@github.com:user/repo.git".to_string();

        assert_eq!(
            repo.get_clone_url(false),
            "https://github.com/user/repo.git"
        );
        assert_eq!(repo.get_clone_url(true), "git@github.com:user/repo.git");
    }

    #[test]
    fn decode_base64_content_strips_newlines() {
        let encoded = "Zm9v\nYmFy";
        let decoded = RepositoryAPI::decode_base64_content(encoded).expect("should decode");

        assert_eq!(decoded, "foobar");
    }

    #[test]
    fn build_file_update_payload_includes_options() {
        let options = FileUpdateOptions::default()
            .with_sha("abc123")
            .with_branch("main");

        let payload = RepositoryAPI::build_file_update_payload("hello", "update file", options);

        assert_eq!(payload.message, "update file");
        assert_eq!(payload.content, BASE64.encode("hello"));
        assert_eq!(payload.sha.as_deref(), Some("abc123"));
        assert_eq!(payload.branch.as_deref(), Some("main"));
    }
}
