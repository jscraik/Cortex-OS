use crate::github::{GitHubClient, types::*};
use crate::Result;
use base64::{engine::general_purpose, Engine as _};
use std::collections::HashMap;
use tracing::{debug, info};

/// Repository API client for file operations, branches, and repository management
pub struct RepositoryAPI {
    client: GitHubClient,
}

impl RepositoryAPI {
    pub fn new(client: GitHubClient) -> Self {
        Self { client }
    }

    /// Get repository information
    pub async fn get_repository(&self, owner: &str, repo: &str) -> Result<Repository> {
        let endpoint = format!("/repos/{}/{}", owner, repo);
        self.client.get(&endpoint).await
    }

    /// List user's repositories
    pub async fn list_repositories(&self, options: Option<ListOptions>) -> Result<Vec<Repository>> {
        let mut endpoint = "/user/repos".to_string();

        if let Some(opts) = options {
            let query_params = vec![
                format!("page={}", opts.page),
                format!("per_page={}", opts.per_page),
                opts.sort.map(|s| format!("sort={}", s)).unwrap_or_default(),
                opts.direction.map(|d| format!("direction={}", d)).unwrap_or_default(),
            ].into_iter().filter(|s| !s.is_empty()).collect::<Vec<_>>().join("&");

            if !query_params.is_empty() {
                endpoint = format!("{}?{}", endpoint, query_params);
            }
        }

        self.client.get_paginated(&endpoint).await
    }

    /// List organization repositories
    pub async fn list_org_repositories(&self, org: &str, options: Option<ListOptions>) -> Result<Vec<Repository>> {
        let mut endpoint = format!("/orgs/{}/repos", org);

        if let Some(opts) = options {
            let query_params = vec![
                format!("page={}", opts.page),
                format!("per_page={}", opts.per_page),
                opts.sort.map(|s| format!("sort={}", s)).unwrap_or_default(),
                opts.direction.map(|d| format!("direction={}", d)).unwrap_or_default(),
            ].into_iter().filter(|s| !s.is_empty()).collect::<Vec<_>>().join("&");

            if !query_params.is_empty() {
                endpoint = format!("{}?{}", endpoint, query_params);
            }
        }

        self.client.get_paginated(&endpoint).await
    }

    /// Create a new repository
    pub async fn create_repository(&self, data: CreateRepositoryData) -> Result<Repository> {
        let endpoint = if let Some(org) = &data.org {
            format!("/orgs/{}/repos", org)
        } else {
            "/user/repos".to_string()
        };

        self.client.post(&endpoint, Some(data)).await
    }

    // File operations

    /// Get file contents
    pub async fn get_contents(&self, owner: &str, repo: &str, path: &str, ref_name: Option<&str>) -> Result<Content> {
        let mut endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);

        if let Some(ref_val) = ref_name {
            endpoint = format!("{}?ref={}", endpoint, ref_val);
        }

        let content: Content = self.client.get(&endpoint).await?;
        debug!("Retrieved content for {} in {}/{}", path, owner, repo);
        Ok(content)
    }

    /// Get directory contents
    pub async fn get_directory_contents(&self, owner: &str, repo: &str, path: &str, ref_name: Option<&str>) -> Result<Vec<Content>> {
        let mut endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);

        if let Some(ref_val) = ref_name {
            endpoint = format!("{}?ref={}", endpoint, ref_val);
        }

        let contents: Vec<Content> = self.client.get(&endpoint).await?;
        debug!("Retrieved {} items from directory {} in {}/{}", contents.len(), path, owner, repo);
        Ok(contents)
    }

    /// Create or update a file
    pub async fn create_or_update_file(
        &self,
        owner: &str,
        repo: &str,
        path: &str,
        data: FileUpdateData,
    ) -> Result<FileResponse> {
        let endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);

        let response: FileResponse = self.client.put(&endpoint, Some(data)).await?;
        info!("File {} updated in {}/{}", path, owner, repo);
        Ok(response)
    }

    /// Delete a file
    pub async fn delete_file(&self, owner: &str, repo: &str, path: &str, data: FileDeleteData) -> Result<Commit> {
        let endpoint = format!("/repos/{}/{}/contents/{}", owner, repo, path);
        // Use raw DELETE with body, then deserialize to expected response type
        let response = self
            .client
            .request_raw(reqwest::Method::DELETE, &endpoint, Some(data))
            .await?;
        let text = response.text().await.map_err(crate::error::Error::Http)?;
        let response: DeleteFileResponse = serde_json::from_str(&text)
            .map_err(crate::error::Error::Serialization)?;
        info!("File {} deleted from {}/{}", path, owner, repo);
        Ok(response.commit)
    }

    /// Get file content as string (decodes base64)
    pub async fn get_file_content_string(&self, owner: &str, repo: &str, path: &str, ref_name: Option<&str>) -> Result<String> {
        let content = self.get_contents(owner, repo, path, ref_name).await?;

        if let Some(encoded_content) = content.content {
            if content.encoding.as_ref().map(|e| e == "base64").unwrap_or(false) {
                // Decode base64 content
                let decoded_bytes = general_purpose::STANDARD
                    .decode(encoded_content.replace('\n', ""))
                    .map_err(|e| crate::error::Error::Other(anyhow::anyhow!(e)))?;
                let content_str = String::from_utf8(decoded_bytes).map_err(|e| crate::error::Error::Other(anyhow::anyhow!(e)))?;
                Ok(content_str)
            } else {
                Ok(encoded_content)
            }
        } else {
            Err(crate::error::Error::Provider(
                crate::error::ProviderError::Api("Content not available".to_string())
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
        sha: Option<&str>,
        branch: Option<&str>,
    ) -> Result<FileResponse> {
        let encoded_content = general_purpose::STANDARD.encode(content.as_bytes());

        let data = FileUpdateData {
            message: message.to_string(),
            content: encoded_content,
            sha: sha.map(|s| s.to_string()),
            branch: branch.map(|b| b.to_string()),
            committer: None,
            author: None,
        };

        self.create_or_update_file(owner, repo, path, data).await
    }

    // Branch operations

    /// List branches
    pub async fn list_branches(&self, owner: &str, repo: &str) -> Result<Vec<Branch>> {
        let endpoint = format!("/repos/{}/{}/branches", owner, repo);
        self.client.get_paginated(&endpoint).await
    }

    /// Get a specific branch
    pub async fn get_branch(&self, owner: &str, repo: &str, branch: &str) -> Result<Branch> {
        let endpoint = format!("/repos/{}/{}/branches/{}", owner, repo, branch);
        self.client.get(&endpoint).await
    }

    /// Create a new branch
    pub async fn create_branch(&self, owner: &str, repo: &str, data: CreateBranchData) -> Result<GitReference> {
        let endpoint = format!("/repos/{}/{}/git/refs", owner, repo);
    // Log fields before moving data into request body
    let ref_name = data.ref_name.clone();
    let response: GitReference = self.client.post(&endpoint, Some(data)).await?;
    info!("Branch created: {}", ref_name);
        Ok(response)
    }

    /// Delete a branch
    pub async fn delete_branch(&self, owner: &str, repo: &str, branch: &str) -> Result<()> {
        let endpoint = format!("/repos/{}/{}/git/refs/heads/{}", owner, repo, branch);
        self.client.delete(&endpoint).await?;
        info!("Branch deleted: {}", branch);
        Ok(())
    }

    // Commit operations

    /// Get commit information
    pub async fn get_commit(&self, owner: &str, repo: &str, sha: &str) -> Result<Commit> {
        let endpoint = format!("/repos/{}/{}/commits/{}", owner, repo, sha);
        self.client.get(&endpoint).await
    }

    /// List commits
    pub async fn list_commits(&self, owner: &str, repo: &str, options: Option<CommitListOptions>) -> Result<Vec<Commit>> {
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
    pub async fn compare_commits(&self, owner: &str, repo: &str, base: &str, head: &str) -> Result<Comparison> {
        let endpoint = format!("/repos/{}/{}/compare/{}...{}", owner, repo, base, head);
        self.client.get(&endpoint).await
    }

    // Tree operations for advanced file management

    /// Get a git tree
    pub async fn get_tree(&self, owner: &str, repo: &str, tree_sha: &str, recursive: bool) -> Result<GitTree> {
        let mut endpoint = format!("/repos/{}/{}/git/trees/{}", owner, repo, tree_sha);
        if recursive {
            endpoint = format!("{}?recursive=1", endpoint);
        }
        self.client.get(&endpoint).await
    }

    /// Create a git tree (for batch file operations)
    pub async fn create_tree(&self, owner: &str, repo: &str, data: CreateTreeData) -> Result<GitTree> {
        let endpoint = format!("/repos/{}/{}/git/trees", owner, repo);
    let tree_len = data.tree.len();
    let response: GitTree = self.client.post(&endpoint, Some(data)).await?;
    info!("Tree created with {} items", tree_len);
        Ok(response)
    }

    // Repository settings and metadata

    /// Get repository topics/tags
    pub async fn get_topics(&self, owner: &str, repo: &str) -> Result<Vec<String>> {
        let endpoint = format!("/repos/{}/{}/topics", owner, repo);
        let response: TopicsResponse = self.client.get(&endpoint).await?;
        Ok(response.names)
    }

    /// Update repository topics/tags
    pub async fn update_topics(&self, owner: &str, repo: &str, topics: Vec<String>) -> Result<Vec<String>> {
        let endpoint = format!("/repos/{}/{}/topics", owner, repo);
        let data = UpdateTopicsData { names: topics };
        let response: TopicsResponse = self.client.put(&endpoint, Some(data)).await?;
        Ok(response.names)
    }

    /// Get repository languages
    pub async fn get_languages(&self, owner: &str, repo: &str) -> Result<HashMap<String, u64>> {
        let endpoint = format!("/repos/{}/{}/languages", owner, repo);
        self.client.get(&endpoint).await
    }

    /// Get repository statistics
    pub async fn get_stats(&self, owner: &str, repo: &str) -> Result<RepositoryStats> {
        // GitHub doesn't provide a single stats endpoint, so we'll aggregate data
        let repo_info = self.get_repository(owner, repo).await?;
        let languages = self.get_languages(owner, repo).await?;

        Ok(RepositoryStats {
            size: repo_info.size,
            stargazers_count: repo_info.stargazers_count,
            watchers_count: repo_info.watchers_count,
            forks_count: repo_info.forks_count,
            open_issues_count: repo_info.open_issues_count,
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
pub struct GitTree {
    pub sha: String,
    pub url: String,
    pub tree: Vec<TreeEntry>,
    pub truncated: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TreeEntry {
    pub path: String,
    pub mode: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub sha: String,
    pub url: String,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateTreeData {
    pub tree: Vec<CreateTreeEntry>,
    pub base_tree: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateTreeEntry {
    pub path: String,
    pub mode: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub sha: Option<String>,
    pub content: Option<String>,
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
    pub async fn get_stats(&self, repo_api: &RepositoryAPI) -> Result<RepositoryStats> {
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

        assert_eq!(repo.get_clone_url(false), "https://github.com/user/repo.git");
        assert_eq!(repo.get_clone_url(true), "git@github.com:user/repo.git");
    }
}
