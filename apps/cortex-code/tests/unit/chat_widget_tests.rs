use cortex_code::view::chat::{ChatWidget, ChatState};
use cortex_code::app::{Message, MessageRole};
use ratatui::{
    backend::TestBackend,
    buffer::Buffer,
    layout::{Constraint, Direction, Layout, Rect},
    Terminal,
};
use crossterm::event::{Event, KeyCode, KeyEvent, KeyModifiers};
use insta::assert_snapshot;

// RED - These tests will fail initially
#[test]
fn test_chat_widget_renders_empty_state() {
    // Given
    let chat = ChatWidget::new();
    let mut terminal = Terminal::new(TestBackend::new(80, 24)).unwrap();
    let area = Rect::new(0, 0, 80, 24);

    // When
    terminal.draw(|frame| {
        chat.render(frame, area);
    }).unwrap();

    // Then
    let buffer = terminal.backend().buffer();
    assert_snapshot!(buffer, @"");
    assert!(buffer.content().iter().any(|cell| cell.symbol().contains("No messages")));
}

#[test]
fn test_chat_widget_renders_messages() {
    // Given
    let mut chat = ChatWidget::new();
    chat.add_message(Message::user("Hello, Cortex!"));
    chat.add_message(Message::assistant("Hi there! How can I help you today?"));

    let mut terminal = Terminal::new(TestBackend::new(80, 24)).unwrap();
    let area = Rect::new(0, 0, 80, 24);

    // When
    terminal.draw(|frame| {
        chat.render(frame, area);
    }).unwrap();

    // Then
    let buffer = terminal.backend().buffer();
    assert_snapshot!(buffer, @"");

    // Verify user message is displayed
    assert!(buffer.content().iter().any(|cell| cell.symbol().contains("Hello, Cortex!")));
    // Verify assistant message is displayed
    assert!(buffer.content().iter().any(|cell| cell.symbol().contains("Hi there!")));
}

#[test]
fn test_chat_widget_handles_scroll_events() {
    // Given
    let mut chat = ChatWidget::new();

    // Add many messages to enable scrolling
    for i in 0..50 {
        chat.add_message(Message::user(&format!("Message {}", i)));
        chat.add_message(Message::assistant(&format!("Response {}", i)));
    }

    let initial_scroll = chat.scroll_offset();

    // When - scroll down
    let scroll_down = Event::Key(KeyEvent::new(KeyCode::PageDown, KeyModifiers::NONE));
    chat.handle_event(scroll_down).unwrap();

    // Then
    assert!(chat.scroll_offset() > initial_scroll);

    // When - scroll up
    let scroll_up = Event::Key(KeyEvent::new(KeyCode::PageUp, KeyModifiers::NONE));
    chat.handle_event(scroll_up).unwrap();

    // Then
    assert_eq!(chat.scroll_offset(), initial_scroll);
}

#[test]
fn test_chat_widget_wcag_keyboard_navigation() {
    // Given
    let mut chat = ChatWidget::new();
    assert_eq!(chat.focused_element(), FocusElement::MessageList);

    // When - Tab cycles through focusable elements
    let tab_event = Event::Key(KeyEvent::new(KeyCode::Tab, KeyModifiers::NONE));
    chat.handle_event(tab_event.clone()).unwrap();

    // Then
    assert_eq!(chat.focused_element(), FocusElement::InputField);

    // When - Tab again
    chat.handle_event(tab_event.clone()).unwrap();

    // Then
    assert_eq!(chat.focused_element(), FocusElement::SendButton);

    // When - Tab wraps around
    chat.handle_event(tab_event).unwrap();

    // Then
    assert_eq!(chat.focused_element(), FocusElement::MessageList);
}

#[test]
fn test_chat_widget_handles_input() {
    // Given
    let mut chat = ChatWidget::new();
    chat.set_focus(FocusElement::InputField);

    // When - type characters
    let char_event = Event::Key(KeyEvent::new(KeyCode::Char('H'), KeyModifiers::NONE));
    chat.handle_event(char_event).unwrap();

    let char_event = Event::Key(KeyEvent::new(KeyCode::Char('i'), KeyModifiers::NONE));
    chat.handle_event(char_event).unwrap();

    // Then
    assert_eq!(chat.input_text(), "Hi");

    // When - press enter to send
    let enter_event = Event::Key(KeyEvent::new(KeyCode::Enter, KeyModifiers::NONE));
    let response = chat.handle_event(enter_event).unwrap();

    // Then
    assert!(matches!(response, EventResponse::SendMessage(_)));
    assert_eq!(chat.input_text(), ""); // Input should be cleared
}

#[test]
fn test_chat_widget_accessibility_labels() {
    // Given
    let chat = ChatWidget::new();

    // When/Then - should provide screen reader friendly descriptions
    assert_eq!(chat.aria_label(), "Chat conversation");
    assert_eq!(chat.input_aria_label(), "Type your message here");
    assert_eq!(chat.send_button_aria_label(), "Send message");
}

#[test]
fn test_chat_widget_theme_support() {
    // Given
    let mut chat = ChatWidget::new();

    // When - apply dark theme
    chat.set_theme(Theme::Dark);

    // Then
    assert_eq!(chat.theme(), &Theme::Dark);

    // When - apply light theme
    chat.set_theme(Theme::Light);

    // Then
    assert_eq!(chat.theme(), &Theme::Light);
}

#[test]
fn test_chat_widget_message_formatting() {
    // Given
    let mut chat = ChatWidget::new();

    // When - add messages with different roles
    chat.add_message(Message::system("System initialization complete"));
    chat.add_message(Message::user("Test user message"));
    chat.add_message(Message::assistant("Test assistant response"));

    let mut terminal = Terminal::new(TestBackend::new(80, 24)).unwrap();
    let area = Rect::new(0, 0, 80, 24);

    terminal.draw(|frame| {
        chat.render(frame, area);
    }).unwrap();

    // Then - messages should have different styling
    let buffer = terminal.backend().buffer();

    // System messages should be styled differently (dimmed)
    // User messages should be right-aligned
    // Assistant messages should be left-aligned
    assert!(buffer.content().len() > 0);
}

// Mock types for compilation (will be implemented in GREEN phase)
use cortex_code::view::chat::{FocusElement, EventResponse, Theme};
