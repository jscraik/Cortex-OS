use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::SystemTime;

use mcp_types::{CallToolResult, ContentBlock, TextContent};
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct RecordedCall {
    pub tool: String,
    pub arguments: Value,
    pub timestamp: SystemTime,
}

type HandlerFuture = Pin<Box<dyn Future<Output = Result<CallToolResult, MockMcpError>> + Send>>;
type ToolHandler = Arc<dyn Fn(Value) -> HandlerFuture + Send + Sync>;

#[derive(Clone)]
pub struct MockMcpServer {
    handlers: Arc<Mutex<HashMap<String, ToolHandler>>>,
    calls: Arc<Mutex<Vec<RecordedCall>>>,
    closed: Arc<AtomicBool>,
    ping_count: Arc<AtomicUsize>,
}

impl MockMcpServer {
    pub fn new() -> Self {
        Self {
            handlers: Arc::new(Mutex::new(HashMap::new())),
            calls: Arc::new(Mutex::new(Vec::new())),
            closed: Arc::new(AtomicBool::new(false)),
            ping_count: Arc::new(AtomicUsize::new(0)),
        }
    }

    pub fn register_tool<F, Fut>(&self, name: impl Into<String>, handler: F)
    where
        F: Fn(Value) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<CallToolResult, MockMcpError>> + Send + 'static,
    {
        let tool_name = name.into();
        let wrapped: ToolHandler =
            Arc::new(move |value: Value| -> HandlerFuture { Box::pin(handler(value)) });
        let mut handlers = self.handlers.lock().expect("handler mutex poisoned");
        handlers.insert(tool_name, wrapped);
    }

    pub fn register_sync_tool<F>(&self, name: impl Into<String>, handler: F)
    where
        F: Fn(Value) -> Result<CallToolResult, MockMcpError> + Send + Sync + 'static,
    {
        let handler = Arc::new(handler);
        self.register_tool(name, move |value| {
            let handler = handler.clone();
            async move { handler(value) }
        });
    }

    pub async fn call_tool(
        &self,
        tool_name: &str,
        arguments: Value,
    ) -> Result<CallToolResult, MockMcpError> {
        if self.closed.load(Ordering::SeqCst) {
            return Err(MockMcpError::ServerClosed);
        }

        let handler = {
            let handlers = self.handlers.lock().expect("handler mutex poisoned");
            handlers.get(tool_name).cloned()
        };

        let Some(handler) = handler else {
            return Err(MockMcpError::ToolNotRegistered(tool_name.to_owned()));
        };

        let record = RecordedCall {
            tool: tool_name.to_owned(),
            arguments: arguments.clone(),
            timestamp: SystemTime::now(),
        };
        {
            let mut calls = self.calls.lock().expect("calls mutex poisoned");
            calls.push(record);
        }

        handler(arguments).await
    }

    pub async fn ping(&self) -> Result<(), MockMcpError> {
        if self.closed.load(Ordering::SeqCst) {
            return Err(MockMcpError::ServerClosed);
        }
        self.ping_count.fetch_add(1, Ordering::SeqCst);
        Ok(())
    }

    pub fn close(&self) {
        self.closed.store(true, Ordering::SeqCst);
    }

    pub fn reset(&self) {
        self.closed.store(false, Ordering::SeqCst);
        self.ping_count.store(0, Ordering::SeqCst);
        let mut calls = self.calls.lock().expect("calls mutex poisoned");
        calls.clear();
    }

    pub fn ping_count(&self) -> usize {
        self.ping_count.load(Ordering::SeqCst)
    }

    pub fn calls(&self) -> Vec<RecordedCall> {
        let calls = self.calls.lock().expect("calls mutex poisoned");
        calls.clone()
    }

    pub fn calls_for(&self, tool_name: &str) -> Vec<RecordedCall> {
        self.calls()
            .into_iter()
            .filter(|call| call.tool == tool_name)
            .collect()
    }
}

#[derive(Clone)]
pub struct TestMcpClient {
    server: MockMcpServer,
    closed: Arc<AtomicBool>,
}

impl TestMcpClient {
    pub fn new(server: MockMcpServer) -> Self {
        Self {
            server,
            closed: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn call_tool(
        &self,
        tool_name: &str,
        arguments: Value,
    ) -> Result<CallToolResult, MockMcpError> {
        if self.closed.load(Ordering::SeqCst) {
            return Err(MockMcpError::ClientClosed);
        }
        self.server.call_tool(tool_name, arguments).await
    }

    pub async fn ping(&self) -> Result<(), MockMcpError> {
        if self.closed.load(Ordering::SeqCst) {
            return Err(MockMcpError::ClientClosed);
        }
        self.server.ping().await
    }

    pub async fn close(&self) -> Result<(), MockMcpError> {
        if self.closed.swap(true, Ordering::SeqCst) {
            return Ok(());
        }
        Ok(())
    }
}

pub struct MockMcpFixture {
    pub server: MockMcpServer,
    pub client: TestMcpClient,
}

impl MockMcpFixture {
    pub fn new() -> Self {
        let server = MockMcpServer::new();
        let client = TestMcpClient::new(server.clone());
        Self { server, client }
    }

    pub async fn teardown(self) {
        let _ = self.client.close().await;
        self.server.close();
    }
}

pub fn setup_mock_server() -> MockMcpFixture {
    MockMcpFixture::new()
}

#[derive(Debug, Clone)]
pub enum MockMcpError {
    ToolNotRegistered(String),
    ToolFailed(String),
    ServerClosed,
    ClientClosed,
}

impl std::fmt::Display for MockMcpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ToolNotRegistered(tool) => write!(f, "tool '{tool}' is not registered"),
            Self::ToolFailed(msg) => write!(f, "tool execution failed: {msg}"),
            Self::ServerClosed => write!(f, "mock server is closed"),
            Self::ClientClosed => write!(f, "test client is closed"),
        }
    }
}

impl std::error::Error for MockMcpError {}

pub fn assert_tool_called(
    server: &MockMcpServer,
    tool_name: &str,
    expected_count: Option<usize>,
) -> Vec<RecordedCall> {
    let calls = server.calls_for(tool_name);
    assert!(
        !calls.is_empty(),
        "expected tool '{tool_name}' to be called but no invocations were recorded"
    );

    if let Some(expected) = expected_count {
        assert_eq!(
            calls.len(),
            expected,
            "expected tool '{tool_name}' to be called {expected} time(s) but observed {}",
            calls.len()
        );
    }

    calls
}

pub fn text_result(text: impl Into<String>) -> CallToolResult {
    CallToolResult {
        content: vec![ContentBlock::TextContent(TextContent {
            annotations: None,
            text: text.into(),
            r#type: "text".to_owned(),
        })],
        is_error: None,
        structured_content: None,
    }
}

pub fn structured_result(data: Value) -> CallToolResult {
    CallToolResult {
        content: Vec::new(),
        is_error: None,
        structured_content: Some(data),
    }
}

pub fn assert_text_content(result: &CallToolResult, expected: &str) {
    let text = result
        .content
        .iter()
        .find_map(|block| match block {
            ContentBlock::TextContent(content) => Some(content.text.as_str()),
            _ => None,
        })
        .unwrap_or_default();

    assert!(
        text.contains(expected),
        "expected tool response text to include '{expected}' but found '{text}'"
    );
}
