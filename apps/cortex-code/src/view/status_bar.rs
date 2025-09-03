use crate::tui::{MouseManager, MouseMode};
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph},
    Frame,
};

/// Status bar component for displaying application status and mode information
/// Inspired by terminal applications like vim and tmux
#[derive(Debug, Clone)]
pub struct StatusBar {
    mouse_mode_hint: bool,
    show_shortcuts: bool,
    theme: StatusBarTheme,
}

#[derive(Debug, Clone, PartialEq)]
pub enum StatusBarTheme {
    Dark,
    Light,
}

impl Default for StatusBar {
    fn default() -> Self {
        Self::new()
    }
}

impl StatusBar {
    pub fn new() -> Self {
        Self {
            mouse_mode_hint: true,
            show_shortcuts: true,
            theme: StatusBarTheme::Dark,
        }
    }

    /// Render the status bar
    pub fn render(&self, frame: &mut Frame, area: Rect, mouse_manager: &MouseManager) {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Length(20), // Mouse mode indicator
                Constraint::Min(10),    // Center area
                Constraint::Length(30), // Shortcuts
            ])
            .split(area);

        // Mouse mode indicator
        self.render_mouse_mode(frame, chunks[0], mouse_manager);

        // Center status info
        self.render_center_status(frame, chunks[1]);

        // Shortcuts
        if self.show_shortcuts {
            self.render_shortcuts(frame, chunks[2]);
        }
    }

    /// Render mouse mode indicator
    fn render_mouse_mode(&self, frame: &mut Frame, area: Rect, mouse_manager: &MouseManager) {
        let (icon, text, color) = match mouse_manager.get_mode() {
            MouseMode::TuiMode => ("🖱️", "TUI", Color::Cyan),
            MouseMode::TerminalMode => ("📋", "TERM", Color::Yellow),
            MouseMode::HybridMode => ("🔄", "AUTO", Color::Green),
        };

        let content = vec![
            Span::styled(icon, Style::default()),
            Span::raw(" "),
            Span::styled(text, Style::default().fg(color).add_modifier(Modifier::BOLD)),
        ];

        let paragraph = Paragraph::new(Line::from(content))
            .style(Style::default().bg(Color::DarkGray))
            .alignment(Alignment::Center);

        frame.render_widget(paragraph, area);
    }

    /// Render center status information
    fn render_center_status(&self, frame: &mut Frame, area: Rect) {
        let content = vec![
            Span::styled("Cortex Code", Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
            Span::raw(" - "),
            Span::styled("Ready", Style::default().fg(Color::Green)),
        ];

        let paragraph = Paragraph::new(Line::from(content))
            .style(Style::default().bg(Color::DarkGray))
            .alignment(Alignment::Center);

        frame.render_widget(paragraph, area);
    }

    /// Render keyboard shortcuts
    fn render_shortcuts(&self, frame: &mut Frame, area: Rect) {
        let content = vec![
            Span::styled("Ctrl+P", Style::default().fg(Color::Cyan)),
            Span::raw(" Cmd "),
            Span::styled("Ctrl+M", Style::default().fg(Color::Yellow)),
            Span::raw(" Mouse "),
            Span::styled("Esc", Style::default().fg(Color::Red)),
            Span::raw(" Quit"),
        ];

        let paragraph = Paragraph::new(Line::from(content))
            .style(Style::default().bg(Color::DarkGray))
            .alignment(Alignment::Right);

        frame.render_widget(paragraph, area);
    }

    /// Show mouse mode hint temporarily
    pub fn show_mouse_mode_hint(&mut self) {
        self.mouse_mode_hint = true;
    }

    /// Hide mouse mode hint
    pub fn hide_mouse_mode_hint(&mut self) {
        self.mouse_mode_hint = false;
    }

    /// Toggle shortcuts visibility
    pub fn toggle_shortcuts(&mut self) {
        self.show_shortcuts = !self.show_shortcuts;
    }

    /// Set theme
    pub fn set_theme(&mut self, theme: StatusBarTheme) {
        self.theme = theme;
    }

    /// Get detailed mouse mode help text
    pub fn get_mouse_mode_help(mode: MouseMode) -> &'static str {
        match mode {
            MouseMode::TuiMode => {
                "TUI Mode: Mouse controls interface elements. Scroll to navigate, click to focus."
            }
            MouseMode::TerminalMode => {
                "Terminal Mode: Mouse enables text selection. Drag to select, right-click to copy."
            }
            MouseMode::HybridMode => {
                "Auto Mode: Switches automatically. Long drags enable selection, short clicks control UI."
            }
        }
    }
}
