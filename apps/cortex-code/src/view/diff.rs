use crate::Result;
use crossterm::event::Event;
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState},
    Frame,
};

#[derive(Debug, Clone)]
pub struct DiffViewer {
    diffs: Vec<DiffFile>,
    current_file_index: usize,
    current_hunk_index: usize,
    scroll_offset: usize,
    focused_element: DiffFocusElement,
    theme: DiffTheme,
}

#[derive(Debug, Clone)]
pub struct DiffFile {
    pub path: String,
    pub hunks: Vec<DiffHunk>,
    pub file_status: FileStatus,
}

#[derive(Debug, Clone)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone)]
pub struct DiffLine {
    pub line_type: DiffLineType,
    pub content: String,
    pub old_line_num: Option<u32>,
    pub new_line_num: Option<u32>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
    NoNewline,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DiffFocusElement {
    FileList,
    DiffContent,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DiffTheme {
    Dark,
    Light,
}

#[derive(Debug, Clone)]
pub enum DiffEventResponse {
    NavigateToFile(usize),
    NavigateToHunk(usize),
    ApplyHunk,
    None,
}

impl Default for DiffViewer {
    fn default() -> Self {
        Self::new()
    }
}

impl DiffViewer {
    pub fn new() -> Self {
        Self {
            diffs: Vec::new(),
            current_file_index: 0,
            current_hunk_index: 0,
            scroll_offset: 0,
            focused_element: DiffFocusElement::FileList,
            theme: DiffTheme::Dark,
        }
    }

    pub fn load_from_git_diff(&mut self, diff_text: &str) -> Result<()> {
        self.diffs = self.parse_git_diff(diff_text)?;
        self.current_file_index = 0;
        self.current_hunk_index = 0;
        self.scroll_offset = 0;
        Ok(())
    }

    pub fn set_diffs(&mut self, diffs: Vec<DiffFile>) {
        self.diffs = diffs;
        self.current_file_index = 0;
        self.current_hunk_index = 0;
        self.scroll_offset = 0;
    }

    pub fn current_file(&self) -> Option<&DiffFile> {
        self.diffs.get(self.current_file_index)
    }

    pub fn current_hunk(&self) -> Option<&DiffHunk> {
        self.current_file()
            .and_then(|file| file.hunks.get(self.current_hunk_index))
    }

    pub fn set_focus(&mut self, element: DiffFocusElement) {
        self.focused_element = element;
    }

    pub fn set_theme(&mut self, theme: DiffTheme) {
        self.theme = theme;
    }

    pub fn handle_event(&mut self, event: Event) -> Result<DiffEventResponse> {
        use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

        match event {
            Event::Key(KeyEvent { code, modifiers, .. }) => {
                match (code, modifiers) {
                    // Navigation between panes
                    (KeyCode::Tab, KeyModifiers::NONE) => {
                        self.focused_element = match self.focused_element {
                            DiffFocusElement::FileList => DiffFocusElement::DiffContent,
                            DiffFocusElement::DiffContent => DiffFocusElement::FileList,
                        };
                        Ok(DiffEventResponse::None)
                    }

                    // File navigation (when file list focused)
                    (KeyCode::Up, KeyModifiers::NONE) if self.focused_element == DiffFocusElement::FileList => {
                        if self.current_file_index > 0 {
                            self.current_file_index -= 1;
                            self.current_hunk_index = 0;
                            self.scroll_offset = 0;
                        }
                        Ok(DiffEventResponse::NavigateToFile(self.current_file_index))
                    }
                    (KeyCode::Down, KeyModifiers::NONE) if self.focused_element == DiffFocusElement::FileList => {
                        if self.current_file_index + 1 < self.diffs.len() {
                            self.current_file_index += 1;
                            self.current_hunk_index = 0;
                            self.scroll_offset = 0;
                        }
                        Ok(DiffEventResponse::NavigateToFile(self.current_file_index))
                    }

                    // Diff content navigation
                    (KeyCode::Up, KeyModifiers::NONE) if self.focused_element == DiffFocusElement::DiffContent => {
                        if self.scroll_offset > 0 {
                            self.scroll_offset -= 1;
                        }
                        Ok(DiffEventResponse::None)
                    }
                    (KeyCode::Down, KeyModifiers::NONE) if self.focused_element == DiffFocusElement::DiffContent => {
                        if let Some(file) = self.current_file() {
                            let max_lines = file.hunks.iter().map(|h| h.lines.len()).sum::<usize>();
                            if self.scroll_offset + 20 < max_lines {
                                self.scroll_offset += 1;
                            }
                        }
                        Ok(DiffEventResponse::None)
                    }

                    // Hunk navigation
                    (KeyCode::Char('j'), KeyModifiers::NONE) => {
                        if let Some(file) = self.current_file() {
                            if self.current_hunk_index + 1 < file.hunks.len() {
                                self.current_hunk_index += 1;
                            }
                        }
                        Ok(DiffEventResponse::NavigateToHunk(self.current_hunk_index))
                    }
                    (KeyCode::Char('k'), KeyModifiers::NONE) => {
                        if self.current_hunk_index > 0 {
                            self.current_hunk_index -= 1;
                        }
                        Ok(DiffEventResponse::NavigateToHunk(self.current_hunk_index))
                    }

                    // Page up/down
                    (KeyCode::PageUp, KeyModifiers::NONE) => {
                        self.scroll_offset = self.scroll_offset.saturating_sub(10);
                        Ok(DiffEventResponse::None)
                    }
                    (KeyCode::PageDown, KeyModifiers::NONE) => {
                        if let Some(file) = self.current_file() {
                            let max_lines = file.hunks.iter().map(|h| h.lines.len()).sum::<usize>();
                            if self.scroll_offset + 30 < max_lines {
                                self.scroll_offset += 10;
                            }
                        }
                        Ok(DiffEventResponse::None)
                    }

                    // Apply hunk (future feature)
                    (KeyCode::Enter, KeyModifiers::NONE) => {
                        Ok(DiffEventResponse::ApplyHunk)
                    }

                    _ => Ok(DiffEventResponse::None),
                }
            }
            _ => Ok(DiffEventResponse::None),
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Length(30),  // File list
                Constraint::Min(50),     // Diff content
            ])
            .split(area);

        self.render_file_list(frame, chunks[0]);
        self.render_diff_content(frame, chunks[1]);
    }

    fn render_file_list(&self, frame: &mut Frame, area: Rect) {
        let files: Vec<ListItem> = self.diffs
            .iter()
            .enumerate()
            .map(|(index, file)| {
                let style = if index == self.current_file_index {
                    self.selected_file_style()
                } else {
                    self.file_style(&file.file_status)
                };

                let icon = match file.file_status {
                    FileStatus::Added => "+ ",
                    FileStatus::Deleted => "- ",
                    FileStatus::Modified => "~ ",
                    FileStatus::Renamed => "→ ",
                };

                ListItem::new(Line::from(Span::styled(
                    format!("{}{}", icon, file.path),
                    style,
                )))
            })
            .collect();

        let block = Block::default()
            .borders(Borders::ALL)
            .title("Files")
            .border_style(if self.focused_element == DiffFocusElement::FileList {
                self.focused_border_style()
            } else {
                self.unfocused_border_style()
            });

        let list = List::new(files)
            .block(block)
            .highlight_style(self.highlight_style());

        frame.render_widget(list, area);
    }

    fn render_diff_content(&self, frame: &mut Frame, area: Rect) {
        let block = Block::default()
            .borders(Borders::ALL)
            .title(format!("Diff: {}",
                self.current_file().map(|f| f.path.as_str()).unwrap_or("No file selected")))
            .border_style(if self.focused_element == DiffFocusElement::DiffContent {
                self.focused_border_style()
            } else {
                self.unfocused_border_style()
            });

        if let Some(file) = self.current_file() {
            let inner_area = block.inner(area);

            let mut all_lines = Vec::new();
            for (hunk_index, hunk) in file.hunks.iter().enumerate() {
                // Add hunk header
                all_lines.push(ListItem::new(Line::from(Span::styled(
                    hunk.header.clone(),
                    self.hunk_header_style(hunk_index == self.current_hunk_index),
                ))));

                // Add diff lines
                for line in &hunk.lines {
                    let line_content = format!(
                        "{:4} {:4} {}",
                        line.old_line_num.map(|n| n.to_string()).unwrap_or_else(|| " ".to_string()),
                        line.new_line_num.map(|n| n.to_string()).unwrap_or_else(|| " ".to_string()),
                        line.content
                    );

                    let style = match line.line_type {
                        DiffLineType::Addition => self.addition_style(),
                        DiffLineType::Deletion => self.deletion_style(),
                        DiffLineType::Context => self.context_style(),
                        DiffLineType::NoNewline => self.dim_style(),
                    };

                    all_lines.push(ListItem::new(Line::from(Span::styled(line_content, style))));
                }
            }

            // Apply scroll offset
            let visible_lines: Vec<ListItem> = all_lines
                .into_iter()
                .skip(self.scroll_offset)
                .take(inner_area.height as usize)
                .collect();

            let list = List::new(visible_lines);
            frame.render_widget(list, inner_area);

            // Render scrollbar
            if file.hunks.iter().map(|h| h.lines.len()).sum::<usize>() > inner_area.height as usize {
                let scrollbar = Scrollbar::default()
                    .orientation(ScrollbarOrientation::VerticalRight)
                    .begin_symbol(Some("↑"))
                    .end_symbol(Some("↓"));

                let mut scrollbar_state = ScrollbarState::new(
                    file.hunks.iter().map(|h| h.lines.len()).sum::<usize>()
                ).position(self.scroll_offset);

                frame.render_stateful_widget(
                    scrollbar,
                    area.inner(ratatui::layout::Margin { vertical: 1, horizontal: 0 }),
                    &mut scrollbar_state,
                );
            }
        } else {
            let empty_text = Paragraph::new("No file selected")
                .block(block)
                .style(self.dim_style())
                .alignment(Alignment::Center);
            frame.render_widget(empty_text, area);
        }
    }

    fn parse_git_diff(&self, diff_text: &str) -> Result<Vec<DiffFile>> {
        // Basic git diff parser - handles unified diff format
        let mut files = Vec::new();
        let mut current_file: Option<DiffFile> = None;
        let mut current_hunk: Option<DiffHunk> = None;

        for line in diff_text.lines() {
            if line.starts_with("diff --git") {
                // Save previous file if exists
                if let Some(mut file) = current_file.take() {
                    if let Some(hunk) = current_hunk.take() {
                        file.hunks.push(hunk);
                    }
                    files.push(file);
                }

                // Parse new file
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let path = parts[3].trim_start_matches("b/");
                    current_file = Some(DiffFile {
                        path: path.to_string(),
                        file_status: FileStatus::Modified,
                        hunks: Vec::new(),
                    });
                }
            } else if line.starts_with("@@") {
                // Save previous hunk if exists
                if let Some(mut file) = current_file.as_mut() {
                    if let Some(hunk) = current_hunk.take() {
                        file.hunks.push(hunk);
                    }
                }

                // Parse hunk header
                current_hunk = Some(DiffHunk {
                    old_start: 1,
                    old_count: 1,
                    new_start: 1,
                    new_count: 1,
                    lines: Vec::new(),
                });
            } else if let Some(ref mut hunk) = current_hunk {
                // Parse diff lines
                if line.starts_with('+') {
                    hunk.lines.push(DiffLine {
                        line_type: LineType::Added,
                        content: line[1..].to_string(),
                    });
                } else if line.starts_with('-') {
                    hunk.lines.push(DiffLine {
                        line_type: LineType::Removed,
                        content: line[1..].to_string(),
                    });
                } else if line.starts_with(' ') {
                    hunk.lines.push(DiffLine {
                        line_type: LineType::Context,
                        content: line[1..].to_string(),
                    });
                }
            }
        }

        // Save final file and hunk
        if let Some(mut file) = current_file {
            if let Some(hunk) = current_hunk {
                file.hunks.push(hunk);
            }
            files.push(file);
        }

        // If no files parsed, return example for demonstration
        if files.is_empty() {
            Ok(vec![
                DiffFile {
                    path: "example.rs".to_string(),
                    file_status: FileStatus::Modified,
                    hunks: vec![
                        DiffHunk {
                            old_start: 1,
                            old_count: 3,
                            new_start: 1,
                            new_count: 3,
                            lines: vec![
                                DiffLine {
                                    line_type: DiffLineType::Context,
                                    content: "fn main() {".to_string(),
                                    old_line_num: Some(1),
                                    new_line_num: Some(1),
                                },
                                DiffLine {
                                    line_type: DiffLineType::Deletion,
                                    content: "    println!(\"Hello, World!\");".to_string(),
                                    old_line_num: Some(2),
                                    new_line_num: None,
                                },
                                DiffLine {
                                    line_type: DiffLineType::Addition,
                                    content: "    println!(\"Hello, Cortex!\");".to_string(),
                                    old_line_num: None,
                                    new_line_num: Some(2),
                                },
                                DiffLine {
                                    line_type: DiffLineType::Context,
                                    content: "}".to_string(),
                                    old_line_num: Some(3),
                                    new_line_num: Some(3),
                                },
                            ],
                        }
                    ],
                }
            ])
        } else {
            Ok(files)
        }
    }

    // Style helpers
    fn focused_border_style(&self) -> Style {
        match self.theme {
            DiffTheme::Dark => Style::default().fg(Color::Yellow),
            DiffTheme::Light => Style::default().fg(Color::Blue),
        }
    }

    fn unfocused_border_style(&self) -> Style {
        match self.theme {
            DiffTheme::Dark => Style::default().fg(Color::Gray),
            DiffTheme::Light => Style::default().fg(Color::DarkGray),
        }
    }

    fn file_style(&self, status: &FileStatus) -> Style {
        match status {
            FileStatus::Added => Style::default().fg(Color::Green),
            FileStatus::Deleted => Style::default().fg(Color::Red),
            FileStatus::Modified => Style::default().fg(Color::Yellow),
            FileStatus::Renamed => Style::default().fg(Color::Blue),
        }
    }

    fn selected_file_style(&self) -> Style {
        match self.theme {
            DiffTheme::Dark => Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD),
            DiffTheme::Light => Style::default().fg(Color::Blue).add_modifier(Modifier::BOLD),
        }
    }

    fn highlight_style(&self) -> Style {
        match self.theme {
            DiffTheme::Dark => Style::default().bg(Color::DarkGray),
            DiffTheme::Light => Style::default().bg(Color::Gray),
        }
    }

    fn hunk_header_style(&self, is_current: bool) -> Style {
        let base_style = match self.theme {
            DiffTheme::Dark => Style::default().fg(Color::Magenta),
            DiffTheme::Light => Style::default().fg(Color::Magenta),
        };

        if is_current {
            base_style.add_modifier(Modifier::BOLD)
        } else {
            base_style
        }
    }

    fn addition_style(&self) -> Style {
        Style::default().fg(Color::Green)
    }

    fn deletion_style(&self) -> Style {
        Style::default().fg(Color::Red)
    }

    fn context_style(&self) -> Style {
        match self.theme {
            DiffTheme::Dark => Style::default().fg(Color::White),
            DiffTheme::Light => Style::default().fg(Color::Black),
        }
    }

    fn dim_style(&self) -> Style {
        Style::default().add_modifier(Modifier::DIM)
    }
}
