Feature: Cortex-OS Chat UI MVP
  As a user I want to chat with agents, select models, view tool-calls, and restore sessions.

  Background:
    Given the chat UI is enabled

  @streaming
  Scenario: Streamed response for a message
    Given I have an empty session
    When I send the message "Hello"
    Then I see a streaming response
    And the stream completes without error

  @resume
  Scenario: Resume after network loss
    Given I have an active streamed response
    When the network connection drops and reconnects
    Then the session restores and shows the last assistant state safely

  @models
  Scenario: Select an available model
    Given a list of allowed models is available
    When I choose the model "default"
    Then subsequent messages use that model

  @models
  Scenario: Fallback on unavailable model
    Given a list of allowed models is available
    When I choose the model "unavailable-model"
    Then the UI falls back to the default model and notifies me

  @history
  Scenario: Restore a saved session via URL
    Given a saved session with id "sess-123"
    When I open "/chat/sess-123"
    Then I see the previous messages and selected model

  @tools
  Scenario: Visualize tool call events
    Given a tool-capable agent
    When a tool call is invoked during a response
    Then I see the tool name, redacted args, and status in the tool panel

  @a11y
  Scenario: Keyboard navigation order
    Given I navigate the UI using keyboard only
    Then focus order is logical and visible

  @a11y
  Scenario: Screen-reader announcements for streaming
    Given a screen reader is active
    When a response is streaming
    Then live-region announcements occur without overwhelming the user
