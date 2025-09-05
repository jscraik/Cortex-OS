use crate::{GitHubClient, types::*, GitHubResult};
use crate::a2a_integration::GitHubEventPublisher;
use std::collections::HashMap;
use tokio::time::{interval, Duration, Instant};
use tokio_stream::{wrappers::IntervalStream, StreamExt};
use tracing::{info, warn};

/// GitHub Actions API client for workflow management and monitoring
pub struct ActionsAPI {
    client: GitHubClient,
    event_publisher: Option<crate::a2a_integration::GitHubA2APublisher>,
}

impl ActionsAPI {
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

    /// List workflows in a repository
    pub async fn list_workflows(&self, owner: &str, repo: &str) -> GitHubResult<Vec<Workflow>> {
        let endpoint = format!("/repos/{}/{}/actions/workflows", owner, repo);
        let response: ListResponse<Workflow> = self.client.get(&endpoint).await?;
        Ok(response.items)
    }

    /// Get a specific workflow
    pub async fn get_workflow(&self, owner: &str, repo: &str, workflow_id: &str) -> GitHubResult<Workflow> {
        let endpoint = format!("/repos/{}/{}/actions/workflows/{}", owner, repo, workflow_id);
        self.client.get(&endpoint).await
    }

    /// Dispatch a workflow (trigger manually)
    pub async fn dispatch_workflow(
        &self,
        owner: &str,
        repo: &str,
        workflow_id: &str,
        data: WorkflowDispatchData,
    ) -> GitHubResult<()> {
        let endpoint = format!(
            "/repos/{}/{}/actions/workflows/{}/dispatches",
            owner, repo, workflow_id
        );
        let _: () = self.client.post(&endpoint, Some(data)).await?;
        info!("Workflow dispatch triggered for {}/{} workflow {}", owner, repo, workflow_id);
        Ok(())
    }

    /// List workflow runs
    pub async fn list_workflow_runs(
        &self,
        owner: &str,
        repo: &str,
        workflow_id: Option<&str>,
    ) -> GitHubResult<Vec<WorkflowRun>> {
        let endpoint = if let Some(wf_id) = workflow_id {
            format!("/repos/{}/{}/actions/workflows/{}/runs", owner, repo, wf_id)
        } else {
            format!("/repos/{}/{}/actions/runs", owner, repo)
        };

        let response: ListResponse<WorkflowRun> = self.client.get(&endpoint).await?;
        Ok(response.items)
    }

    /// Get a specific workflow run
    pub async fn get_workflow_run(&self, owner: &str, repo: &str, run_id: u64) -> GitHubResult<WorkflowRun> {
        let endpoint = format!("/repos/{}/{}/actions/runs/{}", owner, repo, run_id);
        let run: WorkflowRun = self.client.get(&endpoint).await?;

        // Publish workflow event
        if let Some(publisher) = &self.event_publisher {
            let action = match run.status.as_str() {
                "queued" => crate::a2a_integration::WorkflowAction::Requested,
                "in_progress" => crate::a2a_integration::WorkflowAction::InProgress,
                "completed" => {
                    match run.conclusion.as_deref() {
                        Some("success") => crate::a2a_integration::WorkflowAction::Completed,
                        Some("failure") => crate::a2a_integration::WorkflowAction::Failed,
                        Some("cancelled") => crate::a2a_integration::WorkflowAction::Cancelled,
                        _ => crate::a2a_integration::WorkflowAction::Completed,
                    }
                },
                _ => crate::a2a_integration::WorkflowAction::Started,
            };

            let event = crate::a2a_integration::WorkflowEvent {
                action,
                workflow_run: run.clone(),
                repository: run.repository.clone(),
                actor: run.actor.clone(),
            };

            if let Err(e) = publisher.publish_workflow_event(event).await {
                warn!("Failed to publish workflow event: {:?}", e);
            }
        }

        Ok(run)
    }

    /// Cancel a workflow run
    pub async fn cancel_workflow_run(&self, owner: &str, repo: &str, run_id: u64) -> GitHubResult<()> {
        let endpoint = format!("/repos/{}/{}/actions/runs/{}/cancel", owner, repo, run_id);
        let _: () = self.client.post(&endpoint, None::<()>).await?;
        info!("Cancelled workflow run {}", run_id);
        Ok(())
    }

    /// Re-run a workflow run
    pub async fn rerun_workflow_run(&self, owner: &str, repo: &str, run_id: u64) -> GitHubResult<()> {
        let endpoint = format!("/repos/{}/{}/actions/runs/{}/rerun", owner, repo, run_id);
        let _: () = self.client.post(&endpoint, None::<()>).await?;
        info!("Re-running workflow run {}", run_id);
        Ok(())
    }

    /// Get workflow run logs
    pub async fn get_workflow_run_logs(&self, owner: &str, repo: &str, run_id: u64) -> GitHubResult<bytes::Bytes> {
        let endpoint = format!("/repos/{}/{}/actions/runs/{}/logs", owner, repo, run_id);
        self.client.download(&format!("https://api.github.com{}", endpoint)).await
    }

    /// List jobs for a workflow run
    pub async fn list_jobs(&self, owner: &str, repo: &str, run_id: u64) -> GitHubResult<Vec<Job>> {
        let endpoint = format!("/repos/{}/{}/actions/runs/{}/jobs", owner, repo, run_id);
        let response: ListResponse<Job> = self.client.get(&endpoint).await?;
        Ok(response.items)
    }

    /// Get a specific job
    pub async fn get_job(&self, owner: &str, repo: &str, job_id: u64) -> GitHubResult<Job> {
        let endpoint = format!("/repos/{}/{}/actions/jobs/{}", owner, repo, job_id);
        self.client.get(&endpoint).await
    }

    /// Get job logs
    pub async fn get_job_logs(&self, owner: &str, repo: &str, job_id: u64) -> GitHubResult<String> {
        let endpoint = format!("/repos/{}/{}/actions/jobs/{}/logs", owner, repo, job_id);
        let response = self.client.request_raw(reqwest::Method::GET, &endpoint, None::<()>).await?;
        let text = response.text().await?;
        Ok(text)
    }

    /// List artifacts for a repository or workflow run
    pub async fn list_artifacts(&self, owner: &str, repo: &str, run_id: Option<u64>) -> GitHubResult<Vec<Artifact>> {
        let endpoint = if let Some(run_id) = run_id {
            format!("/repos/{}/{}/actions/runs/{}/artifacts", owner, repo, run_id)
        } else {
            format!("/repos/{}/{}/actions/artifacts", owner, repo)
        };

        let response: ListResponse<Artifact> = self.client.get(&endpoint).await?;
        Ok(response.items)
    }

    /// Download an artifact
    pub async fn download_artifact(&self, owner: &str, repo: &str, artifact_id: u64) -> GitHubResult<bytes::Bytes> {
        let endpoint = format!("/repos/{}/{}/actions/artifacts/{}/zip", owner, repo, artifact_id);
        self.client.download(&format!("https://api.github.com{}", endpoint)).await
    }

    /// Get repository secrets (names only for security)
    pub async fn list_repository_secrets(&self, owner: &str, repo: &str) -> GitHubResult<Vec<String>> {
        let endpoint = format!("/repos/{}/{}/actions/secrets", owner, repo);
        let response: serde_json::Value = self.client.get(&endpoint).await?;

        let secrets = response.get("secrets")
            .and_then(|s| s.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|secret| secret.get("name").and_then(|n| n.as_str().map(|s| s.to_string())))
                    .collect()
            })
            .unwrap_or_default();

        Ok(secrets)
    }

    /// Get repository variables
    pub async fn list_repository_variables(&self, owner: &str, repo: &str) -> GitHubResult<Vec<RepositoryVariable>> {
        let endpoint = format!("/repos/{}/{}/actions/variables", owner, repo);
        let response: ListResponse<RepositoryVariable> = self.client.get(&endpoint).await?;
        Ok(response.items)
    }
}

/// Repository variable structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RepositoryVariable {
    pub name: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Workflow monitoring for real-time updates
pub struct WorkflowMonitor {
    actions_api: ActionsAPI,
    active_runs: HashMap<u64, WorkflowRun>,
    callbacks: Vec<Box<dyn Fn(&WorkflowRunEvent) + Send + Sync>>,
}

#[derive(Debug, Clone)]
pub struct WorkflowRunEvent {
    pub run_id: u64,
    pub event_type: WorkflowEventType,
    pub run: WorkflowRun,
    pub previous_status: Option<String>,
    pub jobs: Option<Vec<Job>>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum WorkflowEventType {
    Started,
    InProgress,
    Completed,
    StatusChanged,
    JobCompleted,
}

impl WorkflowMonitor {
    pub fn new(actions_api: ActionsAPI) -> Self {
        Self {
            actions_api,
            active_runs: HashMap::new(),
            callbacks: Vec::new(),
        }
    }

    /// Add a callback for workflow events
    pub fn on_event<F>(&mut self, callback: F)
    where
        F: Fn(&WorkflowRunEvent) + Send + Sync + 'static,
    {
        self.callbacks.push(Box::new(callback));
    }

    /// Start monitoring workflow runs for a repository
    pub async fn start_monitoring(&mut self, owner: String, repo: String) -> GitHubResult<()> {
        let mut interval_stream = IntervalStream::new(interval(Duration::from_secs(10)));

        info!("Starting workflow monitoring for {}/{}", owner, repo);

        while let Some(_) = interval_stream.next().await {
            if let Err(e) = self.poll_workflow_runs(&owner, &repo).await {
                warn!("Error polling workflow runs: {:?}", e);
                // Continue monitoring even if one poll fails
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }

        Ok(())
    }

    async fn poll_workflow_runs(&mut self, owner: &str, repo: &str) -> GitHubResult<()> {
        let runs = self.actions_api.list_workflow_runs(owner, repo, None).await?;

        for run in runs {
            let previous_run = self.active_runs.get(&run.id);

            // Check for new or updated runs
            if previous_run.is_none() && (run.status == "queued" || run.status == "in_progress") {
                // New active run
                let event = WorkflowRunEvent {
                    run_id: run.id,
                    event_type: WorkflowEventType::Started,
                    run: run.clone(),
                    previous_status: None,
                    jobs: None,
                };

                self.emit_event(&event).await;
                self.active_runs.insert(run.id, run);
            } else if let Some(prev_run) = previous_run {
                if prev_run.status != run.status {
                    // Status changed
                    let event_type = if run.status == "completed" {
                        WorkflowEventType::Completed
                    } else {
                        WorkflowEventType::StatusChanged
                    };

                    let event = WorkflowRunEvent {
                        run_id: run.id,
                        event_type,
                        run: run.clone(),
                        previous_status: Some(prev_run.status.clone()),
                        jobs: None,
                    };

                    self.emit_event(&event).await;
                    self.active_runs.insert(run.id, run);
                }
            }
        }

        // Remove completed runs older than 1 hour
        let cutoff = Instant::now() - Duration::from_secs(3600);
        self.active_runs.retain(|_, run| {
            run.status != "completed" ||
            run.updated_at.parse::<chrono::DateTime<chrono::Utc>>()
                .map(|dt| dt.timestamp() as u64 > cutoff.elapsed().as_secs())
                .unwrap_or(true)
        });

        Ok(())
    }

    async fn emit_event(&self, event: &WorkflowRunEvent) {
        for callback in &self.callbacks {
            callback(event);
        }
    }

    /// Get currently monitored runs
    pub fn get_active_runs(&self) -> &HashMap<u64, WorkflowRun> {
        &self.active_runs
    }
}

/// Workflow validation and analysis
pub struct WorkflowValidator {
    actions_api: ActionsAPI,
}

impl WorkflowValidator {
    pub fn new(actions_api: ActionsAPI) -> Self {
        Self { actions_api }
    }

    /// Validate a workflow file from the repository
    pub async fn validate_workflow_file(
        &self,
        _owner: &str,
        _repo: &str,
        _workflow_path: &str,
    ) -> GitHubResult<ValidationResult> {
        // This would fetch the workflow file content and validate it
        // For now, return a placeholder
        Ok(ValidationResult {
            valid: true,
            errors: vec![],
            warnings: vec!["Workflow validation not yet implemented".to_string()],
        })
    }

    /// Analyze workflow performance and suggest optimizations
    pub async fn analyze_workflow_performance(
        &self,
        owner: &str,
        repo: &str,
        workflow_id: u64,
        days: u32,
    ) -> GitHubResult<WorkflowAnalysis> {
        let runs = self.actions_api.list_workflow_runs(owner, repo, Some(&workflow_id.to_string())).await?;

        // Filter runs from the last N days
        let cutoff = chrono::Utc::now() - chrono::Duration::days(days as i64);
        let recent_runs: Vec<_> = runs.into_iter()
            .filter(|run| {
                run.created_at.parse::<chrono::DateTime<chrono::Utc>>()
                    .map(|dt| dt > cutoff)
                    .unwrap_or(false)
            })
            .collect();

        if recent_runs.is_empty() {
            return Ok(WorkflowAnalysis {
                total_runs: 0,
                success_rate: 0.0,
                average_duration_minutes: 0.0,
                failure_reasons: HashMap::new(),
                recommendations: vec!["No recent runs to analyze".to_string()],
            });
        }

        let total_runs = recent_runs.len();
        let successful_runs = recent_runs.iter()
            .filter(|run| run.conclusion.as_ref().map(|c| c == "success").unwrap_or(false))
            .count();

        let success_rate = (successful_runs as f64 / total_runs as f64) * 100.0;

        // Calculate average duration
        let mut total_duration_secs = 0u64;
        let mut runs_with_duration = 0;

        for run in &recent_runs {
            if let (Some(started), Some(updated)) = (&run.run_started_at, Some(&run.updated_at)) {
                if let (Ok(start_time), Ok(end_time)) = (
                    started.parse::<chrono::DateTime<chrono::Utc>>(),
                    updated.parse::<chrono::DateTime<chrono::Utc>>()
                ) {
                    total_duration_secs += (end_time - start_time).num_seconds() as u64;
                    runs_with_duration += 1;
                }
            }
        }

        let average_duration_minutes = if runs_with_duration > 0 {
            (total_duration_secs as f64 / runs_with_duration as f64) / 60.0
        } else {
            0.0
        };

        // Analyze failure reasons
        let mut failure_reasons = HashMap::new();
        for run in &recent_runs {
            if let Some(conclusion) = &run.conclusion {
                if conclusion != "success" {
                    *failure_reasons.entry(conclusion.clone()).or_insert(0) += 1;
                }
            }
        }

        // Generate recommendations
        let mut recommendations = Vec::new();
        if success_rate < 80.0 {
            recommendations.push("Success rate is below 80%. Consider reviewing recent failures.".to_string());
        }
        if average_duration_minutes > 30.0 {
            recommendations.push("Workflow takes more than 30 minutes on average. Consider optimization.".to_string());
        }

        Ok(WorkflowAnalysis {
            total_runs,
            success_rate,
            average_duration_minutes,
            failure_reasons,
            recommendations,
        })
    }
}

#[derive(Debug, Clone)]
pub struct WorkflowAnalysis {
    pub total_runs: usize,
    pub success_rate: f64,
    pub average_duration_minutes: f64,
    pub failure_reasons: HashMap<String, u32>,
    pub recommendations: Vec<String>,
}

/// Workflow template generator
pub struct WorkflowTemplate;

impl WorkflowTemplate {
    /// Generate a basic CI/CD workflow for different languages/frameworks
    pub fn generate_ci_workflow(language: &str, framework: Option<&str>) -> String {
        match language.to_lowercase().as_str() {
            "rust" => Self::rust_workflow(),
            "node" | "nodejs" | "javascript" | "typescript" => {
                Self::nodejs_workflow(framework.unwrap_or("npm"))
            }
            "python" => Self::python_workflow(),
            "go" => Self::go_workflow(),
            _ => Self::generic_workflow(),
        }
    }

    fn rust_workflow() -> String {
        r#"name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  CARGO_TERM_COLOR: always

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Install Rust
      uses: dtolnay/rust-toolchain@stable
      with:
        components: clippy, rustfmt

    - name: Setup cache
      uses: Swatinem/rust-cache@v2

    - name: Check formatting
      run: cargo fmt --all -- --check

    - name: Check clippy
      run: cargo clippy --all-targets --all-features -- -D warnings

    - name: Run tests
      run: cargo test --all-features --verbose

    - name: Build release
      run: cargo build --release --verbose
"#.to_string()
    }

    fn nodejs_workflow(package_manager: &str) -> String {
        let (install_cmd, run_cmd) = match package_manager {
            "yarn" => ("yarn install --frozen-lockfile", "yarn"),
            "pnpm" => ("pnpm install --frozen-lockfile", "pnpm"),
            _ => ("npm ci", "npm run"),
        };

        format!(r#"name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js ${{{{ matrix.node-version }}}}
      uses: actions/setup-node@v4
      with:
        node-version: ${{{{ matrix.node-version }}}}
        cache: '{}'

    - name: Install dependencies
      run: {}

    - name: Lint
      run: {} lint

    - name: Type check
      run: {} type-check

    - name: Run tests
      run: {} test

    - name: Build
      run: {} build
"#, package_manager, install_cmd, run_cmd, run_cmd, run_cmd, run_cmd)
    }

    fn python_workflow() -> String {
        r#"name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest

    strategy:
      matrix:
        python-version: ["3.9", "3.10", "3.11", "3.12", "3.13"]

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}

    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt

    - name: Lint with flake8
      run: |
        pip install flake8
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

    - name: Test with pytest
      run: |
        pip install pytest
        pytest
"#.to_string()
    }

    fn go_workflow() -> String {
        r#"name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'

    - name: Verify dependencies
      run: go mod verify

    - name: Build
      run: go build -v ./...

    - name: Run tests
      run: go test -race -vet=off ./...
"#.to_string()
    }

    fn generic_workflow() -> String {
        r#"name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    name: Build and Test
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    # Add your build and test steps here
    - name: Run tests
      run: echo "Add your test commands here"

    - name: Build
      run: echo "Add your build commands here"
"#.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workflow_template_generation() {
        let rust_workflow = WorkflowTemplate::generate_ci_workflow("rust", None);
        assert!(rust_workflow.contains("cargo test"));
        assert!(rust_workflow.contains("cargo fmt"));

        let node_workflow = WorkflowTemplate::generate_ci_workflow("nodejs", Some("npm"));
        assert!(node_workflow.contains("npm ci"));
        assert!(node_workflow.contains("npm run"));

        let yarn_workflow = WorkflowTemplate::generate_ci_workflow("nodejs", Some("yarn"));
        assert!(yarn_workflow.contains("yarn install"));
        assert!(yarn_workflow.contains("yarn"));
    }

    #[tokio::test]
    async fn test_workflow_event_types() {
        let event = WorkflowRunEvent {
            run_id: 123,
            event_type: WorkflowEventType::Started,
            run: WorkflowRun {
                id: 123,
                status: "queued".to_string(),
                name: Some("Test".to_string()),
                head_branch: Some("main".to_string()),
                head_sha: "abc123".to_string(),
                path: ".github/workflows/ci.yml".to_string(),
                display_title: "Test workflow".to_string(),
                run_number: 1,
                event: "push".to_string(),
                conclusion: None,
                workflow_id: 456,
                check_suite_id: 789,
                check_suite_node_id: "MDEwOkNoZWNrU3VpdGU=".to_string(),
                url: "https://api.github.com/repos/owner/repo/actions/runs/123".to_string(),
                html_url: "https://github.com/owner/repo/actions/runs/123".to_string(),
                created_at: "2023-01-01T00:00:00Z".to_string(),
                updated_at: "2023-01-01T00:00:00Z".to_string(),
                actor: User::default(),
                run_attempt: 1,
                referenced_workflows: vec![],
                run_started_at: Some("2023-01-01T00:00:00Z".to_string()),
                triggering_actor: User::default(),
                jobs_url: "https://api.github.com/repos/owner/repo/actions/runs/123/jobs".to_string(),
                logs_url: "https://api.github.com/repos/owner/repo/actions/runs/123/logs".to_string(),
                check_suite_url: "https://api.github.com/repos/owner/repo/check-suites/789".to_string(),
                artifacts_url: "https://api.github.com/repos/owner/repo/actions/runs/123/artifacts".to_string(),
                cancel_url: "https://api.github.com/repos/owner/repo/actions/runs/123/cancel".to_string(),
                rerun_url: "https://api.github.com/repos/owner/repo/actions/runs/123/rerun".to_string(),
                previous_attempt_url: None,
                workflow_url: "https://api.github.com/repos/owner/repo/actions/workflows/456".to_string(),
                head_commit: Commit {
                    sha: "abc123".to_string(),
                    url: "".to_string(),
                    html_url: "".to_string(),
                    author: GitUser {
                        name: "Test User".to_string(),
                        email: "test@example.com".to_string(),
                        date: "2023-01-01T00:00:00Z".to_string(),
                    },
                    committer: GitUser {
                        name: "Test User".to_string(),
                        email: "test@example.com".to_string(),
                        date: "2023-01-01T00:00:00Z".to_string(),
                    },
                    message: "Test commit".to_string(),
                    tree: Tree {
                        sha: "def456".to_string(),
                        url: "".to_string(),
                    },
                    parents: vec![],
                    verification: Verification {
                        verified: false,
                        reason: "unsigned".to_string(),
                        signature: None,
                        payload: None,
                    },
                    stats: None,
                },
                repository: Repository::default(),
                head_repository: Repository::default(),
            },
            previous_status: None,
            jobs: None,
        };

        assert_eq!(event.event_type, WorkflowEventType::Started);
        assert_eq!(event.run_id, 123);
    }
}
