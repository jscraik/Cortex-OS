# GitKraken MCP Authentication Configuration

## Environment Variables

Create a `.env` file in your Cortex-OS root directory with the following variables:

```bash
# GitKraken Authentication
GITKRAKEN_API_TOKEN=your_gitkraken_api_token_here

# GitHub Authentication
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_USERNAME=your_github_username

# GitLab Authentication
GITLAB_TOKEN=your_gitlab_personal_access_token_here
GITLAB_URL=https://gitlab.com  # or your self-hosted GitLab instance

# Jira Authentication
JIRA_USERNAME=your_jira_email@example.com
JIRA_API_TOKEN=your_jira_api_token_here
JIRA_URL=your_jira_instance.atlassian.net

# Azure DevOps (Optional)
AZURE_DEVOPS_TOKEN=your_azure_devops_pat_here
AZURE_ORGANIZATION=your_azure_organization

# Linear (Optional)
LINEAR_API_KEY=your_linear_api_key_here
```

## Setup Instructions

### 1. GitKraken API Token
1. Log into GitKraken
2. Go to Settings → API Tokens
3. Generate a new token
4. Add to `GITKRAKEN_API_TOKEN`

### 2. GitHub Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with scopes:
   - `repo` (for repository operations)
   - `issues:write` (for issue management)
   - `pull_requests:write` (for PR operations)
3. Add to `GITHUB_TOKEN`

### 3. GitLab Personal Access Token
1. Go to GitLab User Settings → Access Tokens
2. Generate token with scopes:
   - `api` (full API access)
   - `read_repository` (read repository data)
   - `write_repository` (write to repositories)
3. Add to `GITLAB_TOKEN`

### 4. Jira API Token
1. Log into Atlassian account
2. Go to Account Settings → Security → API tokens
3. Create and manage API tokens
4. Add email to `JIRA_USERNAME` and token to `JIRA_API_TOKEN`

## Usage Examples

Once configured, the GitKraken MCP server can:

- **Git Operations**: `git_status`, `git_add_or_commit`, `git_branch`, `git_checkout`
- **GitHub Integration**: `pull_request_create`, `issues_get_detail`, `repository_get_file_content`
- **GitLab Integration**: Same tools as GitHub, using GitLab endpoints
- **Jira Integration**: Issue tracking and management
- **Multi-platform**: Azure DevOps and Linear support

## Security Notes

- Store tokens securely in environment variables
- Rotate tokens regularly
- Use minimum required scopes for each token
- Never commit tokens to version control