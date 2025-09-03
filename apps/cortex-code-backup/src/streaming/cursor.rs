//! Cursor animation for streaming visual feedback

use std::time::{Duration, Instant};

/// Animated cursor for streaming feedback
#[derive(Debug, Clone)]
pub struct CursorAnimator {
    /// Whether cursor is currently visible
    visible: bool,
    /// Blink interval
    blink_interval: Duration,
    /// Last blink time
    last_blink: Instant,
    /// Whether animation is running
    running: bool,
    /// Cursor style
    style: CursorStyle,
}

/// Different cursor styles for streaming
#[derive(Debug, Clone, PartialEq)]
pub enum CursorStyle {
    /// Blinking block cursor: █
    Block,
    /// Blinking line cursor: |
    Line,
    /// Blinking underscore: _
    Underscore,
    /// Spinning dots: ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
    Spinner,
    /// Typing dots: ...
    Dots,
}

impl Default for CursorStyle {
    fn default() -> Self {
        CursorStyle::Block
    }
}

impl CursorAnimator {
    /// Create a new cursor animator
    pub fn new(blink_interval_ms: u64) -> Self {
        Self {
            visible: true,
            blink_interval: Duration::from_millis(blink_interval_ms),
            last_blink: Instant::now(),
            running: false,
            style: CursorStyle::default(),
        }
    }

    /// Start cursor animation
    pub fn start(&mut self) {
        self.running = true;
        self.visible = true;
        self.last_blink = Instant::now();
    }

    /// Stop cursor animation
    pub fn stop(&mut self) {
        self.running = false;
        self.visible = false;
    }

    /// Pause cursor animation
    pub fn pause(&mut self) {
        self.running = false;
    }

    /// Resume cursor animation
    pub fn resume(&mut self) {
        self.running = true;
        self.last_blink = Instant::now();
    }

    /// Update cursor state (call regularly for animation)
    pub fn update(&mut self) {
        if !self.running {
            return;
        }

        if self.last_blink.elapsed() >= self.blink_interval {
            self.visible = !self.visible;
            self.last_blink = Instant::now();
        }
    }

    /// Check if cursor should be visible
    pub fn is_visible(&self) -> bool {
        self.running && self.visible
    }

    /// Set cursor style
    pub fn set_style(&mut self, style: CursorStyle) {
        self.style = style;
    }

    /// Get current cursor character
    pub fn get_cursor_char(&self) -> char {
        if !self.is_visible() {
            return ' ';
        }

        match self.style {
            CursorStyle::Block => '█',
            CursorStyle::Line => '|',
            CursorStyle::Underscore => '_',
            CursorStyle::Spinner => self.get_spinner_char(),
            CursorStyle::Dots => '.',
        }
    }

    /// Get spinner character based on timing
    fn get_spinner_char(&self) -> char {
        let spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let elapsed_ms = self.last_blink.elapsed().as_millis();
        let index = (elapsed_ms / 100) % (spinner_chars.len() as u128);
        spinner_chars[index as usize]
    }

    /// Get dots pattern for typing indicator
    pub fn get_dots_pattern(&self) -> String {
        if !self.is_visible() {
            return "   ".to_string();
        }

        let elapsed_ms = self.last_blink.elapsed().as_millis();
        let phase = (elapsed_ms / 300) % 4;

        match phase {
            0 => ".  ".to_string(),
            1 => ".. ".to_string(),
            2 => "...".to_string(),
            _ => "   ".to_string(),
        }
    }

    /// Set custom blink interval
    pub fn set_blink_interval(&mut self, duration: Duration) {
        self.blink_interval = duration;
    }

    /// Force cursor to be visible (useful for special states)
    pub fn force_visible(&mut self) {
        self.visible = true;
    }

    /// Force cursor to be hidden
    pub fn force_hidden(&mut self) {
        self.visible = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_cursor_creation() {
        let cursor = CursorAnimator::new(500);
        assert!(!cursor.running);
        assert!(cursor.visible);
    }

    #[test]
    fn test_cursor_start_stop() {
        let mut cursor = CursorAnimator::new(500);

        cursor.start();
        assert!(cursor.running);
        assert!(cursor.is_visible());

        cursor.stop();
        assert!(!cursor.running);
        assert!(!cursor.is_visible());
    }

    #[test]
    fn test_cursor_styles() {
        let mut cursor = CursorAnimator::new(500);
        cursor.start();

        cursor.set_style(CursorStyle::Block);
        assert_eq!(cursor.get_cursor_char(), '█');

        cursor.set_style(CursorStyle::Line);
        assert_eq!(cursor.get_cursor_char(), '|');

        cursor.set_style(CursorStyle::Underscore);
        assert_eq!(cursor.get_cursor_char(), '_');
    }

    #[test]
    fn test_dots_pattern() {
        let mut cursor = CursorAnimator::new(300);
        cursor.start();
        cursor.set_style(CursorStyle::Dots);

        let pattern = cursor.get_dots_pattern();
        assert!(!pattern.is_empty());
        assert_eq!(pattern.len(), 3);
    }

    #[test]
    fn test_cursor_blinking() {
        let mut cursor = CursorAnimator::new(100);
        cursor.start();

        let initial_visibility = cursor.is_visible();

        // Wait for blink interval
        thread::sleep(Duration::from_millis(150));
        cursor.update();

        // Visibility should have changed
        assert_ne!(initial_visibility, cursor.is_visible());
    }
}
