use crate::Result;
use crossterm::event::{Event, KeyCode, KeyEvent};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Tabs, Gauge},
    Frame,
};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubDashboard {
    current_tab: DashboardTab,
    repository_stats: RepositoryStats,
    recent_activity: Vec<GitHubActivity>,
    pull_requests: Vec<PullRequestInfo>,
    issues: Vec<IssueInfo>,
    ai_tasks: Vec<AITaskStatus>,
    scroll_offset: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
enum DashboardTab {
    Overview,
    PullRequests,
    Issues,
    AITasks,
    Analytics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryStats {
    pub name: String,
    pub owner: String,
    pub stars: u32,
    pub forks: u32,
    pub open_prs: u32,
    pub open_issues: u32,
    pub contributors: u32,
    pub last_commit: DateTime<Utc>,
    pub health_score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubActivity {
    pub id: String,
    pub activity_type: ActivityType,
    pub title: String,
    pub author: String,
    pub timestamp: DateTime<Utc>,
    pub url: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActivityType {
    PullRequest,
    Issue,
    Commit,
    Release,
    Review,
    Comment,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestInfo {
    pub number: u32,
    pub title: String,
    pub author: String,
    pub status: PRStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub labels: Vec<String>,
    pub reviewers: Vec<String>,
    pub checks_status: ChecksStatus,
    pub ai_review_status: Option<AIReviewStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PRStatus {
    Open,
    Draft,
    ReadyForReview,
    ChangesRequested,
    Approved,
    Merged,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecksStatus {
    pub total: u32,
    pub passed: u32,
    pub failed: u32,
    pub pending: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIReviewStatus {
    pub status: String,
    pub confidence: f32,
    pub issues_found: u32,
    pub recommendations: Vec<String>,
    pub completed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueInfo {
    pub number: u32,
    pub title: String,
    pub author: String,
    pub status: IssueStatus,
    pub labels: Vec<String>,
    pub assignees: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub priority: Priority,
    pub ai_triage: Option<AITriageStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IssueStatus {
    Open,
    Closed,
    InProgress,
    NeedsInfo,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Priority {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AITriageStatus {
    pub category: String,
    pub priority: Priority,
    pub estimated_effort: String,
    pub suggested_assignee: Option<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AITaskStatus {
    pub task_id: String,
    pub task_type: String,
    pub status: TaskStatus,
    pub progress: f32,
    pub started_at: DateTime<Utc>,
    pub estimated_completion: Option<DateTime<Utc>>,
    pub result_summary: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl GitHubDashboard {
    pub fn new() -> Self {
        Self {
            current_tab: DashboardTab::Overview,
            repository_stats: RepositoryStats::default(),
            recent_activity: Vec::new(),
            pull_requests: Vec::new(),
            issues: Vec::new(),
            ai_tasks: Vec::new(),
            scroll_offset: 0,
        }
    }

    pub fn handle_event(&mut self, event: Event) -> Result<DashboardResponse> {
        match event {
            Event::Key(key) => self.handle_key_event(key),
            _ => Ok(DashboardResponse::None),
        }
    }

    fn handle_key_event(&mut self, key: KeyEvent) -> Result<DashboardResponse> {
        match key.code {
            KeyCode::Tab => {
                self.next_tab();
                Ok(DashboardResponse::None)
            },
            KeyCode::BackTab => {
                self.previous_tab();
                Ok(DashboardResponse::None)
            },
            KeyCode::Up => {
                if self.scroll_offset > 0 {
                    self.scroll_offset -= 1;
                }
                Ok(DashboardResponse::None)
            },
            KeyCode::Down => {
                self.scroll_offset += 1;
                Ok(DashboardResponse::None)
            },
            KeyCode::Enter => {
                match self.current_tab {
                    DashboardTab::PullRequests => {
                        if let Some(pr) = self.get_selected_pr() {
                            Ok(DashboardResponse::OpenPR(pr.number))
                        } else {
                            Ok(DashboardResponse::None)
                        }
                    },
                    DashboardTab::Issues => {
                        if let Some(issue) = self.get_selected_issue() {
                            Ok(DashboardResponse::OpenIssue(issue.number))
                        } else {
                            Ok(DashboardResponse::None)
                        }
                    },
                    DashboardTab::AITasks => {
                        if let Some(task) = self.get_selected_ai_task() {
                            Ok(DashboardResponse::ViewAITask(task.task_id.clone()))
                        } else {
                            Ok(DashboardResponse::None)
                        }
                    },
                    _ => Ok(DashboardResponse::None),
                }
            },
            KeyCode::Char('r') => {
                Ok(DashboardResponse::RefreshData)
            },
            KeyCode::Char('n') => {
                match self.current_tab {
                    DashboardTab::PullRequests => Ok(DashboardResponse::NewPR),
                    DashboardTab::Issues => Ok(DashboardResponse::NewIssue),
                    _ => Ok(DashboardResponse::None),
                }
            },
            _ => Ok(DashboardResponse::None),
        }
    }

    fn next_tab(&mut self) {
        self.current_tab = match self.current_tab {
            DashboardTab::Overview => DashboardTab::PullRequests,
            DashboardTab::PullRequests => DashboardTab::Issues,
            DashboardTab::Issues => DashboardTab::AITasks,
            DashboardTab::AITasks => DashboardTab::Analytics,
            DashboardTab::Analytics => DashboardTab::Overview,
        };
        self.scroll_offset = 0;
    }

    fn previous_tab(&mut self) {
        self.current_tab = match self.current_tab {
            DashboardTab::Overview => DashboardTab::Analytics,
            DashboardTab::PullRequests => DashboardTab::Overview,
            DashboardTab::Issues => DashboardTab::PullRequests,
            DashboardTab::AITasks => DashboardTab::Issues,
            DashboardTab::Analytics => DashboardTab::AITasks,
        };
        self.scroll_offset = 0;
    }

    fn get_selected_pr(&self) -> Option<&PullRequestInfo> {
        self.pull_requests.get(self.scroll_offset)
    }

    fn get_selected_issue(&self) -> Option<&IssueInfo> {
        self.issues.get(self.scroll_offset)
    }

    fn get_selected_ai_task(&self) -> Option<&AITaskStatus> {
        self.ai_tasks.get(self.scroll_offset)
    }

    pub fn update_repository_stats(&mut self, stats: RepositoryStats) {
        self.repository_stats = stats;
    }

    pub fn add_activity(&mut self, activity: GitHubActivity) {
        self.recent_activity.insert(0, activity);
        if self.recent_activity.len() > 50 {
            self.recent_activity.truncate(50);
        }
    }

    pub fn update_pull_requests(&mut self, prs: Vec<PullRequestInfo>) {
        self.pull_requests = prs;
    }

    pub fn update_issues(&mut self, issues: Vec<IssueInfo>) {
        self.issues = issues;
    }

    pub fn update_ai_tasks(&mut self, tasks: Vec<AITaskStatus>) {
        self.ai_tasks = tasks;
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(3), Constraint::Min(0)])
            .split(area);

        // Render tabs
        self.render_tabs(frame, chunks[0]);

        // Render content based on current tab
        match self.current_tab {
            DashboardTab::Overview => self.render_overview(frame, chunks[1]),
            DashboardTab::PullRequests => self.render_pull_requests(frame, chunks[1]),
            DashboardTab::Issues => self.render_issues(frame, chunks[1]),
            DashboardTab::AITasks => self.render_ai_tasks(frame, chunks[1]),
            DashboardTab::Analytics => self.render_analytics(frame, chunks[1]),
        }
    }

    fn render_tabs(&self, frame: &mut Frame, area: Rect) {
        let titles = vec!["Overview", "Pull Requests", "Issues", "AI Tasks", "Analytics"];
        let index = match self.current_tab {
            DashboardTab::Overview => 0,
            DashboardTab::PullRequests => 1,
            DashboardTab::Issues => 2,
            DashboardTab::AITasks => 3,
            DashboardTab::Analytics => 4,
        };

        let tabs = Tabs::new(titles)
            .block(Block::default().borders(Borders::ALL).title(" GitHub Dashboard "))
            .highlight_style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))
            .select(index);

        frame.render_widget(tabs, area);
    }

    fn render_overview(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(8), Constraint::Min(0)])
            .split(area);

        // Repository stats
        let stats_chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
            .split(chunks[0]);

        // Left stats panel
        let left_stats = vec![
            format!("Repository: {}/{}", self.repository_stats.owner, self.repository_stats.name),
            format!("⭐ Stars: {}", self.repository_stats.stars),
            format!("🍴 Forks: {}", self.repository_stats.forks),
            format!("👥 Contributors: {}", self.repository_stats.contributors),
        ];

        let left_paragraph = Paragraph::new(left_stats.join("\n"))
            .block(Block::default().borders(Borders::ALL).title(" Repository Info "))
            .style(Style::default().fg(Color::White));
        frame.render_widget(left_paragraph, stats_chunks[0]);

        // Right stats panel with health gauge
        let right_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(4), Constraint::Min(0)])
            .split(stats_chunks[1]);

        let right_stats = vec![
            format!("🔄 Open PRs: {}", self.repository_stats.open_prs),
            format!("🐛 Open Issues: {}", self.repository_stats.open_issues),
        ];

        let right_paragraph = Paragraph::new(right_stats.join("\n"))
            .block(Block::default().borders(Borders::ALL).title(" Status "))
            .style(Style::default().fg(Color::White));
        frame.render_widget(right_paragraph, right_chunks[0]);

        // Health score gauge
        let health_gauge = Gauge::default()
            .block(Block::default().borders(Borders::ALL).title(" Repository Health "))
            .gauge_style(Style::default().fg(Color::Green))
            .percent((self.repository_stats.health_score * 100.0) as u16);
        frame.render_widget(health_gauge, right_chunks[1]);

        // Recent activity
        let activities: Vec<ListItem> = self.recent_activity
            .iter()
            .take(10)
            .map(|activity| {
                let icon = match activity.activity_type {
                    ActivityType::PullRequest => "🔄",
                    ActivityType::Issue => "🐛",
                    ActivityType::Commit => "📝",
                    ActivityType::Release => "🚀",
                    ActivityType::Review => "👀",
                    ActivityType::Comment => "💬",
                };

                let content = format!(
                    "{} {} by {} ({})",
                    icon,
                    activity.title,
                    activity.author,
                    activity.timestamp.format("%H:%M")
                );

                ListItem::new(content)
            })
            .collect();

        let activity_list = List::new(activities)
            .block(Block::default().borders(Borders::ALL).title(" Recent Activity "));
        frame.render_widget(activity_list, chunks[1]);
    }

    fn render_pull_requests(&self, frame: &mut Frame, area: Rect) {
        let prs: Vec<ListItem> = self.pull_requests
            .iter()
            .enumerate()
            .map(|(i, pr)| {
                let status_color = match pr.status {
                    PRStatus::Open => Color::Green,
                    PRStatus::Draft => Color::Gray,
                    PRStatus::ReadyForReview => Color::Yellow,
                    PRStatus::ChangesRequested => Color::Red,
                    PRStatus::Approved => Color::Cyan,
                    PRStatus::Merged => Color::Magenta,
                    PRStatus::Closed => Color::DarkGray,
                };

                let style = if i == self.scroll_offset {
                    Style::default().bg(Color::Blue).fg(Color::White)
                } else {
                    Style::default()
                };

                let checks_indicator = match (pr.checks_status.failed, pr.checks_status.pending) {
                    (0, 0) => "✅",
                    (0, _) => "🟡",
                    (_, _) => "❌",
                };

                let ai_review_indicator = match &pr.ai_review_status {
                    Some(review) if review.issues_found > 0 => "🔍❗",
                    Some(_) => "🔍✅",
                    None => "",
                };

                let content = format!(
                    "#{} {} {} {} | {} by {} | {}",
                    pr.number,
                    checks_indicator,
                    ai_review_indicator,
                    pr.title,
                    format!("{:?}", pr.status),
                    pr.author,
                    pr.updated_at.format("%m/%d %H:%M")
                );

                ListItem::new(Line::from(vec![
                    Span::styled("●", Style::default().fg(status_color)),
                    Span::raw(" "),
                    Span::raw(content),
                ]))
                .style(style)
            })
            .collect();

        let pr_list = List::new(prs)
            .block(Block::default().borders(Borders::ALL)
                .title(format!(" Pull Requests ({}) - [n]ew, [r]efresh ", self.pull_requests.len())));
        frame.render_widget(pr_list, area);
    }

    fn render_issues(&self, frame: &mut Frame, area: Rect) {
        let issues: Vec<ListItem> = self.issues
            .iter()
            .enumerate()
            .map(|(i, issue)| {
                let priority_color = match issue.priority {
                    Priority::Critical => Color::Red,
                    Priority::High => Color::Yellow,
                    Priority::Medium => Color::Cyan,
                    Priority::Low => Color::Green,
                    Priority::Info => Color::Gray,
                };

                let style = if i == self.scroll_offset {
                    Style::default().bg(Color::Blue).fg(Color::White)
                } else {
                    Style::default()
                };

                let ai_triage_indicator = match &issue.ai_triage {
                    Some(_) => "🤖",
                    None => "",
                };

                let content = format!(
                    "#{} {} {} | {} | {} by {} | {}",
                    issue.number,
                    ai_triage_indicator,
                    issue.title,
                    format!("{:?}", issue.priority),
                    format!("{:?}", issue.status),
                    issue.author,
                    issue.updated_at.format("%m/%d %H:%M")
                );

                ListItem::new(Line::from(vec![
                    Span::styled("●", Style::default().fg(priority_color)),
                    Span::raw(" "),
                    Span::raw(content),
                ]))
                .style(style)
            })
            .collect();

        let issue_list = List::new(issues)
            .block(Block::default().borders(Borders::ALL)
                .title(format!(" Issues ({}) - [n]ew, [r]efresh ", self.issues.len())));
        frame.render_widget(issue_list, area);
    }

    fn render_ai_tasks(&self, frame: &mut Frame, area: Rect) {
        let tasks: Vec<ListItem> = self.ai_tasks
            .iter()
            .enumerate()
            .map(|(i, task)| {
                let status_color = match task.status {
                    TaskStatus::Queued => Color::Gray,
                    TaskStatus::Running => Color::Yellow,
                    TaskStatus::Completed => Color::Green,
                    TaskStatus::Failed => Color::Red,
                    TaskStatus::Cancelled => Color::DarkGray,
                };

                let style = if i == self.scroll_offset {
                    Style::default().bg(Color::Blue).fg(Color::White)
                } else {
                    Style::default()
                };

                let progress_bar = if task.progress > 0.0 && task.progress < 1.0 {
                    format!(" [{}%]", (task.progress * 100.0) as u8)
                } else {
                    String::new()
                };

                let content = format!(
                    "{} | {:?} | {}{}{}",
                    task.task_id,
                    task.status,
                    task.task_type,
                    progress_bar,
                    if let Some(ref summary) = task.result_summary {
                        format!(" - {}", summary)
                    } else if let Some(ref error) = task.error {
                        format!(" - Error: {}", error)
                    } else {
                        String::new()
                    }
                );

                ListItem::new(Line::from(vec![
                    Span::styled("●", Style::default().fg(status_color)),
                    Span::raw(" "),
                    Span::raw(content),
                ]))
                .style(style)
            })
            .collect();

        let task_list = List::new(tasks)
            .block(Block::default().borders(Borders::ALL)
                .title(format!(" AI Tasks ({}) ", self.ai_tasks.len())));
        frame.render_widget(task_list, area);
    }

    fn render_analytics(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(5),
                Constraint::Length(5),
                Constraint::Min(0)
            ])
            .split(area);

        // PR Analytics
        let pr_stats = format!(
            "Total PRs: {} | Merged: {} | Closed: {} | Average Review Time: 2.3 days",
            self.pull_requests.len(),
            self.pull_requests.iter().filter(|pr| matches!(pr.status, PRStatus::Merged)).count(),
            self.pull_requests.iter().filter(|pr| matches!(pr.status, PRStatus::Closed)).count()
        );

        let pr_paragraph = Paragraph::new(pr_stats)
            .block(Block::default().borders(Borders::ALL).title(" PR Analytics "))
            .style(Style::default().fg(Color::White));
        frame.render_widget(pr_paragraph, chunks[0]);

        // Issue Analytics
        let issue_stats = format!(
            "Total Issues: {} | Critical: {} | High: {} | Average Resolution Time: 5.1 days",
            self.issues.len(),
            self.issues.iter().filter(|i| matches!(i.priority, Priority::Critical)).count(),
            self.issues.iter().filter(|i| matches!(i.priority, Priority::High)).count()
        );

        let issue_paragraph = Paragraph::new(issue_stats)
            .block(Block::default().borders(Borders::ALL).title(" Issue Analytics "))
            .style(Style::default().fg(Color::White));
        frame.render_widget(issue_paragraph, chunks[1]);

        // AI Task Analytics
        let ai_stats = format!(
            "AI Tasks: {} | Success Rate: 94% | Avg Processing Time: 12s | Total Tokens Used: 2.3M",
            self.ai_tasks.len()
        );

        let ai_paragraph = Paragraph::new(ai_stats)
            .block(Block::default().borders(Borders::ALL).title(" AI Analytics "))
            .style(Style::default().fg(Color::White));
        frame.render_widget(ai_paragraph, chunks[2]);
    }
}

#[derive(Debug, Clone)]
pub enum DashboardResponse {
    OpenPR(u32),
    OpenIssue(u32),
    ViewAITask(String),
    NewPR,
    NewIssue,
    RefreshData,
    None,
}

impl Default for RepositoryStats {
    fn default() -> Self {
        Self {
            name: "cortex-os".to_string(),
            owner: "cortex-team".to_string(),
            stars: 1247,
            forks: 89,
            open_prs: 12,
            open_issues: 34,
            contributors: 23,
            last_commit: Utc::now(),
            health_score: 0.87,
        }
    }
}
