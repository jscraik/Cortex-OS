use anyhow::Result;
use tokio::sync::mpsc;
use crate::client_server::{Request, Response};

/// Client implementation for remote TUI access
/// Inspired by SST OpenCode client-server architecture
pub struct Client {
    sender: mpsc::UnboundedSender<Request>,
    receiver: mpsc::UnboundedReceiver<Response>,
}

impl Client {
    pub fn new() -> Self {
        let (tx, _rx) = mpsc::unbounded_channel::<Request>();
        let (_response_tx, response_rx) = mpsc::unbounded_channel::<Response>();
        Self {
            sender: tx,
            receiver: response_rx,
        }
    }

    pub async fn send_request(&self, request: Request) -> Result<()> {
        self.sender.send(request)?;
        Ok(())
    }

    pub async fn receive_response(&mut self) -> Option<Response> {
        self.receiver.recv().await
    }
}
