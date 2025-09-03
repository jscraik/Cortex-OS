use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use crate::AuthManager;
use crate::CortexAuth;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::cortex::Cortex;
use crate::cortex::CortexSpawnOk;
use crate::cortex::INITIAL_SUBMIT_ID;
use crate::cortex_conversation::CortexConversation;
use crate::config::Config;
use crate::error::CortexErr;
use crate::error::Result as CortexResult;
use crate::protocol::Event;
use crate::protocol::EventMsg;
use crate::protocol::SessionConfiguredEvent;
use crate::rollout::RolloutRecorder;
use cortex_protocol::models::ResponseItem;

#[derive(Debug, Clone, PartialEq)]
pub enum InitialHistory {
    New,
    Resumed(Vec<ResponseItem>),
}

/// Represents a newly created Cortex conversation, including the first event
/// (which is [`EventMsg::SessionConfigured`]).
pub struct NewConversation {
    pub conversation_id: Uuid,
    pub conversation: Arc<CortexConversation>,
    pub session_configured: SessionConfiguredEvent,
}

/// [`ConversationManager`] is responsible for creating conversations and
/// maintaining them in memory.
pub struct ConversationManager {
    conversations: Arc<RwLock<HashMap<Uuid, Arc<CortexConversation>>>>,
    auth_manager: Arc<AuthManager>,
}

impl ConversationManager {
    pub fn new(auth_manager: Arc<AuthManager>) -> Self {
        Self {
            conversations: Arc::new(RwLock::new(HashMap::new())),
            auth_manager,
        }
    }

    /// Construct with a dummy AuthManager containing the provided CortexAuth.
    /// Used for integration tests: should not be used by ordinary business logic.
    pub fn with_auth(auth: CortexAuth) -> Self {
        Self::new(crate::AuthManager::from_auth_for_testing(auth))
    }

    pub async fn new_conversation(&self, config: Config) -> CortexResult<NewConversation> {
        self.spawn_conversation(config, self.auth_manager.clone())
            .await
    }

    async fn spawn_conversation(
        &self,
        config: Config,
        auth_manager: Arc<AuthManager>,
    ) -> CortexResult<NewConversation> {
        // TO BE REFACTORED: use the config experimental_resume field until we have a mainstream way.
        if let Some(resume_path) = config.experimental_resume.as_ref() {
            let initial_history = RolloutRecorder::get_rollout_history(resume_path).await?;
            let CortexSpawnOk {
                cortex,
                session_id: conversation_id,
            } = Cortex::spawn(config, auth_manager, initial_history).await?;
            self.finalize_spawn(cortex, conversation_id).await
        } else {
            let CortexSpawnOk {
                cortex,
                session_id: conversation_id,
            } = { Cortex::spawn(config, auth_manager, InitialHistory::New).await? };
            self.finalize_spawn(cortex, conversation_id).await
        }
    }

    async fn finalize_spawn(
        &self,
        cortex: Cortex,
        conversation_id: Uuid,
    ) -> CortexResult<NewConversation> {
        // The first event must be `SessionInitialized`. Validate and forward it
        // to the caller so that they can display it in the conversation
        // history.
        let event = cortex.next_event().await?;
        let session_configured = match event {
            Event {
                id,
                msg: EventMsg::SessionConfigured(session_configured),
            } if id == INITIAL_SUBMIT_ID => session_configured,
            _ => {
                return Err(CortexErr::SessionConfiguredNotFirstEvent);
            }
        };

        let conversation = Arc::new(CortexConversation::new(cortex));
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
    ) -> CortexResult<Arc<CortexConversation>> {
        let conversations = self.conversations.read().await;
        conversations
            .get(&conversation_id)
            .cloned()
            .ok_or_else(|| CortexErr::ConversationNotFound(conversation_id))
    }

    pub async fn resume_conversation_from_rollout(
        &self,
        config: Config,
        rollout_path: PathBuf,
        auth_manager: Arc<AuthManager>,
    ) -> CortexResult<NewConversation> {
        let initial_history = RolloutRecorder::get_rollout_history(&rollout_path).await?;
        let CortexSpawnOk {
            cortex,
            session_id: conversation_id,
        } = Cortex::spawn(config, auth_manager, initial_history).await?;
        self.finalize_spawn(cortex, conversation_id).await
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
    ) -> CortexResult<NewConversation> {
        // Compute the prefix up to the cut point.
        let history =
            truncate_after_dropping_last_messages(conversation_history, num_messages_to_drop);

        // Spawn a new conversation with the computed initial history.
        let auth_manager = self.auth_manager.clone();
        let CortexSpawnOk {
            cortex,
            session_id: conversation_id,
        } = Cortex::spawn(config, auth_manager, history).await?;

        self.finalize_spawn(cortex, conversation_id).await
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
    for (idx, item) in items.iter().enumerate().rev() {
        if let ResponseItem::Message { role, .. } = item
            && role == "user"
        {
            count += 1;
            if count == n {
                // Cut everything from this user message to the end.
                cut_index = idx;
                break;
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
    use cortex_protocol::models::ContentItem;
    use cortex_protocol::models::ReasoningItemReasoningSummary;
    use cortex_protocol::models::ResponseItem;

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
}
