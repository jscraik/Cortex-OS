use crate::cortex::Cortex;
use crate::error::Result as CortexResult;
use crate::protocol::Event;
use crate::protocol::Op;
use crate::protocol::Submission;

pub struct CortexConversation {
    cortex: Cortex,
}

/// Conduit for the bidirectional stream of messages that compose a conversation
/// in Cortex.
impl CortexConversation {
    pub(crate) fn new(cortex: Cortex) -> Self {
        Self { cortex }
    }

    pub async fn submit(&self, op: Op) -> CortexResult<String> {
        self.cortex.submit(op).await
    }

    /// Use sparingly: this is intended to be removed soon.
    pub async fn submit_with_id(&self, sub: Submission) -> CortexResult<()> {
        self.cortex.submit_with_id(sub).await
    }

    pub async fn next_event(&self) -> CortexResult<Event> {
        self.cortex.next_event().await
    }
}
