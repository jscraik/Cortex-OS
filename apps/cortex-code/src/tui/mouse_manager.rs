use anyhow::Result;
use crossterm::event::{MouseEvent, MouseEventKind, MouseButton};
use ratatui::layout::Rect;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tracing::{debug, info};

/// Enhanced mouse handling manager inspired by OpenAI Codex patterns
/// Provides copy/paste functionality and intelligent mouse mode switching
#[derive(Debug, Clone)]
pub struct MouseManager {
    mouse_mode: MouseMode,
    selection_state: Option<SelectionState>,
    last_click: Option<ClickState>,
    scroll_position: u16,
    double_click_threshold: Duration,
    drag_threshold: u16,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum MouseMode {
    /// TUI handles all mouse events (default)
    TuiMode,
    /// Terminal handles mouse events for copy/paste
    TerminalMode,
    /// Hybrid mode - switches based on context
    HybridMode,
}

#[derive(Debug, Clone)]
pub struct SelectionState {
    pub start_pos: (u16, u16),
    pub end_pos: (u16, u16),
    pub content: Option<String>,
    pub area: Rect,
    pub created_at: Instant,
}

#[derive(Debug, Clone)]
pub struct ClickState {
    pub position: (u16, u16),
    pub button: MouseButton,
    pub timestamp: Instant,
    pub click_count: u8,
}

#[derive(Debug, Clone)]
pub enum MouseEventResponse {
    /// Handle scroll events
    Scroll { direction: ScrollDirection, delta: i16 },
    /// Handle selection events
    Selection { state: SelectionState },
    /// Request mode toggle
    ToggleMode,
    /// Copy selected text to clipboard
    CopyToClipboard { content: String },
    /// Open context menu
    ContextMenu { position: (u16, u16) },
    /// Focus change
    FocusChange { area: Rect },
    /// No action needed
    None,
}

#[derive(Debug, Clone, Copy)]
pub enum ScrollDirection {
    Up,
    Down,
    Left,
    Right,
}

impl Default for MouseManager {
    fn default() -> Self {
        Self::new()
    }
}

impl MouseManager {
    pub fn new() -> Self {
        Self {
            mouse_mode: MouseMode::HybridMode,
            selection_state: None,
            last_click: None,
            scroll_position: 0,
            double_click_threshold: Duration::from_millis(500),
            drag_threshold: 3,
        }
    }

    /// Handle mouse events based on current mode
    pub fn handle_mouse_event(
        &mut self,
        event: MouseEvent,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        debug!("Handling mouse event: {:?} in area: {:?}", event, area);

        match self.mouse_mode {
            MouseMode::TuiMode => self.handle_tui_mouse_event(event, area),
            MouseMode::TerminalMode => self.handle_terminal_mouse_event(event, area),
            MouseMode::HybridMode => self.handle_hybrid_mouse_event(event, area),
        }
    }

    /// Handle mouse events in TUI mode (TUI controls everything)
    fn handle_tui_mouse_event(
        &mut self,
        event: MouseEvent,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        match event.kind {
            MouseEventKind::Down(button) => {
                self.handle_mouse_down(button, event.column, event.row, area)
            }
            MouseEventKind::Up(button) => {
                self.handle_mouse_up(button, event.column, event.row, area)
            }
            MouseEventKind::Drag(button) => {
                self.handle_mouse_drag(button, event.column, event.row, area)
            }
            MouseEventKind::Moved => {
                self.handle_mouse_move(event.column, event.row, area)
            }
            MouseEventKind::ScrollDown => {
                self.scroll_position = self.scroll_position.saturating_add(3);
                Ok(MouseEventResponse::Scroll {
                    direction: ScrollDirection::Down,
                    delta: 3,
                })
            }
            MouseEventKind::ScrollUp => {
                self.scroll_position = self.scroll_position.saturating_sub(3);
                Ok(MouseEventResponse::Scroll {
                    direction: ScrollDirection::Up,
                    delta: 3,
                })
            }
            MouseEventKind::ScrollLeft => {
                Ok(MouseEventResponse::Scroll {
                    direction: ScrollDirection::Left,
                    delta: 2,
                })
            }
            MouseEventKind::ScrollRight => {
                Ok(MouseEventResponse::Scroll {
                    direction: ScrollDirection::Right,
                    delta: 2,
                })
            }
        }
    }

    /// Handle mouse events in terminal mode (terminal handles copy/paste)
    fn handle_terminal_mouse_event(
        &mut self,
        _event: MouseEvent,
        _area: Rect,
    ) -> Result<MouseEventResponse> {
        // In terminal mode, we don't process mouse events
        // They're handled by the terminal for copy/paste
        Ok(MouseEventResponse::None)
    }

    /// Handle mouse events in hybrid mode (context-aware switching)
    fn handle_hybrid_mouse_event(
        &mut self,
        event: MouseEvent,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        // Check if user is trying to select text
        if self.is_text_selection_gesture(&event) {
            info!("Detected text selection gesture, switching to terminal mode");
            self.mouse_mode = MouseMode::TerminalMode;
            Ok(MouseEventResponse::ToggleMode)
        } else {
            // Handle as TUI event
            self.handle_tui_mouse_event(event, area)
        }
    }

    /// Detect if the mouse gesture indicates text selection intent
    fn is_text_selection_gesture(&self, event: &MouseEvent) -> bool {
        match event.kind {
            MouseEventKind::Drag(MouseButton::Left) => {
                // Check if this is a long enough drag to be selection
                if let Some(ref last_click) = self.last_click {
                    if last_click.button == MouseButton::Left {
                        let distance = self.calculate_distance(
                            last_click.position,
                            (event.column, event.row),
                        );
                        return distance > self.drag_threshold;
                    }
                }
            }
            _ => {}
        }
        false
    }

    /// Handle mouse button down events
    fn handle_mouse_down(
        &mut self,
        button: MouseButton,
        x: u16,
        y: u16,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        let position = (x, y);
        let timestamp = Instant::now();

        // Check for double-click
        let mut click_count = 1;
        if let Some(ref last_click) = self.last_click {
            if last_click.button == button
                && self.calculate_distance(last_click.position, position) <= 2
                && timestamp.duration_since(last_click.timestamp) <= self.double_click_threshold
            {
                click_count = last_click.click_count + 1;
            }
        }

        self.last_click = Some(ClickState {
            position,
            button,
            timestamp,
            click_count,
        });

        match button {
            MouseButton::Left => {
                if click_count == 2 {
                    // Double-click: select word
                    self.start_word_selection(x, y, area)
                } else {
                    // Single click: start potential selection
                    self.start_selection(x, y, area)
                }
            }
            MouseButton::Right => {
                // Right-click: context menu
                Ok(MouseEventResponse::ContextMenu { position })
            }
            MouseButton::Middle => {
                // Middle-click: paste
                Ok(MouseEventResponse::None) // TODO: Implement paste
            }
        }
    }

    /// Handle mouse button up events
    fn handle_mouse_up(
        &mut self,
        button: MouseButton,
        x: u16,
        y: u16,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        match button {
            MouseButton::Left => {
                if let Some(ref selection) = self.selection_state {
                    // Complete selection
                    let mut final_selection = selection.clone();
                    final_selection.end_pos = (x, y);

                    // If selection is large enough, copy to clipboard
                    if self.calculate_distance(selection.start_pos, final_selection.end_pos) > 5 {
                        if let Some(content) = &final_selection.content {
                            return Ok(MouseEventResponse::CopyToClipboard {
                                content: content.clone(),
                            });
                        }
                    }

                    self.selection_state = Some(final_selection.clone());
                    Ok(MouseEventResponse::Selection { state: final_selection })
                } else {
                    // Single click without drag - focus change
                    Ok(MouseEventResponse::FocusChange { area })
                }
            }
            _ => Ok(MouseEventResponse::None),
        }
    }

    /// Handle mouse drag events
    fn handle_mouse_drag(
        &mut self,
        button: MouseButton,
        x: u16,
        y: u16,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        if button == MouseButton::Left {
            if let Some(ref mut selection) = self.selection_state {
                selection.end_pos = (x, y);
                // TODO: Extract text content based on selection area
                Ok(MouseEventResponse::Selection { state: selection.clone() })
            } else {
                // Start selection if we don't have one
                self.start_selection(x, y, area)
            }
        } else {
            Ok(MouseEventResponse::None)
        }
    }

    /// Handle mouse move events
    fn handle_mouse_move(
        &mut self,
        _x: u16,
        _y: u16,
        _area: Rect,
    ) -> Result<MouseEventResponse> {
        // TODO: Implement hover effects, cursor changes, etc.
        Ok(MouseEventResponse::None)
    }

    /// Start text selection
    fn start_selection(
        &mut self,
        x: u16,
        y: u16,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        self.selection_state = Some(SelectionState {
            start_pos: (x, y),
            end_pos: (x, y),
            content: None,
            area,
            created_at: Instant::now(),
        });
        Ok(MouseEventResponse::None)
    }

    /// Start word selection (double-click)
    fn start_word_selection(
        &mut self,
        x: u16,
        y: u16,
        area: Rect,
    ) -> Result<MouseEventResponse> {
        // TODO: Implement word boundary detection
        self.start_selection(x, y, area)
    }

    /// Calculate distance between two points
    fn calculate_distance(&self, pos1: (u16, u16), pos2: (u16, u16)) -> u16 {
        let dx = (pos1.0 as i32 - pos2.0 as i32).abs() as u16;
        let dy = (pos1.1 as i32 - pos2.1 as i32).abs() as u16;
    dx + dy // Manhattan distance
    }

    /// Toggle mouse mode
    pub fn toggle_mode(&mut self) -> MouseMode {
        self.mouse_mode = match self.mouse_mode {
            MouseMode::TuiMode => MouseMode::TerminalMode,
            MouseMode::TerminalMode => MouseMode::TuiMode,
            MouseMode::HybridMode => MouseMode::TerminalMode,
        };
        info!("Mouse mode switched to: {:?}", self.mouse_mode);
        self.mouse_mode
    }

    /// Get current mouse mode
    pub fn get_mode(&self) -> MouseMode {
        self.mouse_mode
    }

    /// Set mouse mode
    pub fn set_mode(&mut self, mode: MouseMode) {
        self.mouse_mode = mode;
        info!("Mouse mode set to: {:?}", mode);
    }

    /// Get current selection
    pub fn get_selection(&self) -> Option<&SelectionState> {
        self.selection_state.as_ref()
    }

    /// Clear current selection
    pub fn clear_selection(&mut self) {
        self.selection_state = None;
    }

    /// Get scroll position
    pub fn get_scroll_position(&self) -> u16 {
        self.scroll_position
    }

    /// Set scroll position
    pub fn set_scroll_position(&mut self, position: u16) {
        self.scroll_position = position;
    }
}

/// Utility functions for mouse management
pub mod utils {
    use super::*;
    use std::process::Command;

    /// Copy text to system clipboard
    pub fn copy_to_clipboard(text: &str) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            let mut cmd = Command::new("pbcopy");
            cmd.arg(text);
            let _ = cmd.output()?;
        }

        #[cfg(target_os = "linux")]
        {
            // Try xclip first, then xsel
            if Command::new("xclip").arg("-version").output().is_ok() {
                let mut cmd = Command::new("xclip");
                cmd.args(["-selection", "clipboard"]);
                let mut child = cmd.stdin(std::process::Stdio::piped()).spawn()?;
                if let Some(stdin) = child.stdin.as_mut() {
                    use std::io::Write;
                    stdin.write_all(text.as_bytes())?;
                }
                child.wait()?;
            } else if Command::new("xsel").arg("--version").output().is_ok() {
                let mut cmd = Command::new("xsel");
                cmd.args(["--clipboard", "--input"]);
                let mut child = cmd.stdin(std::process::Stdio::piped()).spawn()?;
                if let Some(stdin) = child.stdin.as_mut() {
                    use std::io::Write;
                    stdin.write_all(text.as_bytes())?;
                }
                child.wait()?;
            }
        }

        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("clip");
            let mut child = cmd.stdin(std::process::Stdio::piped()).spawn()?;
            if let Some(stdin) = child.stdin.as_mut() {
                use std::io::Write;
                stdin.write_all(text.as_bytes())?;
            }
            child.wait()?;
        }

        Ok(())
    }

    /// Get text from system clipboard
    pub fn get_from_clipboard() -> Result<String> {
        #[cfg(target_os = "macos")]
        {
            let output = Command::new("pbpaste").output()?;
            return Ok(String::from_utf8_lossy(&output.stdout).to_string());
        }

        #[cfg(target_os = "linux")]
        {
            if Command::new("xclip").arg("-version").output().is_ok() {
                let output = Command::new("xclip")
                    .args(["-selection", "clipboard", "-o"])
                    .output()?;
                return Ok(String::from_utf8_lossy(&output.stdout).to_string());
            } else if Command::new("xsel").arg("--version").output().is_ok() {
                let output = Command::new("xsel")
                    .args(["--clipboard", "--output"])
                    .output()?;
                return Ok(String::from_utf8_lossy(&output.stdout).to_string());
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Windows clipboard access requires more complex implementation
            // For now, return empty
            return Ok(String::new());
        }


        // Fallback for non-supported targets
        #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
        {
            return Ok(String::new());
        }
    }
}
