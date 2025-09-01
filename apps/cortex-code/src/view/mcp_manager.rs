use crate::mcp::{McpRegistry, McpServerInfo, server::McpServerStatus};
use crate::Result;
use crossterm::event::Event;
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Tabs},
    Frame,
};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct McpManagerWidget {
    registry: Arc<McpRegistry>,
    servers: Vec<McpServerInfo>,
    selected_server_index: usize,
    focused_tab: McpTab,
    theme: McpTheme,
    last_refresh: std::time::SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub enum McpTab {
    Servers,
    Tools,
    Resources,
    Logs,
}

#[derive(Debug, Clone, PartialEq)]
pub enum McpTheme {
    Dark,
    Light,
}

#[derive(Debug, Clone)]
pub enum McpEventResponse {
    StartServer(String),
    StopServer(String),
    RestartServer(String),
    RefreshServers,
    ViewTools(String),
    ViewResources(String),
    SwitchTab(McpTab),
    None,
}

impl McpManagerWidget {
    pub fn new(registry: Arc<McpRegistry>) -> Self {
        Self {
            registry,
            servers: Vec::new(),
            selected_server_index: 0,
            focused_tab: McpTab::Servers,
            theme: McpTheme::Dark,
            last_refresh: std::time::SystemTime::now(),
        }
    }
    
    pub async fn refresh_servers(&mut self) -> Result<()> {
        self.servers = self.registry.list_servers().await;
        self.last_refresh = std::time::SystemTime::now();
        
        // Ensure selected index is valid
        if self.selected_server_index >= self.servers.len() && !self.servers.is_empty() {
            self.selected_server_index = self.servers.len() - 1;
        }
        
        Ok(())
    }
    
    pub fn set_theme(&mut self, theme: McpTheme) {
        self.theme = theme;
    }
    
    pub fn selected_server(&self) -> Option<&McpServerInfo> {
        self.servers.get(self.selected_server_index)
    }
    
    pub async fn handle_event(&mut self, event: Event) -> Result<McpEventResponse> {
        use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
        
        match event {
            Event::Key(KeyEvent { code, modifiers, .. }) => {
                match (code, modifiers) {
                    // Tab switching
                    (KeyCode::Char('1'), KeyModifiers::NONE) => {
                        self.focused_tab = McpTab::Servers;
                        Ok(McpEventResponse::SwitchTab(McpTab::Servers))
                    }
                    (KeyCode::Char('2'), KeyModifiers::NONE) => {
                        self.focused_tab = McpTab::Tools;
                        Ok(McpEventResponse::SwitchTab(McpTab::Tools))
                    }
                    (KeyCode::Char('3'), KeyModifiers::NONE) => {
                        self.focused_tab = McpTab::Resources;
                        Ok(McpEventResponse::SwitchTab(McpTab::Resources))
                    }
                    (KeyCode::Char('4'), KeyModifiers::NONE) => {
                        self.focused_tab = McpTab::Logs;
                        Ok(McpEventResponse::SwitchTab(McpTab::Logs))
                    }
                    (KeyCode::Tab, KeyModifiers::NONE) => {
                        self.focused_tab = match self.focused_tab {
                            McpTab::Servers => McpTab::Tools,
                            McpTab::Tools => McpTab::Resources,
                            McpTab::Resources => McpTab::Logs,
                            McpTab::Logs => McpTab::Servers,
                        };
                        Ok(McpEventResponse::SwitchTab(self.focused_tab.clone()))
                    }
                    
                    // Server navigation
                    (KeyCode::Up, KeyModifiers::NONE) if self.focused_tab == McpTab::Servers => {
                        if self.selected_server_index > 0 {
                            self.selected_server_index -= 1;
                        } else if !self.servers.is_empty() {
                            self.selected_server_index = self.servers.len() - 1;
                        }
                        Ok(McpEventResponse::None)
                    }
                    (KeyCode::Down, KeyModifiers::NONE) if self.focused_tab == McpTab::Servers => {
                        if self.selected_server_index + 1 < self.servers.len() {
                            self.selected_server_index += 1;
                        } else {
                            self.selected_server_index = 0;
                        }
                        Ok(McpEventResponse::None)
                    }
                    
                    // Server actions
                    (KeyCode::Char('s'), KeyModifiers::NONE) => {
                        if let Some(server) = self.selected_server() {
                            match server.status {
                                McpServerStatus::Stopped | McpServerStatus::Error(_) => {
                                    Ok(McpEventResponse::StartServer(server.id.clone()))
                                }
                                McpServerStatus::Running => {
                                    Ok(McpEventResponse::StopServer(server.id.clone()))
                                }
                                _ => Ok(McpEventResponse::None),
                            }
                        } else {
                            Ok(McpEventResponse::None)
                        }
                    }
                    (KeyCode::Char('r'), KeyModifiers::NONE) => {
                        if let Some(server) = self.selected_server() {
                            Ok(McpEventResponse::RestartServer(server.id.clone()))
                        } else {
                            Ok(McpEventResponse::None)
                        }
                    }
                    (KeyCode::Char('5'), KeyModifiers::CONTROL) => {
                        Ok(McpEventResponse::RefreshServers)
                    }
                    
                    // View actions
                    (KeyCode::Char('t'), KeyModifiers::NONE) => {
                        if let Some(server) = self.selected_server() {
                            Ok(McpEventResponse::ViewTools(server.id.clone()))
                        } else {
                            Ok(McpEventResponse::None)
                        }
                    }
                    (KeyCode::Char('c'), KeyModifiers::NONE) => {
                        if let Some(server) = self.selected_server() {
                            Ok(McpEventResponse::ViewResources(server.id.clone()))
                        } else {
                            Ok(McpEventResponse::None)
                        }
                    }
                    
                    _ => Ok(McpEventResponse::None),
                }
            }
            _ => Ok(McpEventResponse::None),
        }
    }
    
    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3), // Tab bar
                Constraint::Min(5),    // Content area
                Constraint::Length(3), // Status bar
            ])
            .split(area);
        
        self.render_tabs(frame, chunks[0]);
        self.render_content(frame, chunks[1]);
        self.render_status(frame, chunks[2]);
    }
    
    fn render_tabs(&self, frame: &mut Frame, area: Rect) {
        let tab_titles = vec!["Servers", "Tools", "Resources", "Logs"];
        let selected_tab_index = match self.focused_tab {
            McpTab::Servers => 0,
            McpTab::Tools => 1,
            McpTab::Resources => 2,
            McpTab::Logs => 3,
        };
        
        let tabs = Tabs::new(tab_titles)
            .block(Block::default().borders(Borders::ALL).title("MCP Manager"))
            .select(selected_tab_index)
            .style(self.unfocused_style())
            .highlight_style(self.focused_style());
        
        frame.render_widget(tabs, area);
    }
    
    fn render_content(&self, frame: &mut Frame, area: Rect) {
        match self.focused_tab {
            McpTab::Servers => self.render_servers_tab(frame, area),
            McpTab::Tools => self.render_tools_tab(frame, area),
            McpTab::Resources => self.render_resources_tab(frame, area),
            McpTab::Logs => self.render_logs_tab(frame, area),
        }
    }
    
    fn render_servers_tab(&self, frame: &mut Frame, area: Rect) {
        if self.servers.is_empty() {
            let empty_text = Paragraph::new("No MCP servers configured. Press F5 to refresh.")
                .block(Block::default().borders(Borders::ALL).title("Servers"))
                .style(self.dim_style())
                .alignment(Alignment::Center);
            frame.render_widget(empty_text, area);
            return;
        }
        
        let server_items: Vec<ListItem> = self.servers
            .iter()
            .enumerate()
            .map(|(index, server)| {
                let status_icon = match server.status {
                    McpServerStatus::Running => "🟢",
                    McpServerStatus::Starting => "🟡",
                    McpServerStatus::Stopped => "⚫",
                    McpServerStatus::Error(_) => "🔴",
                };
                
                let capabilities_text = server.capabilities
                    .iter()
                    .map(|cap| format!("{}", cap))
                    .collect::<Vec<_>>()
                    .join(", ");
                
                let style = if index == self.selected_server_index {
                    self.selected_style()
                } else {
                    self.server_style(&server.status)
                };
                
                let content = format!(
                    "{} {} - {} [{}]",
                    status_icon,
                    server.name,
                    server.description,
                    capabilities_text
                );
                
                ListItem::new(Line::from(Span::styled(content, style)))
            })
            .collect();
        
        let servers_list = List::new(server_items)
            .block(Block::default().borders(Borders::ALL).title("MCP Servers"))
            .highlight_style(self.highlight_style())
            .highlight_symbol("► ");
        
        frame.render_stateful_widget(
            servers_list, 
            area, 
            &mut ratatui::widgets::ListState::default().with_selected(Some(self.selected_server_index))
        );
    }
    
    fn render_tools_tab(&self, frame: &mut Frame, area: Rect) {
        let content = if let Some(server) = self.selected_server() {
            format!("Tools for server: {}\n\n(Tools listing not yet implemented)", server.name)
        } else {
            "No server selected".to_string()
        };
        
        let tools_text = Paragraph::new(content)
            .block(Block::default().borders(Borders::ALL).title("Available Tools"))
            .style(self.normal_style());
        
        frame.render_widget(tools_text, area);
    }
    
    fn render_resources_tab(&self, frame: &mut Frame, area: Rect) {
        let content = if let Some(server) = self.selected_server() {
            format!("Resources for server: {}\n\n(Resources listing not yet implemented)", server.name)
        } else {
            "No server selected".to_string()
        };
        
        let resources_text = Paragraph::new(content)
            .block(Block::default().borders(Borders::ALL).title("Available Resources"))
            .style(self.normal_style());
        
        frame.render_widget(resources_text, area);
    }
    
    fn render_logs_tab(&self, frame: &mut Frame, area: Rect) {
        let logs_text = Paragraph::new("MCP Server Logs\n\n(Logging not yet implemented)")
            .block(Block::default().borders(Borders::ALL).title("Server Logs"))
            .style(self.dim_style());
        
        frame.render_widget(logs_text, area);
    }
    
    fn render_status(&self, frame: &mut Frame, area: Rect) {
        let running_count = self.servers.iter()
            .filter(|s| matches!(s.status, McpServerStatus::Running))
            .count();
        
        let status_text = format!(
            "Servers: {}/{} running | Selected: {} | Last refresh: {:?} ago | Controls: s=start/stop, r=restart, t=tools, c=resources, Ctrl+5=refresh",
            running_count,
            self.servers.len(),
            self.selected_server().map(|s| s.name.as_str()).unwrap_or("None"),
            self.last_refresh.elapsed().unwrap_or_default()
        );
        
        let status = Paragraph::new(status_text)
            .block(Block::default().borders(Borders::ALL))
            .style(self.dim_style());
        
        frame.render_widget(status, area);
    }
    
    // Style helpers
    fn focused_style(&self) -> Style {
        match self.theme {
            McpTheme::Dark => Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD),
            McpTheme::Light => Style::default().fg(Color::Blue).add_modifier(Modifier::BOLD),
        }
    }
    
    fn unfocused_style(&self) -> Style {
        match self.theme {
            McpTheme::Dark => Style::default().fg(Color::Gray),
            McpTheme::Light => Style::default().fg(Color::DarkGray),
        }
    }
    
    fn selected_style(&self) -> Style {
        match self.theme {
            McpTheme::Dark => Style::default().fg(Color::Black).bg(Color::Yellow),
            McpTheme::Light => Style::default().fg(Color::White).bg(Color::Blue),
        }
    }
    
    fn highlight_style(&self) -> Style {
        match self.theme {
            McpTheme::Dark => Style::default().bg(Color::DarkGray),
            McpTheme::Light => Style::default().bg(Color::Gray),
        }
    }
    
    fn server_style(&self, status: &McpServerStatus) -> Style {
        let color = match status {
            McpServerStatus::Running => Color::Green,
            McpServerStatus::Starting => Color::Yellow,
            McpServerStatus::Stopped => Color::Gray,
            McpServerStatus::Error(_) => Color::Red,
        };
        
        Style::default().fg(color)
    }
    
    fn normal_style(&self) -> Style {
        match self.theme {
            McpTheme::Dark => Style::default().fg(Color::White),
            McpTheme::Light => Style::default().fg(Color::Black),
        }
    }
    
    fn dim_style(&self) -> Style {
        Style::default().add_modifier(Modifier::DIM)
    }
}