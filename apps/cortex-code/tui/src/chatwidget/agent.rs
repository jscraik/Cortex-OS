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
                            let mut tool_results: Vec<(String, String)> = Vec::new();
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
                                    Ok(codex_core::providers::StreamEvent::System(s)) => {
                                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                                            if let Some(tu) = v.get("tool_use") {
                                                let name = tu.get("name").and_then(|n| n.as_str()).unwrap_or("tool");
                                                let input = tu.get("input").cloned().unwrap_or(serde_json::json!({}));
                                                let result = run_overlay_tool_for_tui(name, input);
                                                let id = tu.get("id").and_then(|n| n.as_str()).unwrap_or("").to_string();
                                                tool_results.push((id, result.clone()));
                                                app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                                    id: "".into(),
                                                    msg: EventMsg::AgentMessageDelta(
                                                        codex_core::protocol::AgentMessageDeltaEvent { delta: format!("\n[tool_result] {} {}", name, result) }
                                                    ),
                                                }));
                                                continue;
                                            }
                                        }
                                        app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                            id: "".into(),
                                            msg: EventMsg::BackgroundEvent(codex_core::protocol::BackgroundEventEvent { message: s })
                                        }));
                                    }
                                    Ok(codex_core::providers::StreamEvent::Finished { .. }) => {
                                        // Optional round-trip (Z.ai/Anthropic) with tool_result blocks
                                        if overlay_roundtrip_enabled() && !tool_results.is_empty() {
                                            if let Ok(cont) = overlay_followup_with_tool_results(&provider_id, &config.model, &full, &tool_results).await {
                                                app_event_tx_clone.send(AppEvent::CodexEvent(Event {
                                                    id: "".into(),
                                                    msg: EventMsg::AgentMessage(
                                                        codex_core::protocol::AgentMessageEvent { message: cont.clone() }
                                                    ),
                                                }));
                                                full.push_str("\n");
                                                full.push_str(&cont);
                                            }
                                        }
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

// Minimal tool runner for TUI overlay; mirrors CLI helper behavior
pub(super) fn run_overlay_tool_for_tui(name: &str, input: serde_json::Value) -> String {
    match name {
        "echo" => input.get("text").and_then(|v| v.as_str()).unwrap_or(&input.to_string()).to_string(),
        "time" => chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        _ => format!("unsupported tool: {} input={}", name, input),
    }
}

fn overlay_roundtrip_enabled() -> bool {
    match std::env::var("CODEX_OVERLAY_ROUNDTRIP") {
        Ok(v) => matches!(v.as_str(), "1" | "true" | "TRUE" | "yes" | "YES"),
        Err(_) => false,
    }
}

async fn overlay_followup_with_tool_results(
    provider_id: &str,
    model: &str,
    previous: &str,
    results: &[(String, String)],
) -> anyhow::Result<String> {
    use reqwest::Client;
    // Build content blocks
    let mut content = vec![serde_json::json!({"type":"text","text": previous})];
    for (id, res) in results.iter() {
        content.push(serde_json::json!({"type":"tool_result","tool_use_id": id, "content": res }));
    }
    let body = serde_json::json!({
        "model": model,
        "messages": [ {"role":"user", "content": content } ],
        "max_tokens": 512
    });
    let client = Client::new();

    if provider_id == "zai" {
        let base = std::env::var("ZAI_BASE_URL").ok().filter(|v| !v.trim().is_empty()).unwrap_or_else(|| "https://api.z.ai/api/anthropic".to_string());
        let version = std::env::var("ZAI_ANTHROPIC_VERSION").ok().filter(|v| !v.trim().is_empty()).unwrap_or_else(|| "2023-06-01".to_string());
        let key = std::env::var("ZAI_API_KEY").map_err(|_| anyhow::anyhow!("ZAI_API_KEY required"))?;
        let url = format!("{}/v1/messages", base.trim_end_matches('/'));
        let resp = client.post(&url)
            .header("x-api-key", key)
            .header("anthropic-version", version)
            .json(&body)
            .send()
            .await?;
        if !resp.status().is_success() { return Err(anyhow::anyhow!("follow-up status {}", resp.status())); }
        let v: serde_json::Value = resp.json().await?;
        if let Some(arr) = v.get("content").and_then(|c| c.as_array()) {
            let mut text = String::new();
            for b in arr { if let Some(t) = b.get("text").and_then(|t| t.as_str()) { text.push_str(t); } }
            if !text.is_empty() { return Ok(text); }
        }
        return Ok(v.to_string());
    } else {
        // Anthropic
        let base = std::env::var("ANTHROPIC_BASE_URL").ok().filter(|v| !v.trim().is_empty()).unwrap_or_else(|| "https://api.anthropic.com".to_string());
        let key = std::env::var("ANTHROPIC_API_KEY").map_err(|_| anyhow::anyhow!("ANTHROPIC_API_KEY required"))?;
        let url = format!("{}/v1/messages", base.trim_end_matches('/'));
        let resp = client.post(&url)
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await?;
        if !resp.status().is_success() { return Err(anyhow::anyhow!("follow-up status {}", resp.status())); }
        let v: serde_json::Value = resp.json().await?;
        if let Some(arr) = v.get("content").and_then(|c| c.as_array()) {
            let mut text = String::new();
            for b in arr { if let Some(t) = b.get("text").and_then(|t| t.as_str()) { text.push_str(t); } }
            if !text.is_empty() { return Ok(text); }
        }
        return Ok(v.to_string());
    }
}
