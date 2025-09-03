use crate::Result;
use crossterm::event::{Event, KeyCode, KeyEvent};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2aEventStream {
    events: VecDeque<A2aEvent>,
    agents: HashMap<String, AgentStatus>,
    selected_index: usize,
    scroll_offset: usize,
    filter_level: LogLevel,
    paused: bool,
    show_details: bool,
    max_events: usize,
    stats: StreamStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2aEvent {
    pub id: String,
    pub event_type: String,
    pub source_agent: String,
    pub target_agent: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub payload: serde_json::Value,
    pub level: LogLevel,
    pub status: EventStatus,
    pub processing_time_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventStatus {
    Sent,
    Delivered,
    Processing,
    Completed,
    Failed,
    Timeout,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    pub name: String,
    pub status: AgentState,
    pub last_seen: DateTime<Utc>,
    pub events_sent: u64,
    pub events_received: u64,
    pub avg_response_time_ms: f64,
    pub error_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentState {
    Online,
    Offline,
    Busy,
    Error,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamStats {
    pub total_events: u64,
    pub events_per_second: f64,
    pub active_agents: u32,
    pub error_rate: f64,
    pub avg_processing_time_ms: f64,
    pub memory_usage_mb: f64,
}

#[derive(Debug, Clone)]
pub enum A2aStreamResponse {
    PauseResume,
    ToggleDetails,
    ClearEvents,
    FilterLevel(LogLevel),
    InspectEvent(String),
    None,
}

impl A2aEventStream {
    pub fn new() -> Self {
        Self {
            events: VecDeque::new(),
            agents: HashMap::new(),
            selected_index: 0,
            scroll_offset: 0,
            filter_level: LogLevel::Info,
            paused: false,
            show_details: false,
            max_events: 1000,
            stats: StreamStats::default(),
        }
    }

    pub fn add_event(&mut self, event: A2aEvent) {
        if self.paused {
            return;
        }

        // Update agent status
        self.update_agent_status(&event);

        // Add event to stream
        self.events.push_front(event.clone());

        // Maintain max events limit
        if self.events.len() > self.max_events {
            self.events.pop_back();
        }

        // Update stats
        self.update_stats(&event);
    }

    fn update_agent_status(&mut self, event: &A2aEvent) {
        let agent = self.agents.entry(event.source_agent.clone())
            .or_insert_with(|| AgentStatus {
                name: event.source_agent.clone(),
                status: AgentState::Online,
                last_seen: event.timestamp,
                events_sent: 0,
                events_received: 0,
                avg_response_time_ms: 0.0,
                error_count: 0,
            });

        agent.last_seen = event.timestamp;
        agent.events_sent += 1;

        if matches!(event.status, EventStatus::Failed) {
            agent.error_count += 1;
            agent.status = AgentState::Error;
        } else {
            agent.status = AgentState::Online;
        }

        // Update response time if available
        if let Some(processing_time) = event.processing_time_ms {
            let new_avg = (agent.avg_response_time_ms * (agent.events_sent as f64 - 1.0) + processing_time as f64) / agent.events_sent as f64;
            agent.avg_response_time_ms = new_avg;
        }

        // Update target agent if specified
        if let Some(ref target) = event.target_agent {
            let target_agent = self.agents.entry(target.clone())
                .or_insert_with(|| AgentStatus {
                    name: target.clone(),
                    status: AgentState::Online,
                    last_seen: event.timestamp,
                    events_sent: 0,
                    events_received: 0,
                    avg_response_time_ms: 0.0,
                    error_count: 0,
                });
            target_agent.events_received += 1;
        }
    }

    fn update_stats(&mut self, event: &A2aEvent) {
        self.stats.total_events += 1;
        self.stats.active_agents = self.agents.len() as u32;

        if matches!(event.status, EventStatus::Failed) {
            self.stats.error_rate = (self.stats.error_rate * (self.stats.total_events as f64 - 1.0) + 1.0) / self.stats.total_events as f64;
        } else {
            self.stats.error_rate = (self.stats.error_rate * (self.stats.total_events as f64 - 1.0)) / self.stats.total_events as f64;
        }

        if let Some(processing_time) = event.processing_time_ms {
            let new_avg = (self.stats.avg_processing_time_ms * (self.stats.total_events as f64 - 1.0) + processing_time as f64) / self.stats.total_events as f64;
            self.stats.avg_processing_time_ms = new_avg;
        }
    }

    pub fn handle_event(&mut self, event: Event) -> Result<A2aStreamResponse> {
        match event {
            Event::Key(key) => self.handle_key_event(key),
            _ => Ok(A2aStreamResponse::None),
        }
    }

    fn handle_key_event(&mut self, key: KeyEvent) -> Result<A2aStreamResponse> {
        match key.code {
            KeyCode::Up => {
                if self.selected_index > 0 {
                    self.selected_index -= 1;
                }
                Ok(A2aStreamResponse::None)
            },
            KeyCode::Down => {
                let filtered_count = self.get_filtered_events().len();
                if self.selected_index < filtered_count.saturating_sub(1) {
                    self.selected_index += 1;
                }
                Ok(A2aStreamResponse::None)
            },
            KeyCode::PageUp => {
                self.selected_index = self.selected_index.saturating_sub(10);
                Ok(A2aStreamResponse::None)
            },
            KeyCode::PageDown => {
                let filtered_count = self.get_filtered_events().len();
                self.selected_index = (self.selected_index + 10).min(filtered_count.saturating_sub(1));
                Ok(A2aStreamResponse::None)
            },
            KeyCode::Enter => {
                if let Some(event) = self.get_selected_event() {
                    Ok(A2aStreamResponse::InspectEvent(event.id.clone()))
                } else {
                    Ok(A2aStreamResponse::None)
                }
            },
            KeyCode::Char(' ') => {
                self.paused = !self.paused;
                Ok(A2aStreamResponse::PauseResume)
            },
            KeyCode::Char('d') => {
                self.show_details = !self.show_details;
                Ok(A2aStreamResponse::ToggleDetails)
            },
            KeyCode::Char('c') => {
                Ok(A2aStreamResponse::ClearEvents)
            },
            KeyCode::Char('1') => Ok(A2aStreamResponse::FilterLevel(LogLevel::Debug)),
            KeyCode::Char('2') => Ok(A2aStreamResponse::FilterLevel(LogLevel::Info)),
            KeyCode::Char('3') => Ok(A2aStreamResponse::FilterLevel(LogLevel::Warning)),
            KeyCode::Char('4') => Ok(A2aStreamResponse::FilterLevel(LogLevel::Error)),
            KeyCode::Char('5') => Ok(A2aStreamResponse::FilterLevel(LogLevel::Critical)),
            _ => Ok(A2aStreamResponse::None),
        }
    }

    fn get_filtered_events(&self) -> Vec<&A2aEvent> {
        self.events
            .iter()
            .filter(|event| self.should_show_event(event))
            .collect()
    }

    fn should_show_event(&self, event: &A2aEvent) -> bool {
        match (&self.filter_level, &event.level) {
            (LogLevel::Debug, _) => true,
            (LogLevel::Info, LogLevel::Debug) => false,
            (LogLevel::Info, _) => true,
            (LogLevel::Warning, LogLevel::Debug | LogLevel::Info) => false,
            (LogLevel::Warning, _) => true,
            (LogLevel::Error, LogLevel::Debug | LogLevel::Info | LogLevel::Warning) => false,
            (LogLevel::Error, _) => true,
            (LogLevel::Critical, LogLevel::Critical) => true,
            (LogLevel::Critical, _) => false,
        }
    }

    fn get_selected_event(&self) -> Option<&A2aEvent> {
        let filtered_events = self.get_filtered_events();
        filtered_events.get(self.selected_index).copied()
    }

    pub fn set_filter_level(&mut self, level: LogLevel) {
        self.filter_level = level;
        self.selected_index = 0;
    }

    pub fn clear_events(&mut self) {
        self.events.clear();
        self.selected_index = 0;
        self.stats = StreamStats::default();
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(4),  // Stats
                Constraint::Length(4),  // Agents status
                Constraint::Min(0),     // Events
            ])
            .split(area);

        // Render stats
        self.render_stats(frame, chunks[0]);

        // Render agents
        self.render_agents(frame, chunks[1]);

        // Render events
        self.render_events(frame, chunks[2]);
    }

    fn render_stats(&self, frame: &mut Frame, area: Rect) {
        let stats_chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
            .split(area);

        // Left stats
        let left_stats = vec![
            format!("Total Events: {}", self.stats.total_events),
            format!("Events/sec: {:.2}", self.stats.events_per_second),
        ];

        let left_paragraph = Paragraph::new(left_stats.join("\n"))
            .block(Block::default().borders(Borders::ALL).title(" Event Stats "))
            .style(Style::default().fg(Color::White));
        frame.render_widget(left_paragraph, stats_chunks[0]);

        // Right stats with pause indicator
        let pause_indicator = if self.paused { " [PAUSED]" } else { "" };
        let right_stats = vec![
            format!("Active Agents: {}", self.stats.active_agents),
            format!("Error Rate: {:.2}%{}", self.stats.error_rate * 100.0, pause_indicator),
        ];

        let right_color = if self.paused { Color::Yellow } else { Color::White };
        let right_paragraph = Paragraph::new(right_stats.join("\n"))
            .block(Block::default().borders(Borders::ALL).title(" System Status "))
            .style(Style::default().fg(right_color));
        frame.render_widget(right_paragraph, stats_chunks[1]);
    }

    fn render_agents(&self, frame: &mut Frame, area: Rect) {
        let mut agent_items: Vec<_> = self.agents.values().collect();
        agent_items.sort_by(|a, b| b.last_seen.cmp(&a.last_seen));

        let agents_display: String = agent_items
            .iter()
            .take(10)
            .map(|agent| {
                let status_icon = match agent.status {
                    AgentState::Online => "🟢",
                    AgentState::Offline => "🔴",
                    AgentState::Busy => "🟡",
                    AgentState::Error => "🔥",
                    AgentState::Unknown => "⚪",
                };
                format!("{} {} (S:{} R:{} E:{})", status_icon, agent.name, agent.events_sent, agent.events_received, agent.error_count)
            })
            .collect::<Vec<_>>()
            .join(" | ");

        let agents_paragraph = Paragraph::new(agents_display)
            .block(Block::default().borders(Borders::ALL).title(" Active Agents "))
            .style(Style::default().fg(Color::Cyan))
            .wrap(ratatui::widgets::Wrap { trim: true });
        frame.render_widget(agents_paragraph, area);
    }

    fn render_events(&self, frame: &mut Frame, area: Rect) {
        let filtered_events = self.get_filtered_events();

        let events: Vec<ListItem> = filtered_events
            .iter()
            .enumerate()
            .map(|(i, event)| {
                let level_color = match event.level {
                    LogLevel::Debug => Color::DarkGray,
                    LogLevel::Info => Color::Cyan,
                    LogLevel::Warning => Color::Yellow,
                    LogLevel::Error => Color::Red,
                    LogLevel::Critical => Color::Magenta,
                };

                let status_icon = match event.status {
                    EventStatus::Sent => "📤",
                    EventStatus::Delivered => "📨",
                    EventStatus::Processing => "⚙️",
                    EventStatus::Completed => "✅",
                    EventStatus::Failed => "❌",
                    EventStatus::Timeout => "⏱️",
                };

                let style = if i == self.selected_index {
                    Style::default().bg(Color::Blue).fg(Color::White)
                } else {
                    Style::default()
                };

                let time_str = event.timestamp.format("%H:%M:%S%.3f").to_string();

                let content = if self.show_details {
                    format!(
                        "{} {} [{}] {} -> {} | {} | {}",
                        time_str,
                        status_icon,
                        event.event_type,
                        event.source_agent,
                        event.target_agent.as_deref().unwrap_or("*"),
                        if let Some(error) = &event.error {
                            format!("ERROR: {}", error)
                        } else {
                            format!("{:?}", event.payload)
                        },
                        event.processing_time_ms.map_or("".to_string(), |t| format!("({}ms)", t))
                    )
                } else {
                    format!(
                        "{} {} [{}] {} -> {} {}",
                        time_str,
                        status_icon,
                        event.event_type,
                        event.source_agent,
                        event.target_agent.as_deref().unwrap_or("*"),
                        event.processing_time_ms.map_or("".to_string(), |t| format!("({}ms)", t))
                    )
                };

                ListItem::new(Line::from(vec![
                    Span::styled("●", Style::default().fg(level_color)),
                    Span::raw(" "),
                    Span::raw(content),
                ]))
                .style(style)
            })
            .collect();

        let filter_info = format!("{:?}", self.filter_level);
        let title = format!(
            " A2A Event Stream ({}/{}) - Filter: {} - [Space] Pause, [d] Details, [c] Clear, [1-5] Filter ",
            filtered_events.len(),
            self.events.len(),
            filter_info
        );

        let events_list = List::new(events)
            .block(Block::default().borders(Borders::ALL).title(title));

        frame.render_widget(events_list, area);
    }

    // Mock data generation for development
    pub fn generate_sample_event(&mut self, agent_name: &str, event_type: &str) {
        let event = A2aEvent {
            id: format!("evt_{}", uuid::Uuid::new_v4().to_string()[..8].to_string()),
            event_type: event_type.to_string(),
            source_agent: agent_name.to_string(),
            target_agent: Some("cortex-core".to_string()),
            timestamp: Utc::now(),
            payload: serde_json::json!({
                "message": "Sample event payload",
                "data": {"key": "value"}
            }),
            level: LogLevel::Info,
            status: EventStatus::Completed,
            processing_time_ms: Some(23),
            error: None,
        };

        self.add_event(event);
    }
}

impl Default for StreamStats {
    fn default() -> Self {
        Self {
            total_events: 0,
            events_per_second: 0.0,
            active_agents: 0,
            error_rate: 0.0,
            avg_processing_time_ms: 0.0,
            memory_usage_mb: 0.0,
        }
    }
}

// Add uuid dependency to Cargo.toml - for now using a simple counter
static mut EVENT_COUNTER: u64 = 0;

impl A2aEvent {
    pub fn new(event_type: String, source_agent: String, target_agent: Option<String>) -> Self {
        unsafe {
            EVENT_COUNTER += 1;
            Self {
                id: format!("evt_{}", EVENT_COUNTER),
                event_type,
                source_agent,
                target_agent,
                timestamp: Utc::now(),
                payload: serde_json::Value::Null,
                level: LogLevel::Info,
                status: EventStatus::Sent,
                processing_time_ms: None,
                error: None,
            }
        }
    }
}
