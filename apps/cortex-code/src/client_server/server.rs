use anyhow::Result;
use tokio::sync::mpsc;
use crate::client_server::{Request, Response};

/// Server implementation for handling remote clients
/// Inspired by SST OpenCode server architecture
pub struct Server {
    receiver: mpsc::UnboundedReceiver<Request>,
    sender: mpsc::UnboundedSender<Response>,
}

impl Server {
    pub fn new() -> Self {
        let (request_tx, request_rx) = mpsc::unbounded_channel::<Request>();
        let (response_tx, _response_rx) = mpsc::unbounded_channel::<Response>();
        Self {
            receiver: request_rx,
            sender: response_tx,
        }
    }

    pub async fn handle_requests(&mut self) -> Result<()> {
        while let Some(request) = self.receiver.recv().await {
            let response = self.process_request(request).await?;
            self.sender.send(response)?;
        }
        Ok(())
    }

    async fn process_request(&self, request: Request) -> Result<Response> {
        // TODO: Implement request processing
        Ok(Response::success(request.id, serde_json::json!({"status": "ok"})))
    }
}
