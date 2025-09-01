use crate::app::{Message, MessageRole};
use crate::Result;
use crossterm::event::Event;
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, List, ListItem, Paragraph, Wrap},
    Frame,
};
use std::collections::VecDeque;
use tui_input::Input;
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct ChatWidget {
    messages: VecDeque<Message>,
    scroll_offset: usize,
    focused_element: FocusElement,
    input: Input,
    theme: Theme,
    state: ChatState,
    streaming_state: Option<StreamingState>,
}

#[derive(Debug, Clone)]
pub struct StreamingState {
    pub partial_message: String,
    pub session_id: String,
    pub provider: String,
    pub last_update: Instant,
    pub cursor_visible: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FocusElement {
    MessageList,
    InputField,
    SendButton,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Theme {
    Dark,
    Light,
}

#[derive(Debug, Clone)]
pub enum EventResponse {
    SendMessage(String),
    RequestStreamingMessage(String),
    None,
}

#[derive(Debug, Clone)]
pub struct ChatState {
    pub is_loading: bool,
    pub error_message: Option<String>,
}

impl Default for ChatWidget {
    fn default() -> Self {
        Self::new()
    }
}

impl ChatWidget {
    pub fn new() -> Self {
        Self {
            messages: VecDeque::new(),
            scroll_offset: 0,
            focused_element: FocusElement::MessageList,
            input: Input::default(),
            theme: Theme::Dark,
            state: ChatState {
                is_loading: false,
                error_message: None,
            },
            streaming_state: None,
        }
    }
    
    pub fn add_message(&mut self, message: Message) {
        self.messages.push_back(message);
        
        // Auto-scroll to bottom when new message is added
        self.scroll_to_bottom();
    }
    
    pub fn scroll_offset(&self) -> usize {
        self.scroll_offset
    }
    
    pub fn focused_element(&self) -> FocusElement {
        self.focused_element.clone()
    }
    
    pub fn set_focus(&mut self, element: FocusElement) {
        self.focused_element = element;
    }
    
    pub fn input_text(&self) -> &str {
        self.input.value()
    }
    
    pub fn theme(&self) -> &Theme {
        &self.theme
    }
    
    pub fn set_theme(&mut self, theme: Theme) {
        self.theme = theme;
    }
    
    pub fn aria_label(&self) -> &'static str {
        "Chat conversation"
    }
    
    pub fn input_aria_label(&self) -> &'static str {
        "Type your message here"
    }
    
    pub fn send_button_aria_label(&self) -> &'static str {
        "Send message"
    }
    
    // Streaming support methods
    pub fn start_streaming(&mut self, session_id: String, provider: String) {
        self.streaming_state = Some(StreamingState {
            partial_message: String::new(),
            session_id,
            provider,
            last_update: Instant::now(),
            cursor_visible: true,
        });
        self.state.is_loading = true;
    }
    
    pub fn append_streaming_chunk(&mut self, chunk: &str) {
        if let Some(ref mut streaming_state) = self.streaming_state {
            streaming_state.partial_message.push_str(chunk);
            streaming_state.last_update = Instant::now();
            
            // Auto-scroll to bottom when new content arrives
            self.scroll_to_bottom();
        }
    }
    
    pub fn complete_streaming(&mut self) {
        if let Some(streaming_state) = self.streaming_state.take() {
            // Add the complete message to the chat
            let message = Message {
                role: MessageRole::Assistant,
                content: streaming_state.partial_message,
                timestamp: std::time::SystemTime::now(),
            };
            self.add_message(message);
        }
        self.state.is_loading = false;
    }
    
    pub fn is_streaming(&self) -> bool {
        self.streaming_state.is_some()
    }
    
    pub fn update_cursor(&mut self) {
        if let Some(ref mut streaming_state) = self.streaming_state {
            // Toggle cursor visibility every 500ms
            if streaming_state.last_update.elapsed() > Duration::from_millis(500) {
                streaming_state.cursor_visible = !streaming_state.cursor_visible;
                streaming_state.last_update = Instant::now();
            }
        }
    }
    
    fn scroll_to_bottom(&mut self) {
        if self.messages.len() > 10 {
            self.scroll_offset = self.messages.len().saturating_sub(10);
        } else {
            self.scroll_offset = 0;
        }
    }
    
    pub fn handle_event(&mut self, event: Event) -> Result<EventResponse> {
        use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
        
        match event {
            Event::Key(KeyEvent { code, modifiers, .. }) => {
                match (code, modifiers) {
                    // Navigation
                    (KeyCode::Tab, KeyModifiers::NONE) => {
                        self.cycle_focus_forward();
                        Ok(EventResponse::None)
                    }
                    (KeyCode::BackTab, KeyModifiers::SHIFT) => {
                        self.cycle_focus_backward();
                        Ok(EventResponse::None)
                    }
                    
                    // Scrolling (only when message list is focused)
                    (KeyCode::PageDown, KeyModifiers::NONE) if self.focused_element == FocusElement::MessageList => {
                        self.scroll_down();
                        Ok(EventResponse::None)
                    }
                    (KeyCode::PageUp, KeyModifiers::NONE) if self.focused_element == FocusElement::MessageList => {
                        self.scroll_up();
                        Ok(EventResponse::None)
                    }
                    (KeyCode::End, KeyModifiers::CONTROL) if self.focused_element == FocusElement::MessageList => {
                        self.scroll_to_bottom();
                        Ok(EventResponse::None)
                    }
                    (KeyCode::Home, KeyModifiers::CONTROL) if self.focused_element == FocusElement::MessageList => {
                        self.scroll_offset = 0;
                        Ok(EventResponse::None)
                    }
                    
                    // Input handling (only when input field is focused)
                    (KeyCode::Char(c), KeyModifiers::NONE) if self.focused_element == FocusElement::InputField => {
                        self.input.handle(tui_input::InputRequest::InsertChar(c));
                        Ok(EventResponse::None)
                    }
                    (KeyCode::Backspace, KeyModifiers::NONE) if self.focused_element == FocusElement::InputField => {
                        self.input.handle(tui_input::InputRequest::DeletePrevChar);
                        Ok(EventResponse::None)
                    }
                    (KeyCode::Delete, KeyModifiers::NONE) if self.focused_element == FocusElement::InputField => {
                        self.input.handle(tui_input::InputRequest::DeleteNextChar);
                        Ok(EventResponse::None)
                    }
                    (KeyCode::Left, KeyModifiers::NONE) if self.focused_element == FocusElement::InputField => {
                        self.input.handle(tui_input::InputRequest::GoToPrevChar);
                        Ok(EventResponse::None)
                    }
                    (KeyCode::Right, KeyModifiers::NONE) if self.focused_element == FocusElement::InputField => {
                        self.input.handle(tui_input::InputRequest::GoToNextChar);
                        Ok(EventResponse::None)
                    }
                    
                    // Send message (Enter in input field or Space on send button)
                    (KeyCode::Enter, KeyModifiers::NONE) if self.focused_element == FocusElement::InputField => {
                        self.send_current_message()
                    }
                    // Send streaming message (Shift+Enter)
                    (KeyCode::Enter, KeyModifiers::SHIFT) if self.focused_element == FocusElement::InputField => {
                        self.send_current_streaming_message()
                    }
                    (KeyCode::Char(' '), KeyModifiers::NONE) if self.focused_element == FocusElement::SendButton => {
                        self.send_current_message()
                    }
                    (KeyCode::Enter, KeyModifiers::NONE) if self.focused_element == FocusElement::SendButton => {
                        self.send_current_message()
                    }
                    
                    _ => Ok(EventResponse::None),
                }
            }
            _ => Ok(EventResponse::None),
        }
    }
    
    fn cycle_focus_forward(&mut self) {
        self.focused_element = match self.focused_element {
            FocusElement::MessageList => FocusElement::InputField,
            FocusElement::InputField => FocusElement::SendButton,
            FocusElement::SendButton => FocusElement::MessageList,
        };
    }
    
    fn cycle_focus_backward(&mut self) {
        self.focused_element = match self.focused_element {
            FocusElement::MessageList => FocusElement::SendButton,
            FocusElement::InputField => FocusElement::MessageList,
            FocusElement::SendButton => FocusElement::InputField,
        };
    }
    
    fn scroll_down(&mut self) {
        if self.scroll_offset + 10 < self.messages.len() {
            self.scroll_offset += 10;
        }
    }
    
    fn scroll_up(&mut self) {
        self.scroll_offset = self.scroll_offset.saturating_sub(10);
    }
    
    fn send_current_message(&mut self) -> Result<EventResponse> {
        let message = self.input.value().to_string();
        if !message.trim().is_empty() {
            self.input.reset();
            Ok(EventResponse::SendMessage(message))
        } else {
            Ok(EventResponse::None)
        }
    }
    
    fn send_current_streaming_message(&mut self) -> Result<EventResponse> {
        let message = self.input.value().to_string();
        if !message.trim().is_empty() {
            self.input.reset();
            Ok(EventResponse::RequestStreamingMessage(message))
        } else {
            Ok(EventResponse::None)
        }
    }
    
    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Min(3),      // Messages area
                Constraint::Length(3),   // Input area
            ])
            .split(area);
        
        self.render_messages(frame, chunks[0]);
        self.render_input(frame, chunks[1]);
    }
    
    fn render_messages(&self, frame: &mut Frame, area: Rect) {
        let block = Block::default()
            .borders(Borders::ALL)
            .title("Chat")
            .border_style(if self.focused_element == FocusElement::MessageList {
                self.focused_style()
            } else {
                self.unfocused_style()
            });
        
        if self.messages.is_empty() {
            let empty_text = Paragraph::new("No messages yet. Start typing below!")
                .block(block)
                .style(self.dim_style())
                .alignment(Alignment::Center)
                .wrap(Wrap { trim: true });
            frame.render_widget(empty_text, area);
            return;
        }
        
        let mut visible_messages: Vec<ListItem> = self
            .messages
            .iter()
            .skip(self.scroll_offset)
            .take(area.height.saturating_sub(2) as usize)
            .map(|message| self.format_message(message))
            .collect();
        
        // Add streaming message if active
        if let Some(ref streaming_state) = self.streaming_state {
            let streaming_message = self.format_streaming_message(streaming_state);
            visible_messages.push(streaming_message);
        }
        
        let list = List::new(visible_messages)
            .block(block)
            .highlight_style(self.highlight_style());
        
        frame.render_widget(list, area);
        
        // Show scroll indicator if needed
        if self.messages.len() > area.height.saturating_sub(2) as usize {
            self.render_scroll_indicator(frame, area);
        }
    }
    
    fn render_input(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Min(10),     // Input field
                Constraint::Length(8),   // Send button
            ])
            .split(area);
        
        // Input field
        let input_block = Block::default()
            .borders(Borders::ALL)
            .title("Message")
            .border_style(if self.focused_element == FocusElement::InputField {
                self.focused_style()
            } else {
                self.unfocused_style()
            });
        
        let input_paragraph = Paragraph::new(self.input.value())
            .block(input_block)
            .wrap(Wrap { trim: false });
        
        frame.render_widget(input_paragraph, chunks[0]);
        
        // Show cursor if input is focused
        if self.focused_element == FocusElement::InputField {
            let cursor_x = chunks[0].x + self.input.visual_cursor() as u16 + 1;
            let cursor_y = chunks[0].y + 1;
            frame.set_cursor_position((cursor_x, cursor_y));
        }
        
        // Send button
        let send_button = Paragraph::new("Send")
            .block(Block::default()
                .borders(Borders::ALL)
                .border_style(if self.focused_element == FocusElement::SendButton {
                    self.focused_style()
                } else {
                    self.unfocused_style()
                }))
            .alignment(Alignment::Center);
        
        frame.render_widget(send_button, chunks[1]);
    }
    
    fn format_message(&self, message: &Message) -> ListItem {
        let (prefix, style, _alignment) = match message.role {
            MessageRole::User => ("You", self.user_style(), Alignment::Right),
            MessageRole::Assistant => ("Cortex", self.assistant_style(), Alignment::Left),
            MessageRole::System => ("System", self.system_style(), Alignment::Center),
        };
        
        let timestamp = message.timestamp
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        let content = format!("[{}] {}: {}", 
                            Self::format_timestamp(timestamp),
                            prefix, 
                            message.content);
        
        ListItem::new(Line::from(Span::styled(content, style)))
    }
    
    fn format_streaming_message(&self, streaming_state: &StreamingState) -> ListItem {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        let cursor = if streaming_state.cursor_visible { "▊" } else { " " };
        let content = format!("[{}] Cortex ({}): {}{}",
                            Self::format_timestamp(timestamp),
                            streaming_state.provider,
                            streaming_state.partial_message,
                            cursor);
        
        ListItem::new(Line::from(Span::styled(content, self.streaming_style())))
    }
    
    fn format_timestamp(timestamp: u64) -> String {
        // Simple timestamp formatting - in real implementation would use chrono
        let hours = (timestamp % 86400) / 3600;
        let minutes = (timestamp % 3600) / 60;
        format!("{:02}:{:02}", hours, minutes)
    }
    
    fn render_scroll_indicator(&self, frame: &mut Frame, area: Rect) {
        if self.messages.is_empty() {
            return;
        }
        
        let total_messages = self.messages.len();
        let visible_count = area.height.saturating_sub(2) as usize;
        let scroll_progress = if total_messages <= visible_count {
            1.0
        } else {
            (self.scroll_offset + visible_count) as f64 / total_messages as f64
        };
        
        let indicator_text = if scroll_progress >= 1.0 {
            "End".to_string()
        } else {
            format!("{}%", (scroll_progress * 100.0) as u32)
        };
        
        let indicator_area = Rect::new(
            area.x + area.width - 6,
            area.y + area.height - 1,
            5,
            1,
        );
        
        let indicator = Paragraph::new(indicator_text)
            .style(self.dim_style())
            .alignment(Alignment::Right);
        
        frame.render_widget(Clear, indicator_area);
        frame.render_widget(indicator, indicator_area);
    }
    
    // Style helpers
    fn focused_style(&self) -> Style {
        match self.theme {
            Theme::Dark => Style::default().fg(Color::Yellow),
            Theme::Light => Style::default().fg(Color::Blue),
        }
    }
    
    fn unfocused_style(&self) -> Style {
        match self.theme {
            Theme::Dark => Style::default().fg(Color::Gray),
            Theme::Light => Style::default().fg(Color::DarkGray),
        }
    }
    
    fn highlight_style(&self) -> Style {
        match self.theme {
            Theme::Dark => Style::default().bg(Color::DarkGray),
            Theme::Light => Style::default().bg(Color::Gray),
        }
    }
    
    fn user_style(&self) -> Style {
        match self.theme {
            Theme::Dark => Style::default().fg(Color::Cyan),
            Theme::Light => Style::default().fg(Color::Blue),
        }
    }
    
    fn assistant_style(&self) -> Style {
        match self.theme {
            Theme::Dark => Style::default().fg(Color::Green),
            Theme::Light => Style::default().fg(Color::Green),
        }
    }
    
    fn system_style(&self) -> Style {
        match self.theme {
            Theme::Dark => Style::default().fg(Color::Yellow).add_modifier(Modifier::DIM),
            Theme::Light => Style::default().fg(Color::Yellow).add_modifier(Modifier::DIM),
        }
    }
    
    fn dim_style(&self) -> Style {
        Style::default().add_modifier(Modifier::DIM)
    }
    
    fn streaming_style(&self) -> Style {
        match self.theme {
            Theme::Dark => Style::default().fg(Color::Yellow).add_modifier(Modifier::ITALIC),
            Theme::Light => Style::default().fg(Color::Red).add_modifier(Modifier::ITALIC),
        }
    }
}