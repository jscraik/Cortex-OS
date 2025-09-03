use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio::time::sleep;

/// Cursor animation styles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CursorStyle {
    /// Block cursor (█)
    Block,
    /// Underscore cursor (_)
    Underscore,
    /// Pipe cursor (|)
    Pipe,
    /// Dot cursor (●)
    Dot,
    /// Arrow cursor (►)
    Arrow,
    /// Spinner styles
    Spinner,
    SpinnerDots,
    SpinnerCircle,
    SpinnerBounce,
    /// Custom character
    Custom(char),
}

/// Cursor configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorConfig {
    /// Cursor style
    pub style: CursorStyle,
    /// Animation speed in milliseconds
    pub speed_ms: u64,
    /// Whether cursor should blink
    pub blink: bool,
    /// Blink interval in milliseconds
    pub blink_interval_ms: u64,
    /// Color (ANSI color code)
    pub color: Option<u8>,
    /// Whether to show cursor during streaming
    pub show_during_stream: bool,
    /// Whether to hide cursor when idle
    pub hide_when_idle: bool,
    /// Idle timeout in seconds
    pub idle_timeout_seconds: u64,
}

impl Default for CursorConfig {
    fn default() -> Self {
        Self {
            style: CursorStyle::Pipe,
            speed_ms: 500,
            blink: true,
            blink_interval_ms: 500,
            color: None,
            show_during_stream: true,
            hide_when_idle: false,
            idle_timeout_seconds: 30,
        }
    }
}

/// Cursor animator for terminal streaming display
#[derive(Debug)]
pub struct CursorAnimator {
    /// Configuration
    config: CursorConfig,
    /// Current animation frame
    frame: usize,
    /// Last animation update
    last_update: Instant,
    /// Last blink toggle
    last_blink: Instant,
    /// Current blink state
    blink_visible: bool,
    /// Whether cursor is currently visible
    visible: bool,
    /// Last activity timestamp
    last_activity: Instant,
    /// Whether currently streaming
    is_streaming: bool,
}

impl CursorAnimator {
    /// Create a new cursor animator
    pub fn new(config: CursorConfig) -> Self {
        let now = Instant::now();
        Self {
            config,
            frame: 0,
            last_update: now,
            last_blink: now,
            blink_visible: true,
            visible: true,
            last_activity: now,
            is_streaming: false,
        }
    }

    /// Create with default configuration
    pub fn default() -> Self {
        Self::new(CursorConfig::default())
    }

    /// Update cursor animation state
    pub fn update(&mut self) -> bool {
        let now = Instant::now();
        let mut updated = false;

        // Handle idle timeout
        if self.config.hide_when_idle {
            let idle_duration = now.duration_since(self.last_activity);
            let should_hide = idle_duration.as_secs() >= self.config.idle_timeout_seconds;

            if should_hide && self.visible {
                self.visible = false;
                updated = true;
            } else if !should_hide && !self.visible {
                self.visible = true;
                updated = true;
            }
        }

        // Handle streaming visibility
        if !self.config.show_during_stream && self.is_streaming {
            if self.visible {
                self.visible = false;
                updated = true;
            }
        } else if !self.visible && self.config.show_during_stream {
            self.visible = true;
            updated = true;
        }

        // Update animation frame
        if now.duration_since(self.last_update).as_millis() >= self.config.speed_ms as u128 {
            self.frame = (self.frame + 1) % self.get_frame_count();
            self.last_update = now;
            updated = true;
        }

        // Update blink state
        if self.config.blink {
            if now.duration_since(self.last_blink).as_millis() >= self.config.blink_interval_ms as u128 {
                self.blink_visible = !self.blink_visible;
                self.last_blink = now;
                updated = true;
            }
        } else {
            self.blink_visible = true;
        }

        updated
    }

    /// Get current cursor character
    pub fn get_char(&self) -> Option<char> {
        if !self.visible || (self.config.blink && !self.blink_visible) {
            return None;
        }

        Some(match self.config.style {
            CursorStyle::Block => '█',
            CursorStyle::Underscore => '_',
            CursorStyle::Pipe => '|',
            CursorStyle::Dot => '●',
            CursorStyle::Arrow => '►',
            CursorStyle::Spinner => self.get_spinner_char(&['|', '/', '-', '\\']),
            CursorStyle::SpinnerDots => self.get_spinner_char(&['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']),
            CursorStyle::SpinnerCircle => self.get_spinner_char(&['◐', '◓', '◑', '◒']),
            CursorStyle::SpinnerBounce => self.get_spinner_char(&['⠁', '⠂', '⠄', '⠂']),
            CursorStyle::Custom(c) => c,
        })
    }

    /// Get spinner character for current frame
    fn get_spinner_char(&self, chars: &[char]) -> char {
        if chars.is_empty() {
            return '|';
        }
        chars[self.frame % chars.len()]
    }

    /// Get frame count for current style
    fn get_frame_count(&self) -> usize {
        match self.config.style {
            CursorStyle::Block | CursorStyle::Underscore | CursorStyle::Pipe
            | CursorStyle::Dot | CursorStyle::Arrow | CursorStyle::Custom(_) => 1,
            CursorStyle::Spinner => 4,
            CursorStyle::SpinnerDots => 10,
            CursorStyle::SpinnerCircle => 4,
            CursorStyle::SpinnerBounce => 4,
        }
    }

    /// Get formatted cursor string with color
    pub fn get_formatted(&self) -> String {
        match self.get_char() {
            Some(char) => {
                if let Some(color) = self.config.color {
                    format!("\x1b[{}m{}\x1b[0m", color, char)
                } else {
                    char.to_string()
                }
            }
            None => String::new(),
        }
    }

    /// Mark activity (resets idle timer)
    pub fn mark_activity(&mut self) {
        self.last_activity = Instant::now();
        if self.config.hide_when_idle && !self.visible {
            self.visible = true;
        }
    }

    /// Set streaming state
    pub fn set_streaming(&mut self, streaming: bool) {
        self.is_streaming = streaming;
        if streaming {
            self.mark_activity();
        }
    }

    /// Check if cursor is visible
    pub fn is_visible(&self) -> bool {
        self.visible && (!self.config.blink || self.blink_visible)
    }

    /// Show cursor
    pub fn show(&mut self) {
        self.visible = true;
        self.mark_activity();
    }

    /// Hide cursor
    pub fn hide(&mut self) {
        self.visible = false;
    }

    /// Reset cursor state
    pub fn reset(&mut self) {
        self.frame = 0;
        self.last_update = Instant::now();
        self.last_blink = Instant::now();
        self.blink_visible = true;
        self.visible = true;
        self.mark_activity();
    }

    /// Update configuration
    pub fn update_config(&mut self, config: CursorConfig) {
        self.config = config;
        self.reset();
    }

    /// Get current configuration
    pub fn get_config(&self) -> &CursorConfig {
        &self.config
    }

    /// Set cursor style
    pub fn set_style(&mut self, style: CursorStyle) {
        self.config.style = style;
        self.frame = 0;
    }

    /// Set animation speed
    pub fn set_speed(&mut self, speed_ms: u64) {
        self.config.speed_ms = speed_ms;
    }

    /// Set blink settings
    pub fn set_blink(&mut self, blink: bool, interval_ms: Option<u64>) {
        self.config.blink = blink;
        if let Some(interval) = interval_ms {
            self.config.blink_interval_ms = interval;
        }
        self.blink_visible = true;
        self.last_blink = Instant::now();
    }

    /// Set color
    pub fn set_color(&mut self, color: Option<u8>) {
        self.config.color = color;
    }
}

/// Async cursor animation runner
pub struct AsyncCursorAnimator {
    animator: CursorAnimator,
    running: bool,
}

impl AsyncCursorAnimator {
    /// Create new async animator
    pub fn new(config: CursorConfig) -> Self {
        Self {
            animator: CursorAnimator::new(config),
            running: false,
        }
    }

    /// Start animation loop
    pub async fn start<F>(&mut self, mut callback: F) -> Result<()>
    where
        F: FnMut(&str) + Send + 'static,
    {
        self.running = true;

        while self.running {
            if self.animator.update() {
                let cursor_str = self.animator.get_formatted();
                callback(&cursor_str);
            }

            sleep(Duration::from_millis(50)).await; // 20 FPS
        }

        Ok(())
    }

    /// Stop animation loop
    pub fn stop(&mut self) {
        self.running = false;
    }

    /// Get mutable reference to animator
    pub fn animator_mut(&mut self) -> &mut CursorAnimator {
        &mut self.animator
    }

    /// Get reference to animator
    pub fn animator(&self) -> &CursorAnimator {
        &self.animator
    }

    /// Check if running
    pub fn is_running(&self) -> bool {
        self.running
    }
}

/// Cursor position in terminal
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct CursorPosition {
    /// Row (0-based)
    pub row: usize,
    /// Column (0-based)
    pub col: usize,
}

impl CursorPosition {
    /// Create new position
    pub fn new(row: usize, col: usize) -> Self {
        Self { row, col }
    }

    /// Get ANSI escape sequence to move cursor to this position
    pub fn to_ansi_escape(&self) -> String {
        format!("\x1b[{};{}H", self.row + 1, self.col + 1)
    }

    /// Move position by offset
    pub fn offset(&self, row_offset: i32, col_offset: i32) -> Self {
        Self {
            row: (self.row as i32 + row_offset).max(0) as usize,
            col: (self.col as i32 + col_offset).max(0) as usize,
        }
    }
}

/// Predefined cursor configurations
pub struct CursorPresets;

impl CursorPresets {
    /// Simple blinking pipe
    pub fn simple_blink() -> CursorConfig {
        CursorConfig {
            style: CursorStyle::Pipe,
            speed_ms: 500,
            blink: true,
            blink_interval_ms: 500,
            color: None,
            show_during_stream: true,
            hide_when_idle: false,
            idle_timeout_seconds: 30,
        }
    }

    /// Animated spinner
    pub fn spinner() -> CursorConfig {
        CursorConfig {
            style: CursorStyle::SpinnerDots,
            speed_ms: 100,
            blink: false,
            blink_interval_ms: 500,
            color: Some(36), // Cyan
            show_during_stream: true,
            hide_when_idle: true,
            idle_timeout_seconds: 10,
        }
    }

    /// Solid block cursor
    pub fn solid_block() -> CursorConfig {
        CursorConfig {
            style: CursorStyle::Block,
            speed_ms: 500,
            blink: false,
            blink_interval_ms: 500,
            color: Some(32), // Green
            show_during_stream: true,
            hide_when_idle: false,
            idle_timeout_seconds: 30,
        }
    }

    /// Minimalist underscore
    pub fn minimal() -> CursorConfig {
        CursorConfig {
            style: CursorStyle::Underscore,
            speed_ms: 500,
            blink: true,
            blink_interval_ms: 1000,
            color: Some(90), // Dark gray
            show_during_stream: false,
            hide_when_idle: true,
            idle_timeout_seconds: 5,
        }
    }

    /// Colorful animated
    pub fn colorful() -> CursorConfig {
        CursorConfig {
            style: CursorStyle::SpinnerCircle,
            speed_ms: 150,
            blink: false,
            blink_interval_ms: 500,
            color: Some(95), // Bright magenta
            show_during_stream: true,
            hide_when_idle: false,
            idle_timeout_seconds: 30,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_cursor_creation() {
        let config = CursorConfig::default();
        let mut cursor = CursorAnimator::new(config);

        assert!(cursor.is_visible());
        assert!(cursor.get_char().is_some());
    }

    #[test]
    fn test_cursor_styles() {
        let styles = vec![
            CursorStyle::Block,
            CursorStyle::Underscore,
            CursorStyle::Pipe,
            CursorStyle::Dot,
            CursorStyle::Arrow,
            CursorStyle::Spinner,
            CursorStyle::SpinnerDots,
            CursorStyle::Custom('X'),
        ];

        for style in styles {
            let config = CursorConfig {
                style,
                ..Default::default()
            };
            let mut cursor = CursorAnimator::new(config);
            assert!(cursor.get_char().is_some());
        }
    }

    #[test]
    fn test_cursor_blinking() {
        let config = CursorConfig {
            blink: true,
            blink_interval_ms: 100,
            ..Default::default()
        };
        let mut cursor = CursorAnimator::new(config);

        assert!(cursor.is_visible());

        // Fast forward time simulation
        thread::sleep(Duration::from_millis(150));
        cursor.update();

        // State should have potentially changed
        let _ = cursor.is_visible();
    }

    #[test]
    fn test_cursor_animation() {
        let config = CursorConfig {
            style: CursorStyle::Spinner,
            speed_ms: 100,
            blink: false,
            ..Default::default()
        };
        let mut cursor = CursorAnimator::new(config);

        let initial_char = cursor.get_char();

        // Fast forward
        thread::sleep(Duration::from_millis(150));
        cursor.update();

        let updated_char = cursor.get_char();

        // Both should be valid characters
        assert!(initial_char.is_some());
        assert!(updated_char.is_some());
    }

    #[test]
    fn test_cursor_streaming_state() {
        let config = CursorConfig {
            show_during_stream: false,
            ..Default::default()
        };
        let mut cursor = CursorAnimator::new(config);

        assert!(cursor.is_visible());

        cursor.set_streaming(true);
        cursor.update();

        assert!(!cursor.is_visible());

        cursor.set_streaming(false);
        cursor.update();

        assert!(cursor.is_visible());
    }

    #[test]
    fn test_cursor_idle_timeout() {
        let config = CursorConfig {
            hide_when_idle: true,
            idle_timeout_seconds: 0, // Immediate timeout for testing
            ..Default::default()
        };
        let mut cursor = CursorAnimator::new(config);

        assert!(cursor.is_visible());

        thread::sleep(Duration::from_millis(10));
        cursor.update();

        // Should be hidden due to timeout
        assert!(!cursor.is_visible());

        cursor.mark_activity();
        cursor.update();

        // Should be visible again
        assert!(cursor.is_visible());
    }

    #[test]
    fn test_cursor_formatting() {
        let config = CursorConfig {
            style: CursorStyle::Pipe,
            color: Some(32), // Green
            blink: false,
            ..Default::default()
        };
        let mut cursor = CursorAnimator::new(config);

        let formatted = cursor.get_formatted();
        assert!(formatted.contains('\x1b')); // Contains ANSI escape
        assert!(formatted.contains("32")); // Contains color code
        assert!(formatted.contains("|")); // Contains cursor character
    }

    #[test]
    fn test_cursor_position() {
        let pos = CursorPosition::new(5, 10);
        assert_eq!(pos.row, 5);
        assert_eq!(pos.col, 10);

        let ansi = pos.to_ansi_escape();
        assert_eq!(ansi, "\x1b[6;11H"); // 1-based indexing in ANSI

        let offset_pos = pos.offset(-2, 5);
        assert_eq!(offset_pos.row, 3);
        assert_eq!(offset_pos.col, 15);
    }

    #[test]
    fn test_cursor_presets() {
        let presets = vec![
            CursorPresets::simple_blink(),
            CursorPresets::spinner(),
            CursorPresets::solid_block(),
            CursorPresets::minimal(),
            CursorPresets::colorful(),
        ];

        for preset in presets {
            let mut cursor = CursorAnimator::new(preset);
            assert!(cursor.get_char().is_some());
        }
    }

    #[test]
    fn test_cursor_config_updates() {
        let mut cursor = CursorAnimator::new(CursorConfig::default());

        cursor.set_style(CursorStyle::Block);
        assert_eq!(cursor.get_config().style, CursorStyle::Block);

        cursor.set_speed(200);
        assert_eq!(cursor.get_config().speed_ms, 200);

        cursor.set_blink(false, Some(300));
        assert!(!cursor.get_config().blink);
        assert_eq!(cursor.get_config().blink_interval_ms, 300);

        cursor.set_color(Some(31));
        assert_eq!(cursor.get_config().color, Some(31));
    }

    #[test]
    fn test_cursor_show_hide() {
        let mut cursor = CursorAnimator::new(CursorConfig::default());

        assert!(cursor.is_visible());

        cursor.hide();
        assert!(!cursor.is_visible());

        cursor.show();
        assert!(cursor.is_visible());
    }

    #[test]
    fn test_cursor_reset() {
        let mut cursor = CursorAnimator::new(CursorConfig::default());

        cursor.hide();
        cursor.set_streaming(true);

        cursor.reset();

        assert!(cursor.is_visible());
        assert!(!cursor.is_streaming);
    }
}
