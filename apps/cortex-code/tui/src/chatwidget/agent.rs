use std::sync::Arc;

use codex_core::CodexConversation;
use codex_core::ConversationManager;
use codex_core::NewConversation;
use codex_core::config::Config;
use tokio::sync::mpsc::UnboundedSender;
use tokio::sync::mpsc::unbounded_channel;

use crate::app_event::AppEvent;
use crate::app_event_sender::AppEventSender;
use codex_core::protocol::Event;
use codex_core::protocol::EventMsg;
use codex_core::protocol::InputItem;
use codex_core::protocol::Op;
use codex_core::protocol::SessionConfiguredEvent;
use codex_core::protocol::TaskCompleteEvent;
use codex_core::protocol::TaskStartedEvent;
use uuid::Uuid;
use futures_util::StreamExt;

/// Overlay agent: routes turns via overlay providers (anthropic/zai) instead of ConversationManager.
pub(crate) fn spawn_overlay_agent(
    config: Config,
    app_event_tx: AppEventSender,
) -> UnboundedSender<Op> {
    let (codex_op_tx, mut codex_op_rx) = unbounded_channel::<Op>();

    let app_event_tx_clone = app_event_tx.clone();
    tokio::spawn(async move {
        // Emit a minimal SessionConfigured to bootstrap the UI
        let session_event = SessionConfiguredEvent {
            session_id: Uuid::new_v4(),
            model: config.model.clone(),
            history_log_id: 0,
            history_entry_count: 0,
        };
        app_event_tx_clone.send(AppEvent::CodexEvent(Event {
            id: "".into(),
            msg: EventMsg::SessionConfigured(session_event),
        }));

        // Main op loop: for each user input, stream via overlay provider
        while let Some(op) = codex_op_rx.recv().await {
            match op {
                Op::UserInput { items } => {
                    // Extract text parts only for now
                    let mut text = String::new();
                    for it in items {
                        if let InputItem::Text { text: t } = it { 
                            if !text.is_empty() { text.push('\n'); }
                            text.push_str(&t);
                        }
                    }
                    // Start task
                    app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                        id: "".into(),
                        msg: EventMsg::TaskStarted(TaskStartedEvent { model_context_window: config.model_context_window }),
                    }));

                    // Select provider
                    let provider_id = config.model_provider_id.clone();
                    let provider: Box<dyn codex_core::providers::ModelProvider> = if provider_id == "anthropic" {
                        Box::new(codex_providers_ext::providers::anthropic::AnthropicProvider::new())
                    } else {
                        Box::new(codex_providers_ext::providers::zai::ZaiProvider::new())
                    };
                    let req = codex_core::providers::CompletionRequest::new(
                        vec![codex_core::providers::Message { role: "user".into(), content: text.clone() }],
                        &config.model,
                    );
                    match provider.complete_streaming(&req).await {
                        Ok(mut stream) => {
                            let mut full = String::new();
                            while let Some(evt) = stream.next().await {
                                match evt {
                                    Ok(codex_core::providers::StreamEvent::Token { text: delta, .. }) => {
                                        full.push_str(&delta);
                                        app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                            id: "".into(),
                                            msg: EventMsg::AgentMessageDelta(
                                                codex_core::protocol::AgentMessageDeltaEvent { delta }
                                            ),
                                        }));
                                    }
                                    Ok(codex_core::providers::StreamEvent::Finished { .. }) => {
                                        // Emit final message and task complete
                                        app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                            id: "".into(),
                                            msg: EventMsg::AgentMessage(
                                                codex_core::protocol::AgentMessageEvent { message: full.clone() }
                                            ),
                                        }));
                                        app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                            id: "".into(),
                                            msg: EventMsg::TaskComplete(TaskCompleteEvent { last_agent_message: Some(full.clone()) }),
                                        }));
                                    }
                                    Ok(_) => {}
                                    Err(e) => {
                                        app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                            id: "".into(),
                                            msg: EventMsg::Error(codex_core::protocol::ErrorEvent { message: format!("overlay error: {e}") }),
                                        }));
                                        break;
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                id: "".into(),
                                msg: EventMsg::Error(codex_core::protocol::ErrorEvent { message: format!("overlay start error: {e}") }),
                            }));
                        }
                    }
                }
                // Ignore for now or log
                _ => {}
            }
        }
    });

    codex_op_tx
}

/// Spawn the agent bootstrapper and op forwarding loop, returning the
/// `UnboundedSender<Op>` used by the UI to submit operations.
pub(crate) fn spawn_agent(
    config: Config,
    app_event_tx: AppEventSender,
    server: Arc<ConversationManager>,
) -> UnboundedSender<Op> {
    let (codex_op_tx, mut codex_op_rx) = unbounded_channel::<Op>();

    let app_event_tx_clone = app_event_tx.clone();
    tokio::spawn(async move {
        let NewConversation {
            conversation_id: _,
            conversation,
            session_configured,
        } = match server.new_conversation(config).await {
            Ok(v) => v,
            Err(e) => {
                // TODO: surface this error to the user.
                tracing::error!("failed to initialize codex: {e}");
                return;
            }
        };

        // Forward the captured `SessionConfigured` event so it can be rendered in the UI.
        let ev = codex_core::protocol::Event {
            // The `id` does not matter for rendering, so we can use a fake value.
            id: "".to_string(),
            msg: codex_core::protocol::EventMsg::SessionConfigured(session_configured),
        };
        app_event_tx_clone.send(AppEvent::CodexEvent(ev));

        let conversation_clone = conversation.clone();
        tokio::spawn(async move {
            while let Some(op) = codex_op_rx.recv().await {
                let id = conversation_clone.submit(op).await;
                if let Err(e) = id {
                    tracing::error!("failed to submit op: {e}");
                }
            }
        });

        while let Ok(event) = conversation.next_event().await {
            app_event_tx_clone.send(AppEvent::CodexEvent(event));
        }
    });

    codex_op_tx
}

/// Spawn agent loops for an existing conversation (e.g., a forked conversation).
/// Sends the provided `SessionConfiguredEvent` immediately, then forwards subsequent
/// events and accepts Ops for submission.
pub(crate) fn spawn_agent_from_existing(
    conversation: std::sync::Arc<CodexConversation>,
    session_configured: codex_core::protocol::SessionConfiguredEvent,
    app_event_tx: AppEventSender,
) -> UnboundedSender<Op> {
    let (codex_op_tx, mut codex_op_rx) = unbounded_channel::<Op>();

    let app_event_tx_clone = app_event_tx.clone();
    tokio::spawn(async move {
        // Forward the captured `SessionConfigured` event so it can be rendered in the UI.
        let ev = codex_core::protocol::Event {
            id: "".to_string(),
            msg: codex_core::protocol::EventMsg::SessionConfigured(session_configured),
        };
        app_event_tx_clone.send(AppEvent::CodexEvent(ev));

        let conversation_clone = conversation.clone();
        tokio::spawn(async move {
            while let Some(op) = codex_op_rx.recv().await {
                let id = conversation_clone.submit(op).await;
                if let Err(e) = id {
                    tracing::error!("failed to submit op: {e}");
                }
            }
        });

        while let Ok(event) = conversation.next_event().await {
            app_event_tx_clone.send(AppEvent::CodexEvent(event));
        }
    });

    codex_op_tx
}
