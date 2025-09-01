use crate::Result;
use crossterm::event::Event;
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, List, ListItem, Paragraph},
    Frame,
};
use tui_input::Input;

#[derive(Debug, Clone)]
pub struct CommandPalette {
    input: Input,
    commands: Vec<Command>,
    filtered_commands: Vec<usize>, // Indices into commands vec
    selected_index: usize,
    is_open: bool,
    theme: PaletteTheme,
    max_results: usize,
}

#[derive(Debug, Clone)]
pub struct Command {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: CommandCategory,
    pub keybinding: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CommandCategory {
    File,
    Git,
    Provider,
    View,
    Navigation,
    MCP,
    System,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PaletteTheme {
    Dark,
    Light,
}

#[derive(Debug, Clone)]
pub enum PaletteEventResponse {
    ExecuteCommand(String),
    Close,
    None,
}

impl Default for CommandPalette {
    fn default() -> Self {
        Self::new()
    }
}

impl CommandPalette {
    pub fn new() -> Self {
        let commands = Self::default_commands();
        let filtered_commands: Vec<usize> = (0..commands.len()).collect();

        Self {
            input: Input::default(),
            commands,
            filtered_commands,
            selected_index: 0,
            is_open: false,
            theme: PaletteTheme::Dark,
            max_results: 10,
        }
    }

    pub fn is_open(&self) -> bool {
        self.is_open
    }

    pub fn open(&mut self) {
        self.is_open = true;
        self.input.reset();
        self.selected_index = 0;
        self.update_filter();
    }

    pub fn close(&mut self) {
        self.is_open = false;
        self.input.reset();
        self.selected_index = 0;
    }

    pub fn set_theme(&mut self, theme: PaletteTheme) {
        self.theme = theme;
    }

    pub fn add_command(&mut self, command: Command) {
        self.commands.push(command);
        if self.is_open {
            self.update_filter();
        }
    }

    pub fn handle_event(&mut self, event: Event) -> Result<PaletteEventResponse> {
        if !self.is_open {
            return Ok(PaletteEventResponse::None);
        }

        use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

        match event {
            Event::Key(KeyEvent { code, modifiers, .. }) => {
                match (code, modifiers) {
                    // Close palette
                    (KeyCode::Esc, KeyModifiers::NONE) => {
                        self.close();
                        Ok(PaletteEventResponse::Close)
                    }

                    // Execute selected command
                    (KeyCode::Enter, KeyModifiers::NONE) => {
                        if let Some(&command_index) = self.filtered_commands.get(self.selected_index) {
                            let command_id = self.commands[command_index].id.clone();
                            self.close();
                            Ok(PaletteEventResponse::ExecuteCommand(command_id))
                        } else {
                            Ok(PaletteEventResponse::None)
                        }
                    }

                    // Navigation
                    (KeyCode::Up, KeyModifiers::NONE) => {
                        if self.selected_index > 0 {
                            self.selected_index -= 1;
                        } else if !self.filtered_commands.is_empty() {
                            self.selected_index = self.filtered_commands.len() - 1;
                        }
                        Ok(PaletteEventResponse::None)
                    }
                    (KeyCode::Down, KeyModifiers::NONE) => {
                        if self.selected_index + 1 < self.filtered_commands.len() {
                            self.selected_index += 1;
                        } else {
                            self.selected_index = 0;
                        }
                        Ok(PaletteEventResponse::None)
                    }

                    // Tab for category cycling (future enhancement)
                    (KeyCode::Tab, KeyModifiers::NONE) => {
                        // TODO: Cycle through command categories
                        Ok(PaletteEventResponse::None)
                    }

                    // Input handling
                    (KeyCode::Char(c), KeyModifiers::NONE) => {
                        self.input.handle(tui_input::InputRequest::InsertChar(c));
                        self.update_filter();
                        self.selected_index = 0; // Reset selection after filtering
                        Ok(PaletteEventResponse::None)
                    }
                    (KeyCode::Backspace, KeyModifiers::NONE) => {
                        self.input.handle(tui_input::InputRequest::DeletePrevChar);
                        self.update_filter();
                        self.selected_index = 0;
                        Ok(PaletteEventResponse::None)
                    }
                    (KeyCode::Delete, KeyModifiers::NONE) => {
                        self.input.handle(tui_input::InputRequest::DeleteNextChar);
                        self.update_filter();
                        self.selected_index = 0;
                        Ok(PaletteEventResponse::None)
                    }
                    (KeyCode::Left, KeyModifiers::NONE) => {
                        self.input.handle(tui_input::InputRequest::GoToPrevChar);
                        Ok(PaletteEventResponse::None)
                    }
                    (KeyCode::Right, KeyModifiers::NONE) => {
                        self.input.handle(tui_input::InputRequest::GoToNextChar);
                        Ok(PaletteEventResponse::None)
                    }

                    _ => Ok(PaletteEventResponse::None),
                }
            }
            _ => Ok(PaletteEventResponse::None),
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        if !self.is_open {
            return;
        }

        // Create centered popup
        let popup_area = self.centered_rect(60, 70, area);

        // Clear the popup area
        frame.render_widget(Clear, popup_area);

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3), // Input area
                Constraint::Min(5),    // Results area
            ])
            .split(popup_area);

        self.render_input(frame, chunks[0]);
        self.render_results(frame, chunks[1]);
    }

    fn render_input(&self, frame: &mut Frame, area: Rect) {
        let input_block = Block::default()
            .borders(Borders::ALL)
            .title("Command Palette")
            .border_style(self.focused_border_style());

        let input_paragraph = Paragraph::new(self.input.value())
            .block(input_block)
            .style(self.input_style());

        frame.render_widget(input_paragraph, area);

        // Show cursor
        let cursor_x = area.x + self.input.visual_cursor() as u16 + 1;
        let cursor_y = area.y + 1;
        frame.set_cursor_position((cursor_x, cursor_y));
    }

    fn render_results(&self, frame: &mut Frame, area: Rect) {
        let results_block = Block::default()
            .borders(Borders::ALL)
            .title(format!("Results ({})", self.filtered_commands.len()))
            .border_style(self.unfocused_border_style());

        if self.filtered_commands.is_empty() {
            let no_results = Paragraph::new("No matching commands found")
                .block(results_block)
                .style(self.dim_style())
                .alignment(Alignment::Center);
            frame.render_widget(no_results, area);
            return;
        }

        let visible_results: Vec<ListItem> = self.filtered_commands
            .iter()
            .take(self.max_results)
            .enumerate()
            .map(|(index, &command_index)| {
                let command = &self.commands[command_index];

                let style = if index == self.selected_index {
                    self.selected_style()
                } else {
                    self.category_style(&command.category)
                };

                let keybinding = command.keybinding
                    .as_ref()
                    .map(|kb| format!(" [{}]", kb))
                    .unwrap_or_default();

                let category_icon = self.category_icon(&command.category);
                let content = format!("{} {} - {}{}",
                    category_icon,
                    command.name,
                    command.description,
                    keybinding
                );

                ListItem::new(Line::from(Span::styled(content, style)))
            })
            .collect();

        let results_list = List::new(visible_results)
            .block(results_block)
            .highlight_style(self.highlight_style());

        frame.render_widget(results_list, area);
    }

    fn update_filter(&mut self) {
        let query = self.input.value().to_lowercase();

        if query.is_empty() {
            self.filtered_commands = (0..self.commands.len()).collect();
        } else {
            // Fuzzy search implementation
            self.filtered_commands = self.commands
                .iter()
                .enumerate()
                .filter_map(|(index, command)| {
                    let score = self.fuzzy_match_score(&query, command);
                    if score > 0 {
                        Some((index, score))
                    } else {
                        None
                    }
                })
                .collect::<Vec<_>>()
                .into_iter()
                .map(|(index, _score)| {
                    // TODO: Sort by score for better fuzzy matching
                    index
                })
                .collect();
        }

        // Ensure selected index is valid
        if self.selected_index >= self.filtered_commands.len() {
            self.selected_index = 0;
        }
    }

    fn fuzzy_match_score(&self, query: &str, command: &Command) -> i32 {
        let name_lower = command.name.to_lowercase();
        let desc_lower = command.description.to_lowercase();

        let mut score = 0;

        // Exact name match gets highest score
        if name_lower.contains(query) {
            score += 100;
        }

        // Description match gets medium score
        if desc_lower.contains(query) {
            score += 50;
        }

        // Category match gets low score
        let category_name = format!("{:?}", command.category).to_lowercase();
        if category_name.contains(query) {
            score += 25;
        }

        // Character by character fuzzy matching (simplified)
        let query_chars: Vec<char> = query.chars().collect();
        let name_chars: Vec<char> = name_lower.chars().collect();

        let mut query_index = 0;
        let mut consecutive_matches = 0;

        for name_char in name_chars {
            if query_index < query_chars.len() && name_char == query_chars[query_index] {
                query_index += 1;
                consecutive_matches += 1;
                score += consecutive_matches; // Bonus for consecutive matches
            } else {
                consecutive_matches = 0;
            }
        }

        // Bonus if all characters matched
        if query_index == query_chars.len() {
            score += 20;
        }

        score
    }

    fn centered_rect(&self, percent_x: u16, percent_y: u16, r: Rect) -> Rect {
        let popup_layout = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage((100 - percent_y) / 2),
                Constraint::Percentage(percent_y),
                Constraint::Percentage((100 - percent_y) / 2),
            ])
            .split(r);

        Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage((100 - percent_x) / 2),
                Constraint::Percentage(percent_x),
                Constraint::Percentage((100 - percent_x) / 2),
            ])
            .split(popup_layout[1])[1]
    }

    fn default_commands() -> Vec<Command> {
        vec![
            Command {
                id: "file.open".to_string(),
                name: "Open File".to_string(),
                description: "Open a file for editing".to_string(),
                category: CommandCategory::File,
                keybinding: Some("Ctrl+O".to_string()),
            },
            Command {
                id: "file.save".to_string(),
                name: "Save File".to_string(),
                description: "Save the current file".to_string(),
                category: CommandCategory::File,
                keybinding: Some("Ctrl+S".to_string()),
            },
            Command {
                id: "git.status".to_string(),
                name: "Git Status".to_string(),
                description: "Show git repository status".to_string(),
                category: CommandCategory::Git,
                keybinding: None,
            },
            Command {
                id: "git.diff".to_string(),
                name: "Git Diff".to_string(),
                description: "Show git changes".to_string(),
                category: CommandCategory::Git,
                keybinding: None,
            },
            Command {
                id: "provider.switch".to_string(),
                name: "Switch Provider".to_string(),
                description: "Change AI provider".to_string(),
                category: CommandCategory::Provider,
                keybinding: None,
            },
            Command {
                id: "view.chat".to_string(),
                name: "Open Chat".to_string(),
                description: "Open the chat interface".to_string(),
                category: CommandCategory::View,
                keybinding: Some("Ctrl+1".to_string()),
            },
            Command {
                id: "view.diff".to_string(),
                name: "Open Diff Viewer".to_string(),
                description: "Open the diff viewer".to_string(),
                category: CommandCategory::View,
                keybinding: Some("Ctrl+2".to_string()),
            },
            Command {
                id: "mcp.list".to_string(),
                name: "List MCP Servers".to_string(),
                description: "Show available MCP servers".to_string(),
                category: CommandCategory::MCP,
                keybinding: None,
            },
            Command {
                id: "system.quit".to_string(),
                name: "Quit".to_string(),
                description: "Exit the application".to_string(),
                category: CommandCategory::System,
                keybinding: Some("Ctrl+Q".to_string()),
            },
        ]
    }

    fn category_icon(&self, category: &CommandCategory) -> &str {
        match category {
            CommandCategory::File => "📄",
            CommandCategory::Git => "🔀",
            CommandCategory::Provider => "🤖",
            CommandCategory::View => "👁️",
            CommandCategory::Navigation => "🧭",
            CommandCategory::MCP => "🔧",
            CommandCategory::System => "⚙️",
        }
    }

    // Style helpers
    fn focused_border_style(&self) -> Style {
        match self.theme {
            PaletteTheme::Dark => Style::default().fg(Color::Yellow),
            PaletteTheme::Light => Style::default().fg(Color::Blue),
        }
    }

    fn unfocused_border_style(&self) -> Style {
        match self.theme {
            PaletteTheme::Dark => Style::default().fg(Color::Gray),
            PaletteTheme::Light => Style::default().fg(Color::DarkGray),
        }
    }

    fn input_style(&self) -> Style {
        match self.theme {
            PaletteTheme::Dark => Style::default().fg(Color::White),
            PaletteTheme::Light => Style::default().fg(Color::Black),
        }
    }

    fn selected_style(&self) -> Style {
        match self.theme {
            PaletteTheme::Dark => Style::default()
                .fg(Color::Black)
                .bg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
            PaletteTheme::Light => Style::default()
                .fg(Color::White)
                .bg(Color::Blue)
                .add_modifier(Modifier::BOLD),
        }
    }

    fn highlight_style(&self) -> Style {
        match self.theme {
            PaletteTheme::Dark => Style::default().bg(Color::DarkGray),
            PaletteTheme::Light => Style::default().bg(Color::Gray),
        }
    }

    fn category_style(&self, category: &CommandCategory) -> Style {
        let color = match category {
            CommandCategory::File => Color::Cyan,
            CommandCategory::Git => Color::Green,
            CommandCategory::Provider => Color::Magenta,
            CommandCategory::View => Color::Blue,
            CommandCategory::Navigation => Color::Yellow,
            CommandCategory::MCP => Color::Red,
            CommandCategory::System => Color::Gray,
        };

        Style::default().fg(color)
    }

    fn dim_style(&self) -> Style {
        Style::default().add_modifier(Modifier::DIM)
    }
}
