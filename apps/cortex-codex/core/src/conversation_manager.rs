use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use crate::AuthManager;
use crate::CodexAuth;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::codex::Codex;
use crate::codex::CodexSpawnOk;
use crate::codex::INITIAL_SUBMIT_ID;
use crate::codex_conversation::CodexConversation;
use crate::config::Config;
use crate::error::CodexErr;
use crate::error::Result as CodexResult;
use crate::protocol::Event;
use crate::protocol::EventMsg;
use crate::protocol::SessionConfiguredEvent;
use crate::rollout::RolloutRecorder;
use crate::environment_context::ENVIRONMENT_CONTEXT_START;
// client_common does not export its tag constants; use the prefix literal here.
const USER_INSTRUCTIONS_TAG_PREFIX: &str = "<user_instructions>";
use tracing::info;
use codex_protocol::models::ResponseItem;

#[derive(Debug, Clone, PartialEq)]
pub enum InitialHistory {
    New,
    Resumed(Vec<ResponseItem>),
}

/// Represents a newly created Codex conversation, including the first event
/// (which is [`EventMsg::SessionConfigured`]).
pub struct NewConversation {
    pub conversation_id: Uuid,
    pub conversation: Arc<CodexConversation>,
    pub session_configured: SessionConfiguredEvent,
}

/// [`ConversationManager`] is responsible for creating conversations and
/// maintaining them in memory.
pub struct ConversationManager {
    conversations: Arc<RwLock<HashMap<Uuid, Arc<CodexConversation>>>>,
    auth_manager: Arc<AuthManager>,
}

impl ConversationManager {
    pub fn new(auth_manager: Arc<AuthManager>) -> Self {
        Self {
            conversations: Arc::new(RwLock::new(HashMap::new())),
            auth_manager,
        }
    }

    /// Construct with a dummy AuthManager containing the provided CodexAuth.
    /// Used for integration tests: should not be used by ordinary business logic.
    pub fn with_auth(auth: CodexAuth) -> Self {
        Self::new(crate::AuthManager::from_auth_for_testing(auth))
    }

    pub async fn new_conversation(&self, config: Config) -> CodexResult<NewConversation> {
        self.spawn_conversation(config, self.auth_manager.clone())
            .await
    }

    async fn spawn_conversation(
        &self,
        config: Config,
        auth_manager: Arc<AuthManager>,
    ) -> CodexResult<NewConversation> {
        // TO BE REFACTORED: use the config experimental_resume field until we have a mainstream way.
        if let Some(resume_path) = config.experimental_resume.as_ref() {
            let initial_history = RolloutRecorder::get_rollout_history(resume_path).await?;
            let CodexSpawnOk {
                codex,
                session_id: conversation_id,
            } = Codex::spawn(config, auth_manager, initial_history).await?;
            self.finalize_spawn(codex, conversation_id).await
        } else {
            let CodexSpawnOk {
                codex,
                session_id: conversation_id,
            } = { Codex::spawn(config, auth_manager, InitialHistory::New).await? };
            self.finalize_spawn(codex, conversation_id).await
        }
    }

    async fn finalize_spawn(
        &self,
        codex: Codex,
        conversation_id: Uuid,
    ) -> CodexResult<NewConversation> {
        // The first event must be `SessionInitialized`. Validate and forward it
        // to the caller so that they can display it in the conversation
        // history.
        let event = codex.next_event().await?;
        let session_configured = match event {
            Event {
                id,
                msg: EventMsg::SessionConfigured(session_configured),
            } if id == INITIAL_SUBMIT_ID => session_configured,
            _ => {
                return Err(CodexErr::SessionConfiguredNotFirstEvent);
            }
        };

        let conversation = Arc::new(CodexConversation::new(codex));
        self.conversations
            .write()
            .await
            .insert(conversation_id, conversation.clone());

        Ok(NewConversation {
            conversation_id,
            conversation,
            session_configured,
        })
    }

    pub async fn get_conversation(
        &self,
        conversation_id: Uuid,
    ) -> CodexResult<Arc<CodexConversation>> {
        let conversations = self.conversations.read().await;
        conversations
            .get(&conversation_id)
            .cloned()
            .ok_or_else(|| CodexErr::ConversationNotFound(conversation_id))
    }

    pub async fn resume_conversation_from_rollout(
        &self,
        config: Config,
        rollout_path: PathBuf,
        auth_manager: Arc<AuthManager>,
    ) -> CodexResult<NewConversation> {
        let initial_history = RolloutRecorder::get_rollout_history(&rollout_path).await?;
        let CodexSpawnOk {
            codex,
            session_id: conversation_id,
        } = Codex::spawn(config, auth_manager, initial_history).await?;
        self.finalize_spawn(codex, conversation_id).await
    }

    pub async fn remove_conversation(&self, conversation_id: Uuid) {
        self.conversations.write().await.remove(&conversation_id);
    }

    /// Fork an existing conversation by dropping the last `drop_last_messages`
    /// user/assistant messages from its transcript and starting a new
    /// conversation with identical configuration (unless overridden by the
    /// caller's `config`). The new conversation will have a fresh id.
    pub async fn fork_conversation(
        &self,
        conversation_history: Vec<ResponseItem>,
        num_messages_to_drop: usize,
        config: Config,
    ) -> CodexResult<NewConversation> {
        // Compute the prefix up to the cut point.
        let original_len = conversation_history.len();
        let history =
            truncate_after_dropping_last_messages(conversation_history, num_messages_to_drop);
        match &history {
            InitialHistory::New => {
                info!(original_len, drop = num_messages_to_drop, "fork: no prefix remains; starting new");
            }
            InitialHistory::Resumed(items) => {
                info!(original_len, kept_len = items.len(), drop = num_messages_to_drop, "fork: resuming with prefix");
            }
        }

        // Spawn a new conversation with the computed initial history.
        let auth_manager = self.auth_manager.clone();
        let CodexSpawnOk {
            codex,
            session_id: conversation_id,
        } = Codex::spawn(config, auth_manager, history).await?;

        self.finalize_spawn(codex, conversation_id).await
    }
}

/// Return a prefix of `items` obtained by dropping the last `n` user messages
/// and all items that follow them.
fn truncate_after_dropping_last_messages(items: Vec<ResponseItem>, n: usize) -> InitialHistory {
    if n == 0 {
        return InitialHistory::Resumed(items);
    }

    // Walk backwards counting only `user` Message items, find cut index.
    let mut count = 0usize;
    let mut cut_index = 0usize;
    // Use explicit indices so `cut_index` is in the original (forward) order.
    for i in (0..items.len()).rev() {
        if let ResponseItem::Message { role, content, .. } = &items[i]
            && role == "user"
        {
            // Skip special bootstrap/system-like "user" messages that we do not
            // want to count as user inputs (instructions, environment context).
            let is_instructions_or_env = content.iter().any(|c| match c {
                codex_protocol::models::ContentItem::InputText { text }
                | codex_protocol::models::ContentItem::OutputText { text } => {
                    text.starts_with(ENVIRONMENT_CONTEXT_START)
                        || text.starts_with(USER_INSTRUCTIONS_TAG_PREFIX)
                }
                _ => false,
            });
            if !is_instructions_or_env {
                count += 1;
                if count == n {
                    // Cut everything from this user message to the end.
                    cut_index = i;
                    break;
                }
            }
        }
    }
    if cut_index == 0 {
        // No prefix remains after dropping; start a new conversation.
        InitialHistory::New
    } else {
    InitialHistory::Resumed(items.into_iter().take(cut_index).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use codex_protocol::models::ContentItem;
    use codex_protocol::models::ReasoningItemReasoningSummary;
    use codex_protocol::models::ResponseItem;
    use crate::environment_context::EnvironmentContext;

    fn user_msg(text: &str) -> ResponseItem {
        ResponseItem::Message {
            id: None,
            role: "user".to_string(),
            content: vec![ContentItem::OutputText {
                text: text.to_string(),
            }],
        }
    }
    fn assistant_msg(text: &str) -> ResponseItem {
        ResponseItem::Message {
            id: None,
            role: "assistant".to_string(),
            content: vec![ContentItem::OutputText {
                text: text.to_string(),
            }],
        }
    }

    #[test]
    fn drops_from_last_user_only() {
        let items = vec![
            user_msg("u1"),
            assistant_msg("a1"),
            assistant_msg("a2"),
            user_msg("u2"),
            assistant_msg("a3"),
            ResponseItem::Reasoning {
                id: "r1".to_string(),
                summary: vec![ReasoningItemReasoningSummary::SummaryText {
                    text: "s".to_string(),
                }],
                content: None,
                encrypted_content: None,
            },
            ResponseItem::FunctionCall {
                id: None,
                name: "tool".to_string(),
                arguments: "{}".to_string(),
                call_id: "c1".to_string(),
            },
            assistant_msg("a4"),
        ];

        let truncated = truncate_after_dropping_last_messages(items.clone(), 1);
        assert_eq!(
            truncated,
            InitialHistory::Resumed(vec![items[0].clone(), items[1].clone(), items[2].clone(),])
        );

        let truncated2 = truncate_after_dropping_last_messages(items, 2);
        assert_eq!(truncated2, InitialHistory::New);
    }

    #[test]
    fn truncation_skips_instructions_and_env() {
        // Build a transcript like the integration test's expectation:
        // [0] user_instructions, [1] environment_context, [2] first, [3] second, [4] third
        // Manually build a user instructions message, matching core::client_common formatting.
        let instructions = ResponseItem::Message {
            id: None,
            role: "user".to_string(),
            content: vec![ContentItem::InputText {
                text: format!(
                    "{}{}{}",
                    "<user_instructions>\n\n",
                    "be helpful",
                    "\n\n</user_instructions>"
                ),
            }],
        };
        let env = ResponseItem::from(EnvironmentContext::new(None, None, None, None));
        let first = user_msg("first");
        let second = user_msg("second");
        let third = user_msg("third");
        let items = vec![
            instructions.clone(),
            env.clone(),
            first.clone(),
            second.clone(),
            third.clone(),
        ];

        // Drop the last 1 user message → expect [instructions, env, first, second]
        let truncated = truncate_after_dropping_last_messages(items.clone(), 1);
        assert_eq!(
            truncated,
            InitialHistory::Resumed(vec![instructions, env, first, second])
        );
    }
}
