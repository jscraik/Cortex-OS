use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Paragraph},
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
    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Length(20), // Status indicator
                Constraint::Min(10),    // Center area
                Constraint::Length(30), // Shortcuts
            ])
            .split(area);

        // Status indicator
        self.render_status_indicator(frame, chunks[0]);

        // Center status info
        self.render_center_status(frame, chunks[1]);

        // Shortcuts
        if self.show_shortcuts {
            self.render_shortcuts(frame, chunks[2]);
        }
    }

    /// Render status indicator
    fn render_status_indicator(&self, frame: &mut Frame, area: Rect) {
        let content = vec![
            Span::styled("💬", Style::default()),
            Span::raw(" "),
            Span::styled("CHAT", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
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
}
